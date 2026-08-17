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
};

export default resourceService;
