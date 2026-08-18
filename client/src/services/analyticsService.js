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

  getOptimizationComparison(id) {
    return api.get(`/analytics/optimization-comparison/${id}`);
  },
};

export default analyticsService;
