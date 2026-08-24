import apiClient from './client';

export const projectApi = {
  getAll: (params) => apiClient.get('/projects', { params }),
  getById: (id) => apiClient.get(`/projects/${id}`),
  create: (data) => apiClient.post('/projects', data),
  update: (id, data) => apiClient.put(`/projects/${id}`, data),
  delete: (id) => apiClient.delete(`/projects/${id}`),
  getMembers: (id) => apiClient.get(`/projects/${id}/members`),
  addMember: (id, data) => apiClient.post(`/projects/${id}/members`, data),
  removeMember: (id, memberId) => apiClient.delete(`/projects/${id}/members/${memberId}`),
};

export default projectApi;
