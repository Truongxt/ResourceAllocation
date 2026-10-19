import api from './api';

const resourceService = {
  getAll(params = {}) {
    return api.get('/resources', { params });
  },

  getSummary() {
    return api.get('/resources/stats/summary');
  },

  getById(id) {
    return api.get(`/resources/${id}`);
  },

  create(data) {
    return api.post('/resources', data);
  },

  update(id, data) {
    return api.put(`/resources/${id}`, data);
  },

  updateSkills(id, skills) {
    return api.put(`/resources/${id}/skills`, { skills });
  },

  remove(id) {
    return api.delete(`/resources/${id}`);
  },

  recalculateWorkload() {
    return api.post('/resources/recalculate-workload');
  },

  getMyLeaves() {
    return api.get('/resources/me/leaves');
  },

  addMyLeave(data) {
    return api.post('/resources/me/leaves', data);
  },

  selfEvaluate(skills, evaluationVersion) {
    return api.put('/resources/my-evaluation', { skills, evaluationVersion });
  },

  getMyEvaluation() {
    return api.get('/resources/me/evaluation');
  },

  getPendingEvaluations(params = {}) { return api.get('/resources/evaluations/pending', { params }); },
  getManagerEvaluation(id) { return api.get(`/resources/${id}/evaluation`); },
  managerEvaluate(id, data) {
    return api.put(`/resources/${id}/manager-evaluation`, data);
  },

  getProductivitySummary(params = {}) {
    return api.get('/resources/productivity/summary', { params });
  },

  deleteMyLeave(leaveId) {
    return api.delete(`/resources/me/leaves/${leaveId}`);
  },
};

export default resourceService;
