import api from './api';

const departmentService = {
  getAll(params = {}) {
    return api.get('/departments', { params });
  },

  getById(id) {
    return api.get(`/departments/${id}`);
  },

  create(data) {
    return api.post('/departments', data);
  },

  update(id, data) {
    return api.put(`/departments/${id}`, data);
  },

  remove(id) {
    return api.delete(`/departments/${id}`);
  },
};

export default departmentService;
