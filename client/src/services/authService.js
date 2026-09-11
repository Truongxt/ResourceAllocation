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
   * Lấy danh sách nhân sự/quản lý trong cùng công ty
   */
  getCompanyManagers: async () => {
    const response = await api.get('/auth/company-managers');
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
   * Đổi cookie refresh lấy access token mới.
   * Dùng lúc khởi động để khôi phục phiên, vì access token chỉ nằm trong bộ nhớ.
   */
  refresh: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  /**
   * Đăng xuất thiết bị hiện tại — thu hồi refresh token ở server.
   * Chỉ xóa token phía client là chưa đủ: cookie refresh vẫn sống và vẫn đổi
   * được access token mới.
   */
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  /** Đăng xuất khỏi mọi thiết bị */
  logoutAll: async () => {
    const response = await api.post('/auth/logout-all');
    return response.data;
  },

  /**
   * Lấy danh sách users (Admin)
   */
  getUsers: async (params = {}) => {
    const response = await api.get('/auth/users', { params });
    return response.data;
  },

  /**
   * Admin tạo tài khoản mới
   */
  createUser: async (userData) => {
    const response = await api.post('/auth/users', userData);
    return response.data;
  },

  /**
   * Admin cập nhật vai trò tài khoản
   */
  updateUserRole: async (id, role) => {
    const response = await api.put(`/auth/users/${id}/role`, { role });
    return response.data;
  },

  /**
   * Admin khóa / mở khóa tài khoản
   */
  updateUserStatus: async (id, isActive) => {
    const response = await api.put(`/auth/users/${id}/status`, { isActive });
    return response.data;
  },

  /**
   * Admin đặt lại mật khẩu cho thành viên
   */
  adminResetPassword: async (id, newPassword) => {
    const response = await api.put(`/auth/users/${id}/reset-password`, { newPassword });
    return response.data;
  },

  /**
   * Admin cập nhật người quản lý trực tiếp
   */
  updateUserManager: async (id, managerId) => {
    const response = await api.put(`/auth/users/${id}/manager`, { managerId });
    return response.data;
  },

  /**
   * Admin cập nhật quyền phân hệ ứng dụng
   */
  updateAppPermissions: async (id, appPermissions) => {
    const response = await api.put(`/auth/users/${id}/app-permissions`, { appPermissions });
    return response.data;
  },

  /**
   * Lấy danh sách các phiên đăng nhập đang hoạt động
   */
  getSessions: async () => {
    const response = await api.get('/auth/sessions');
    return response.data;
  },

  /**
   * Thu hồi / đăng xuất khỏi một phiên cụ thể
   */
  revokeSession: async (sessionId) => {
    const response = await api.delete(`/auth/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Lấy bảng ma trận phân quyền thao tác chi tiết Base Account (41 thao tác chuẩn Base.vn)
   */
  getPermissionsMatrix: async () => {
    const response = await api.get('/auth/permissions/matrix');
    return response.data;
  },

  /**
   * Cập nhật danh sách ứng dụng làm App Admin
   */
  updateUserAppAdmin: async (id, appAdmins) => {
    const response = await api.put(`/auth/users/${id}/app-admin`, { appAdmins });
    return response.data;
  },

  /**
   * Cập nhật quyền đặc biệt (Chìa khóa 🔑)
   */
  updateUserSpecialGrants: async (id, specialGrants) => {
    const response = await api.put(`/auth/users/${id}/special-grants`, { specialGrants });
    return response.data;
  },

  /**
   * Tạo tài khoản khách (Guest Account)
   */
  createGuest: async (guestData) => {
    const response = await api.post('/auth/guests', guestData);
    return response.data;
  },

  /**
   * Lấy danh sách tài khoản khách
   */
  getGuests: async () => {
    const response = await api.get('/auth/guests');
    return response.data;
  },

  /**
   * Phân quyền Quản trị cấp cao (Owner) (help.base.vn/articles/63000253291)
   */
  updateUserOwnerStatus: async (id, isOwner) => {
    const response = await api.put(`/auth/users/${id}/owner`, { isOwner });
    return response.data;
  },

  /**
   * Owner thay đổi email tài khoản
   */
  updateUserEmail: async (id, email) => {
    const response = await api.put(`/auth/users/${id}/email`, { email });
    return response.data;
  },

  /**
   * Vô hiệu hóa bảo mật 2 lớp cho tài khoản
   */
  disableUser2FA: async (id) => {
    const response = await api.put(`/auth/users/${id}/disable-2fa`);
    return response.data;
  },

  /**
   * Chỉnh sửa thông tin cơ bản của thành viên (Admin / Owner - help.base.vn)
   */
  adminUpdateUserProfile: async (id, profileData) => {
    const response = await api.put(`/auth/users/${id}/profile`, profileData);
    return response.data;
  },
};

export default authService;
