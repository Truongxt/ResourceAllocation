import api from './api';

const authService = {
  /**
   * Đăng ký tài khoản mới
   */
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  /**
   * Đăng nhập
   */
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Lấy thông tin user hiện tại
   */
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Cập nhật profile
   */
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },

  /**
   * Đổi mật khẩu
   */
  changePassword: async (passwordData) => {
    const response = await api.put('/auth/password', passwordData);
    return response.data;
  },

  /**
   * Lấy danh sách users (Admin)
   */
  getUsers: async () => {
    const response = await api.get('/auth/users');
    return response.data;
  },
};

export default authService;
