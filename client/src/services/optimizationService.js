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

  // So sánh song song 2-4 phương án. Server ghép phân công theo từng công việc và
  // tự chấm chỉ số nào thắng, nên client chỉ việc vẽ.
  compare(ids = []) {
    return api.get('/optimization/compare', { params: { ids: ids.join(',') } });
  },

  applyResult(id) {
    return api.post(`/optimization/${id}/apply`);
  },
};

export default optimizationService;
