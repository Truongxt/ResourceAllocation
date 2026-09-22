import apiClient from './client';

export const authApi = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  register: (userData) => apiClient.post('/auth/register', userData),
  getMe: () => apiClient.get('/auth/me'),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  // Route thật là PUT /auth/password. Trước đây gọi /auth/change-password nên
  // nút đổi mật khẩu luôn trả 404.
  changePassword: (data) => apiClient.put('/auth/password', data),
  logout: (refreshToken) => apiClient.post('/auth/logout', { refreshToken }),
};

export default authApi;
