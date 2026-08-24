import apiClient from './client';

export const activityLogApi = {
  getAll: (params) => apiClient.get('/activity-logs', { params }),
  getStats: () => apiClient.get('/activity-logs/stats'),
};

export default activityLogApi;
