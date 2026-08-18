import api from './api';

const activityLogService = {
  getAll(params = {}) {
    return api.get('/activity-logs', { params });
  },

  getStats() {
    return api.get('/activity-logs/stats');
  },

  clear() {
    return api.delete('/activity-logs');
  },
};

export default activityLogService;
