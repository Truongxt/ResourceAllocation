import api from './api';

const analyticsService = {
  getDashboard() {
    return api.get('/analytics/dashboard');
  },

  getUtilization() {
    return api.get('/analytics/utilization');
  },

  getTaskAnalytics() {
    return api.get('/analytics/tasks');
  },

  // params: { from, to, granularity: 'day'|'week', projectId }
  getWorkloadTrend(params = {}) {
    return api.get('/analytics/workload-trend', { params });
  },

  getOptimizationComparison(id) {
    return api.get(`/analytics/optimization-comparison/${id}`);
  },
};

export default analyticsService;
