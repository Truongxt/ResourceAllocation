import api from './api';

const taskGroupService = {
  getByProject: (projectId) => api.get(`/task-groups/${projectId}`),
  create: (data) => api.post('/task-groups', data),
  update: (id, data) => api.put(`/task-groups/${id}`, data),
  delete: (id) => api.delete(`/task-groups/${id}`),
  reorder: (orderedIds) => api.put('/task-groups/reorder', { orderedIds }),
};

export default taskGroupService;
