/**
 * Ràng buộc chuyển trạng thái công việc (state machine).
 *
 * Trước đây `PATCH /tasks/:id/status` ghi thẳng giá trị nhận được: bất kỳ trạng thái
 * nào cũng nhảy sang bất kỳ trạng thái nào. Với 5 trạng thái cũ điều đó vô hại, nhưng
 * "Thất bại" là trạng thái đóng và có hệ quả trong báo cáo, nên cần một chỗ duy nhất
 * phán xét mọi bước chuyển — thay vì rải điều kiện khắp controller.
 *
 * Hàm ở đây thuần: không chạm DB, không đọc req, nên kiểm thử được trực tiếp và
 * dùng lại được cho luồng đánh giá (review) về sau.
 */

const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked', 'failed'];

/** Trạng thái đóng: việc đã ngã ngũ, không còn nằm trong hàng đợi của ai. */
const CLOSED_STATUSES = ['done', 'failed'];

/**
 * @param {Object} args
 * @param {string} args.currentStatus  trạng thái đang lưu trong DB
 * @param {string} args.nextStatus     trạng thái muốn chuyển sang
 * @param {Object} [args.project]      dự án chứa công việc (cần `failureConfig`)
 * @param {string} [args.failureReason] lý do thất bại người dùng nhập
 * @param {boolean} [args.isReviewer] người gọi có quyền duyệt kết quả công việc này
 * @returns {{ valid: boolean, message?: string }}
 */
function validateStatusTransition({ currentStatus, nextStatus, project, failureReason, isReviewer } = {}) {
  if (!TASK_STATUSES.includes(nextStatus)) {
    return { valid: false, message: 'Trạng thái công việc không hợp lệ' };
  }

  if (nextStatus === 'failed') {
    const config = project?.failureConfig || {};

    if (!config.enabled) {
      return {
        valid: false,
        message: 'Dự án chưa bật tính năng đánh dấu thất bại',
      };
    }

    // Việc đang chờ đánh giá thì người đánh giá mới là người quyết định kết quả.
    // Cho phép nhảy thẳng sang Thất bại ở đây là mở một đường vòng qua lưng họ.
    if (currentStatus === 'review') {
      return {
        valid: false,
        message: 'Không thể đánh dấu Thất bại khi đang Chờ đánh giá — hãy chuyển về Đang làm trước',
      };
    }

    if (!failureReason || !String(failureReason).trim()) {
      return { valid: false, message: 'Cần nhập lý do thất bại' };
    }
  }

  if (nextStatus === 'done' && project?.reviewConfig?.enabled && !isReviewer) {
    // Dự án đã bật đánh giá thì "xong" là kết luận của người đánh giá, không phải
    // của người làm. Người thực hiện báo xong bằng PATCH /tasks/:id/complete, việc
    // chuyển sang 'done' chỉ đi qua POST /tasks/:id/review.
    return {
      valid: false,
      message: 'Dự án bật đánh giá kết quả: hãy báo hoàn thành để chuyển sang Chờ đánh giá, việc duyệt thuộc về người đánh giá',
    };
  }

  return { valid: true };
}

/**
 * Các trường phải ghi kèm một bước chuyển trạng thái đã qua `validateStatusTransition`.
 *
 * Dùng chung cho `PATCH /:id/status` và `PUT /:id` (form sửa công việc). Trước đây mỗi
 * đường tự ghi, và `PUT` không ghi gì: Thất bại qua form không để lại vết, còn "Hoàn
 * thành" ở cả hai đường đều không có `completedAt` — báo cáo kết quả mất mốc để tính
 * đúng/trễ hạn.
 */
function statusChangeFields({ task, nextStatus, failureReason, userId, now = new Date() }) {
  const fields = { status: nextStatus };

  if (nextStatus === 'done') {
    fields.progress = 100;
    // Mốc là lúc người làm xong. Đi từ Chờ đánh giá sang thì mốc đã ghi lúc nộp: giữ
    // nguyên, để người đánh giá duyệt chậm không biến việc đúng hạn thành trễ.
    const submitted = task.status === 'review' && task.completedAt;
    if (task.status !== 'done' && !submitted) fields.completedAt = now;
  }
  if (nextStatus === 'todo') fields.progress = 0;

  if (nextStatus === 'failed') {
    fields.failureReason = String(failureReason).trim();
    fields.failedAt = now;
    fields.failedBy = userId;
  } else if (task.status === 'failed') {
    // Mở lại việc đã đóng: xóa vết thất bại cũ, nếu không báo cáo sẽ đọc được một
    // công việc 'đang làm' mà vẫn kèm lý do thất bại từ lần trước.
    fields.failureReason = '';
    fields.failedAt = null;
    fields.failedBy = null;
  }

  return fields;
}

/**
 * Danh sách người đánh giá áp dụng cho một công việc.
 * Cấp công việc đè cấu hình dự án; không khai ở đâu cả thì rỗng, và lúc đó chỉ
 * Admin/quản lý dự án duyệt được.
 */
function resolveReviewers(task, project) {
  const taskLevel = (task?.reviewers || []).map((r) => String(r?._id || r));
  if (taskLevel.length) return taskLevel;
  return (project?.reviewConfig?.reviewers || []).map((r) => String(r?._id || r));
}

/**
 * Việc chờ đánh giá đã quá hạn SLA chưa.
 * Chưa có mốc `reviewRequestedAt` thì trả false — không có mốc thì không có hạn,
 * đoán bừa một cái sẽ sinh ra cảnh báo giả.
 */
function isReviewOverdue(task, project, now = new Date()) {
  if (task?.status !== 'review' || !task?.reviewRequestedAt) return false;
  const slaHours = project?.reviewConfig?.slaHours || 24;
  const deadline = new Date(task.reviewRequestedAt).getTime() + slaHours * 3600 * 1000;
  return now.getTime() > deadline;
}

module.exports = {
  TASK_STATUSES,
  CLOSED_STATUSES,
  validateStatusTransition,
  statusChangeFields,
  resolveReviewers,
  isReviewOverdue,
};
