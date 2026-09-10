import api from './api';

const taskService = {
  getAll(params = {}) {
    return api.get('/tasks', { params });
  },
  getCalendarTasks(params) {
    return api.get("/tasks", { params });
  },
  getSummary(params = {}) {
    return api.get('/tasks/stats/summary', { params });
  },

  getById(id) {
    return api.get(`/tasks/${id}`);
  },

  create(data) {
    return api.post('/tasks', data);
  },

  update(id, data) {
    return api.put(`/tasks/${id}`, data);
  },

  updateStatus(id, status) {
    return api.patch(`/tasks/${id}/status`, { status });
  },

  remove(id) {
    return api.delete(`/tasks/${id}`);
  },
};

export default taskService;
