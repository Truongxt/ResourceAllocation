import api from './api';

const projectService = {
  getAll(params = {}) {
    return api.get('/projects', { params });
  },

  getSummary() {
    return api.get('/projects/stats/summary');
  },

  getById(id) {
    return api.get(`/projects/${id}`);
  },

  create(data) {
    return api.post('/projects', data);
  },

  update(id, data) {
    return api.put(`/projects/${id}`, data);
  },

  remove(id, force = false) {
    return api.delete(`/projects/${id}`, {
      params: force ? { force: 'true' } : {},
    });
  },

  addMember(id, data) {
    return api.post(`/projects/${id}/members`, data);
  },

  updateMember(id, userId, data) {
    return api.put(`/projects/${id}/members/${userId}`, data);
  },

  removeMember(id, userId) {
    return api.delete(`/projects/${id}/members/${userId}`);
  },

  // Base Wework: Cập nhật cấu hình phân quyền thao tác trong dự án
  updatePermissions(id, permissions) {
    return api.patch(`/projects/${id}/permissions`, { permissions });
  },

  // Cấu hình đánh dấu Thất bại và luồng Đánh giá dùng chung endpoint trên:
  // cùng một người quyết, cùng một màn hình cài đặt dự án.
  updateWorkflowConfig(id, config) {
    return api.patch(`/projects/${id}/permissions`, config);
  },

  // Base Wework: Chỉnh sửa nhanh (Quick Edit) dự án / phòng ban
  quickUpdate(id, data) {
    return api.patch(`/projects/${id}/quick-edit`, data);
  },
};

export default projectService;