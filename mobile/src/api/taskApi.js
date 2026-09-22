import apiClient from './client';

export const taskApi = {
  getAll: (params) => apiClient.get('/tasks', { params }),
  getById: (id) => apiClient.get(`/tasks/${id}`),
  create: (data) => apiClient.post('/tasks', data),
  update: (id, data) => apiClient.put(`/tasks/${id}`, data),
  updateStatus: (id, status) => apiClient.patch(`/tasks/${id}/status`, { status }),
  delete: (id) => apiClient.delete(`/tasks/${id}`),

  // Bình luận
  addComment: (id, content) => apiClient.post(`/tasks/${id}/comments`, { content }),
  deleteComment: (id, commentId) => apiClient.delete(`/tasks/${id}/comments/${commentId}`),

  // Checklist
  addChecklistItem: (id, title) => apiClient.post(`/tasks/${id}/checklist`, { title }),
  toggleChecklistItem: (id, itemId) => apiClient.put(`/tasks/${id}/checklist/${itemId}/toggle`),
  removeChecklistItem: (id, itemId) => apiClient.delete(`/tasks/${id}/checklist/${itemId}`),
};

export default taskApi;
