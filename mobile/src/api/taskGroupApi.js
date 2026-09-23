import apiClient from './client';

export const taskGroupApi = {
  getByProject: (projectId) => apiClient.get(`/task-groups/${projectId}`),
  create: (data) => apiClient.post('/task-groups', data),
  update: (id, data) => apiClient.put(`/task-groups/${id}`, data),
  delete: (id) => apiClient.delete(`/task-groups/${id}`),
};

export default taskGroupApi;
