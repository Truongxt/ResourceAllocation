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
  resolveReviewers,
  isReviewOverdue,
};
