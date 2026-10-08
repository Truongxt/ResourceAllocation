import api from './api';

// Server trả tối đa 100 việc mỗi trang (mặc định 50) và cắt `limit` lớn hơn về 100, nên
// màn nào cần đủ việc (Kanban, Gantt, lịch, tìm kiếm) phải tự đi hết các trang.
const TASK_PAGE_SIZE = 100;

/** Trần số trang cho màn hình — đủ cho 1000 việc mà không kéo cả kho mỗi lần mở. */
export const SCREEN_MAX_PAGES = 10;

const taskService = {
  getAll(params = {}) {
    return api.get('/tasks', { params });
  },

  /**
   * Mọi trang của `GET /tasks`: trang đầu để biết tổng, các trang sau gọi song song.
   * Trả `{ tasks, total }` — `total` là số việc khớp bộ lọc theo server, có thể lớn hơn
   * `tasks.length` khi chạm `maxPages`. Xuất CSV gọi không trần.
   */
  async getAllPages(params = {}, maxPages = Infinity) {
    const page = (n) => api.get('/tasks', { params: { ...params, limit: TASK_PAGE_SIZE, page: n } });
    const first = await page(1);
    const pages = Math.min(first.data.pagination?.pages || 1, maxPages);
    const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => page(i + 2)));
    const tasks = [first, ...rest].flatMap((res) => res.data.data?.tasks || []);
    return { tasks, total: first.data.total ?? tasks.length };
  },
  getSummary(params = {}) {
    return api.get('/tasks/stats/summary', { params });
  },

  getById(id) {
    return api.get(`/tasks/${id}`);
  },

  create(data) {
    return api.post('/tasks', data);
  },

  update(id, data) {
    return api.put(`/tasks/${id}`, data);
  },

  // `extra` mang theo failureReason khi chuyển sang Thất bại — server bắt buộc có.
  updateStatus(id, status, extra = {}) {
    return api.patch(`/tasks/${id}/status`, { status, ...extra });
  },

  remove(id) {
    return api.delete(`/tasks/${id}`);
  },

  // === Wework: Comments ===
  addComment(taskId, content) {
    return api.post(`/tasks/${taskId}/comments`, { content });
  },
  deleteComment(taskId, commentId) {
    return api.delete(`/tasks/${taskId}/comments/${commentId}`);
  },

  // === Wework: Checklist ===
  addChecklistItem(taskId, title, assignee) {
    return api.post(`/tasks/${taskId}/checklist`, { title, assignee });
  },
  toggleChecklistItem(taskId, itemId) {
    return api.put(`/tasks/${taskId}/checklist/${itemId}/toggle`);
  },
  removeChecklistItem(taskId, itemId) {
    return api.delete(`/tasks/${taskId}/checklist/${itemId}`);
  },

  // === Wework: Followers ===
  addFollower(taskId, userId) {
    return api.post(`/tasks/${taskId}/followers`, { userId });
  },
  addFollowers(taskId, userIds) {
    return api.post(`/tasks/${taskId}/followers`, { userIds });
  },
  removeFollower(taskId, userId) {
    return api.delete(`/tasks/${taskId}/followers/${userId}`);
  },

  // === Wework: Subtasks ===
  getSubtasks(taskId) {
    return api.get(`/tasks/${taskId}/subtasks`);
  },
  createSubtask(taskId, data) {
    return api.post(`/tasks/${taskId}/subtasks`, data);
  },

  // === Base Wework: Báo cáo kết quả & Thao tác nâng cao ===
  reportResult(taskId, data) {
    return api.post(`/tasks/${taskId}/report-result`, data);
  },
  duplicate(taskId, data = {}) {
    return api.post(`/tasks/${taskId}/duplicate`, data);
  },
  move(taskId, data) {
    return api.post(`/tasks/${taskId}/move`, data);
  },
  updateDeadline(taskId, data) {
    return api.patch(`/tasks/${taskId}/deadline`, data);
  },

  // === Base Wework: Luồng đánh giá kết quả ===
  complete(taskId) {
    return api.patch(`/tasks/${taskId}/complete`);
  },
  review(taskId, decision, comment) {
    return api.post(`/tasks/${taskId}/review`, { decision, comment });
  },
  getPendingReviews() {
    return api.get('/tasks/pending-review');
  },

  // === Base Wework: Bàn giao công việc hàng loạt ===
  reassignPreview(params) {
    return api.get('/tasks/reassign-preview', { params });
  },
  bulkReassign(data) {
    return api.post('/tasks/bulk-reassign', data);
  },

  // === Base Wework: Reminders (Nhắc việc) ===
  getReminders(params = {}) {
    return api.get('/tasks/reminders', { params });
  },

  // === Base Wework: Excel Import/Export ===
  downloadExcelTemplate() {
    return api.get('/tasks/excel/template', { responseType: 'blob' });
  },
  previewExcel(formData) {
    return api.post('/tasks/excel/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importExcel(formData) {
    return api.post('/tasks/excel/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default taskService;

