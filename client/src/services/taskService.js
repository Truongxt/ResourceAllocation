import api from './api';

const taskService = {
  getAll(params = {}) {
    return api.get('/tasks', { params });
  },
  getCalendarTasks(params) {
    return api.get("/tasks", { params });
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

  updateStatus(id, status) {
    return api.patch(`/tasks/${id}/status`, { status });
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

