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
 * @returns {{ valid: boolean, message?: string }}
 */
function validateStatusTransition({ currentStatus, nextStatus, project, failureReason } = {}) {
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

  return { valid: true };
}

module.exports = {
  TASK_STATUSES,
  CLOSED_STATUSES,
  validateStatusTransition,
};
