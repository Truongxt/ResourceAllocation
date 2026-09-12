import api from './api';

const recurringTaskService = {
  getAll(params = {}) {
    return api.get('/recurring-tasks', { params });
  },
  create(data) {
    return api.post('/recurring-tasks', data);
  },
  update(id, data) {
    return api.put(`/recurring-tasks/${id}`, data);
  },
  remove(id) {
    return api.delete(`/recurring-tasks/${id}`);
  },
  preview(data) {
    return api.post('/recurring-tasks/preview', data);
  },
  runNow(id) {
    return api.post(`/recurring-tasks/${id}/run-now`);
  },
};

export default recurringTaskService;
