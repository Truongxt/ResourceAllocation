import apiClient from './client';

export const optimizationApi = {
  run: (data) => apiClient.post('/optimization/run', data),
  getHistory: (params) => apiClient.get('/optimization/history', { params }),
  getById: (id) => apiClient.get(`/optimization/${id}`),
  apply: (id) => apiClient.post(`/optimization/${id}/apply`),
};

export default optimizationApi;
