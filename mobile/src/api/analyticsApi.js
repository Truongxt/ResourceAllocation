import apiClient from './client';

export const analyticsApi = {
  getDashboard: () => apiClient.get('/analytics/dashboard'),
  getUtilization: () => apiClient.get('/analytics/utilization'),
  getTaskAnalytics: () => apiClient.get('/analytics/tasks'),
  getWorkloadTrend: (params) => apiClient.get('/analytics/workload-trend', { params }),
};

export default analyticsApi;
