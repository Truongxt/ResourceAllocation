import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import { setToken, clearToken, getToken } from '../services/tokenStore';
// Dùng thẳng i18n thay vì hook: các câu dưới đây chỉ là phương án dự phòng khi
// server không trả về `message`, và chúng được dựng lúc gọi hàm chứ không phải
// lúc render, nên không có gì để hook theo dõi.
import i18n from '../i18n';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Khôi phục phiên khi tải trang.
  //
  // Access token nằm trong bộ nhớ nên tải lại trang là mất. Nguồn sự thật cho
  // "còn đăng nhập hay không" là cookie refresh (httpOnly) — hỏi thẳng server
  // bằng một lần làm mới. Không còn cờ nào trong localStorage để đọc, và cũng
  // không cần: không có cookie thì lời gọi này trả 401 và coi như chưa đăng nhập.
  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await authService.refresh();
        setToken(response.data.token);
        setUser(response.data.user);
      } catch {
        clearToken();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Register
  const register = useCallback(async (userData) => {
    setError(null);
    try {
      const response = await authService.register(userData);
      const { user: newUser, token } = response.data;
      setToken(token);
      setUser(newUser);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || i18n.t('auth.registerFailed');
      setError(message);
      return { success: false, message };
    }
  }, []);

  // Login
  const login = useCallback(async (credentials) => {
    setError(null);
    try {
      const response = await authService.login(credentials);
      const { user: loggedInUser, token } = response.data;
      setToken(token);
      setUser(loggedInUser);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || i18n.t('auth.loginFailed');
      setError(message);
      return { success: false, message };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    // Gọi server trước để thu hồi refresh token. Bỏ qua lỗi mạng: người dùng đã
    // bấm đăng xuất thì phía client phải đăng xuất cho bằng được, còn token phía
    // server sẽ tự hết hạn.
    try {
      await authService.logout();
    } catch {
      /* ignore */
    }
    clearToken();
    setUser(null);
    setError(null);
  }, []);

  // Update profile
  const updateProfile = useCallback(async (profileData) => {
    setError(null);
    try {
      const response = await authService.updateProfile(profileData);
      const updatedUser = response.data.user;
      setUser(updatedUser);
      return { success: true, message: response.message };
    } catch (err) {
      const message = err.response?.data?.message || i18n.t('settings.profileFailed');
      setError(message);
      return { success: false, message };
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (passwordData) => {
    setError(null);
    try {
      const response = await authService.changePassword(passwordData);
      // Update token after password change
      if (response.data?.token) {
        setToken(response.data.token);
      }
      return { success: true, message: response.message };
    } catch (err) {
      const message = err.response?.data?.message || i18n.t('settings.passwordFailed');
      setError(message);
      return { success: false, message };
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Kiểm tra quyền truy cập phân hệ / Quản trị ứng dụng (App Admin)
  const hasAppAccess = useCallback((appKey) => {
    if (!user) return false;
    if (user.isOwner) return true;
    if (user.role === 'admin') return true;
    return Array.isArray(user.appAdmins) && user.appAdmins.includes(appKey);
  }, [user]);

  /**
   * Quyền theo phân hệ nghiệp vụ (`User.appPermissions`).
   *
   * Phải khớp từng chi tiết với `requireAppPermission` ở server
   * (`server/src/middleware/auth.js`): cùng thang bậc none < view < manage,
   * cùng quy ước "chưa đặt giá trị thì coi như manage" (tài khoản tạo trước khi
   * có tính năng này không bị mất quyền), và Owner luôn đi qua.
   *
   * Lệch nhau một trong ba điều đó là giao diện và server nói hai chuyện khác
   * nhau: hoặc hiện nút bấm vào chỉ để nhận 403, hoặc giấu mất thứ người dùng
   * thật ra làm được.
   */
  const appPermissionRank = useCallback((moduleKey) => {
    if (!user) return 0;
    if (user.isOwner) return 2;
    const RANK = { none: 0, view: 1, manage: 2 };
    const level = user.appPermissions?.[moduleKey];
    return level === undefined ? 2 : (RANK[level] ?? 2);
  }, [user]);

  const canViewModule = useCallback((moduleKey) => appPermissionRank(moduleKey) >= 1, [appPermissionRank]);
  const canManageModule = useCallback((moduleKey) => appPermissionRank(moduleKey) >= 2, [appPermissionRank]);

  // Làm mới thông tin người dùng từ máy chủ (sau khi phân quyền hoặc cập nhật profile)
  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getMe();
      if (response.data?.user) {
        setUser(response.data.user);
      }
    } catch (err) {
      console.error('Lỗi khi làm mới thông tin tài khoản:', err);
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    // SocketContext cần token để xác thực kết nối. Trước đây nó đọc `token` từ
    // đây nhưng context chưa bao giờ trả field này, nên luôn rơi xuống nhánh dự
    // phòng đọc localStorage — mà localStorage nay không còn giữ token nữa.
    getToken,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    clearError,
    hasAppAccess,
    canViewModule,
    canManageModule,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
