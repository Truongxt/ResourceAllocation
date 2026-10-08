import apiClient from './client';

export const optimizationApi = {
  // Mỗi thuật toán một route ('genetic' | 'csp' | 'hybrid'); không có `/optimization/run`.
  run: (algorithm, params) => apiClient.post(`/optimization/run/${algorithm}`, params),
  getHistory: (params) => apiClient.get('/optimization/history', { params }),
  getById: (id) => apiClient.get(`/optimization/${id}`),
  apply: (id) => apiClient.post(`/optimization/${id}/apply`),
  runBenchmark: (data) => apiClient.post('/optimization/benchmark', data),
};

export default optimizationApi;
