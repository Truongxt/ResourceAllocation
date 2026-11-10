/**
 * Controller công việc — điểm vào duy nhất của `routes/task.routes.js`.
 *
 * Handler nằm trong `./task/`, chia theo nhóm chức năng:
 *   core           danh sách, chi tiết, tạo, sửa, đổi trạng thái, xóa, thống kê
 *   collaboration  bình luận, checklist, người theo dõi, công việc con
 *   operations     báo cáo kết quả, nhân bản, di chuyển, đổi hạn, nhập Excel, nhắc việc
 *   review         luồng đánh giá kết quả
 *   reassign       bàn giao hàng loạt
 *   shared         helper dùng chung giữa các nhóm
 */

const core = require('./task/core');
const collaboration = require('./task/collaboration');
const operations = require('./task/operations');
const review = require('./task/review');
const reassign = require('./task/reassign');

module.exports = {
  getTasks: core.getTasks,
  getTaskById: core.getTaskById,
  createTask: core.createTask,
  updateTask: core.updateTask,
  updateTaskStatus: core.updateTaskStatus,
  deleteTask: core.deleteTask,
  getTaskSummary: core.getTaskSummary,
  addComment: collaboration.addComment,
  deleteComment: collaboration.deleteComment,
  addChecklistItem: collaboration.addChecklistItem,
  toggleChecklistItem: collaboration.toggleChecklistItem,
  removeChecklistItem: collaboration.removeChecklistItem,
  addFollower: collaboration.addFollower,
  removeFollower: collaboration.removeFollower,
  getSubtasks: collaboration.getSubtasks,
  createSubtask: collaboration.createSubtask,
  reportTaskResult: operations.reportTaskResult,
  duplicateTask: operations.duplicateTask,
  moveTask: operations.moveTask,
  updateDeadline: operations.updateDeadline,
  downloadExcelTemplate: operations.downloadExcelTemplate,
  previewExcelTasks: operations.previewExcelTasks,
  importExcelTasks: operations.importExcelTasks,
  getTaskReminders: operations.getTaskReminders,
  completeTask: review.completeTask,
  reviewTask: review.reviewTask,
  getPendingReviews: review.getPendingReviews,
  previewReassign: reassign.previewReassign,
  bulkReassign: reassign.bulkReassign,
};
