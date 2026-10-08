import apiClient from './client';

// Server trả tối đa 100 việc mỗi trang (mặc định 50) và cắt `limit` lớn hơn về 100, nên
// màn nào cần đủ việc (danh sách, lịch, Gantt) phải tự đi hết các trang.
const TASK_PAGE_SIZE = 100;

/** Trần số trang cho màn hình — đủ cho 1000 việc mà không kéo cả kho mỗi lần mở. */
export const SCREEN_MAX_PAGES = 10;

export const taskApi = {
  getAll: (params) => apiClient.get('/tasks', { params }),
  /**
   * Mọi trang của `GET /tasks`: trang đầu để biết tổng, các trang sau gọi song song.
   * Trả `{ tasks, total }` — `total` có thể lớn hơn `tasks.length` khi chạm `maxPages`.
   */
  getAllPages: async (params = {}, maxPages = SCREEN_MAX_PAGES) => {
    const page = (n) => apiClient.get('/tasks', { params: { ...params, limit: TASK_PAGE_SIZE, page: n } });
    const first = await page(1);
    const pages = Math.min(first.data.pagination?.pages || 1, maxPages);
    const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => page(i + 2)));
    const tasks = [first, ...rest].flatMap((res) => res.data.data?.tasks || []);
    return { tasks, total: first.data.total ?? tasks.length };
  },
  getById: (id) => apiClient.get(`/tasks/${id}`),
  create: (data) => apiClient.post('/tasks', data),
  update: (id, data) => apiClient.put(`/tasks/${id}`, data),
  updateStatus: (id, status, extra = {}) =>
    apiClient.patch(`/tasks/${id}/status`, { status, ...extra }),
  delete: (id) => apiClient.delete(`/tasks/${id}`),

  // Checklist
  addChecklist: (id, title) => apiClient.post(`/tasks/${id}/checklist`, { title }),
  toggleChecklist: (id, itemId) =>
    apiClient.put(`/tasks/${id}/checklist/${itemId}/toggle`),
  deleteChecklist: (id, itemId) =>
    apiClient.delete(`/tasks/${id}/checklist/${itemId}`),

  // Comments
  addComment: (id, content) => apiClient.post(`/tasks/${id}/comments`, { content }),
  deleteComment: (id, commentId) =>
    apiClient.delete(`/tasks/${id}/comments/${commentId}`),

  // Workflow actions
  reportResult: (id, data) => apiClient.post(`/tasks/${id}/report-result`, data),
  review: (id, decision, comment) =>
    apiClient.post(`/tasks/${id}/review`, { decision, comment }),
  updateDeadline: (id, data) => apiClient.patch(`/tasks/${id}/deadline`, data),
  duplicate: (id) => apiClient.post(`/tasks/${id}/duplicate`),
  getSubtasks: (id) => apiClient.get(`/tasks/${id}/subtasks`),
};

export default taskApi;
