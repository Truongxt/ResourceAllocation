import apiClient from './client';

export const taskApi = {
  getAll: (params) => apiClient.get('/tasks', { params }),
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
