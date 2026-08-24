import apiClient from './client';

export const resourceApi = {
  getAll: (params) => apiClient.get('/resources', { params }),
  getById: (id) => apiClient.get(`/resources/${id}`),
  create: (data) => apiClient.post('/resources', data),
  update: (id, data) => apiClient.put(`/resources/${id}`, data),
  delete: (id) => apiClient.delete(`/resources/${id}`),
  updateSkills: (id, skills) => apiClient.put(`/resources/${id}/skills`, { skills }),
};

export default resourceApi;
