import api from './api';

const optimizationService = {
  /**
   * Kích hoạt chạy tối ưu hóa theo giải thuật được chọn ('genetic' | 'csp' | 'hybrid')
   */
  run(payload = {}) {
    const { algorithm = 'genetic', projectId, config = {} } = payload;
    const weights = config.weights || {};
    const flatParams = {
      projectId,
      populationSize: config.populationSize,
      maxGenerations: config.generations || config.maxGenerations,
      crossoverRate: config.crossoverRate,
      mutationRate: config.mutationRate,
      workloadWeight: weights.workloadBalance ?? config.workloadWeight,
      skillWeight: weights.skillMatch ?? config.skillWeight,
      costWeight: weights.cost ?? config.costWeight,
      overallocationWeight: weights.overallocation ?? config.overallocationWeight,
      ...config,
    };

    if (algorithm === 'csp') {
      return this.runCSP(flatParams);
    } else if (algorithm === 'hybrid') {
      return this.runHybrid(flatParams);
    }
    return this.runGenetic(flatParams);
  },

  apply(id) {
    return this.applyResult(id);
  },

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

  getReadiness(projectId = '') {
    return api.get('/optimization/readiness', { params: projectId ? { projectId } : {} });
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

  rollbackResult(id) {
    return api.post(`/optimization/${id}/rollback`);
  },

  runBenchmark(params = {}) {
    return api.post('/optimization/benchmark', params);
  },
};

export default optimizationService;
