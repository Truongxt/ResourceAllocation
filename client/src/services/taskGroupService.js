import api from './api';

const taskGroupService = {
  getByProject: (projectId) => api.get(`/task-groups/${projectId}`),
  create: (data) => api.post('/task-groups', data),
  update: (id, data) => api.put(`/task-groups/${id}`, data),
  toggleOpen: (id, isOpen) => api.patch(`/task-groups/${id}/toggle-open`, isOpen !== undefined ? { isOpen } : {}),
  delete: (id) => api.delete(`/task-groups/${id}`),
  reorder: (orderedIds) => api.put('/task-groups/reorder', { orderedIds }),
};

export default taskGroupService;
