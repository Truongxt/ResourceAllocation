import api from './api';

const optimizationService = {
  runGenetic(params = {}) {
    return api.post('/optimization/run/genetic', params);
  },

  runCSP(params = {}) {
    return api.post('/optimization/run/csp', params);
  },

  runHybrid(params = {}) {
    return api.post('/optimization/run/hybrid', params);
  },

  getHistory(params = {}) {
    return api.get('/optimization/history', { params });
  },

  getById(id) {
    return api.get(`/optimization/${id}`);
  },

  applyResult(id) {
    return api.post(`/optimization/${id}/apply`);
  },
};

export default optimizationService;
