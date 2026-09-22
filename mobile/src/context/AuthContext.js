import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authApi from '../api/authApi';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  saveTokens,
  clearTokens,
  setOnSessionExpired,
} from '../api/client';
import {
  appPermissionRank as rankOf,
  canViewModule as canView,
  canManageModule as canManage,
} from '../utils/appPermissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tầng HTTP tự làm mới access token; khi hết đường cứu thì nó gọi về đây để
    // đưa người dùng ra màn đăng nhập. Trước đây nhánh 401 bỏ trống, nên qua phút
    // thứ 15 mọi request hỏng mà app vẫn hiện "đã đăng nhập".
    setOnSessionExpired(() => setUser(null));
    checkAuth();
    return () => setOnSessionExpired(null);
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (token || refreshToken) {
        // Access token chỉ sống 15 phút nên mở lại app gần như chắc chắn là đã
        // hết hạn. Cứ gọi getMe: interceptor sẽ tự làm mới bằng refresh token,
        // phiên chỉ thật sự chết khi refresh token cũng hỏng.
        const res = await authApi.getMe();
        if (res.data?.success) {
          setUser(res.data.data);
        } else {
          await clearTokens();
          setUser(null);
        }
      }
    } catch (e) {
      console.log('Session check failed or expired');
      await clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /** Server trả `{ user, token, refreshToken }` — trước đây đọc nhầm `accessToken`. */
  const startSession = async (data) => {
    await saveTokens(data);
    setUser(data.user);
  };

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    if (res.data?.success && res.data.data?.token) {
      await startSession(res.data.data);
      return { success: true };
    }
    return { success: false, message: res.data?.message || 'Đăng nhập thất bại' };
  };

  const register = async (userData) => {
    const res = await authApi.register(userData);
    if (res.data?.success && res.data.data?.token) {
      await startSession(res.data.data);
      return { success: true };
    }
    return { success: false, message: res.data?.message || 'Đăng ký thất bại' };
  };

  const logout = async () => {
    try {
      // Phải gửi refresh token lên: xóa phía máy là chưa đủ, không thu hồi thì
      // token vẫn đổi được access token mới trong 7 ngày.
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      await authApi.logout(refreshToken);
    } catch {
      /* ignore */
    } finally {
      await clearTokens();
      setUser(null);
    }
  };

  const updateProfile = async (data) => {
    const res = await authApi.updateProfile(data);
    if (res.data?.success) {
      setUser(res.data.data);
      return { success: true, message: 'Cập nhật thành công' };
    }
    return { success: false, message: res.data?.message || 'Cập nhật thất bại' };
  };

  const changePassword = async (data) => {
    const res = await authApi.changePassword(data);
    if (res.data?.success) {
      // Đổi mật khẩu thu hồi mọi phiên cũ, kể cả phiên này; server cấp lại cặp
      // token mới cho đúng thiết bị vừa thao tác. Không lưu lại là tự đăng xuất
      // chính mình sau 15 phút.
      await saveTokens(res.data.data || {});
      return { success: true, message: 'Đổi mật khẩu thành công' };
    }
    return { success: false, message: res.data?.message || 'Đổi mật khẩu thất bại' };
  };

  // Quy tắc nằm trong `utils/appPermissions` để kiểm thử được; ở đây chỉ gắn
  // người dùng hiện tại vào. Đây là lớp giao diện — server vẫn tự chặn — nó tồn
  // tại để người dùng không thấy nút rồi bấm vào mới biết mình không có quyền.
  const appPermissionRank = useCallback((moduleKey) => rankOf(user, moduleKey), [user]);
  const canViewModule = useCallback((moduleKey) => canView(user, moduleKey), [user]);
  const canManageModule = useCallback((moduleKey) => canManage(user, moduleKey), [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        appPermissionRank,
        canViewModule,
        canManageModule,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
