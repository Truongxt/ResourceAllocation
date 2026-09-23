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
  hasAppAccess as appAccess,
  canAccessResources as resourceAccess,
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
          const userData = res.data.data?.user || res.data.data;
          setUser(userData);
        } else {
          await clearTokens();
          setUser(null);
        }
      }
    } catch (e) {
      console.log('Session check failed or expired:', e?.message);
      await AsyncStorage.removeItem('rao_access_token');
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
    try {
      const res = await authApi.login(email, password);
      const token = res.data?.data?.token || res.data?.token || res.data?.data?.accessToken;
      const userData = res.data?.data?.user || res.data?.user;

      if (res.data?.success && token) {
        await AsyncStorage.setItem('rao_access_token', token);
        setUser(userData);
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Email hoặc mật khẩu không đúng' };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Không thể kết nối tới server';
      return { success: false, message: msg };
    }
  };

  const register = async (userData) => {
    try {
      const res = await authApi.register(userData);
      const token = res.data?.data?.token || res.data?.token || res.data?.data?.accessToken;
      const newUser = res.data?.data?.user || res.data?.user;

      if (res.data?.success && token) {
        await AsyncStorage.setItem('rao_access_token', token);
        setUser(newUser);
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Đăng ký thất bại' };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Không thể kết nối tới server';
      return { success: false, message: msg };
    }
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
    try {
      const res = await authApi.updateProfile(data);
      if (res.data?.success) {
        const updatedUser = res.data.data?.user || res.data.data;
        setUser(updatedUser);
        return { success: true, message: res.data?.message || 'Cập nhật thành công' };
      }
      return { success: false, message: res.data?.message || 'Cập nhật thất bại' };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Cập nhật thất bại' };
    }
  };

  const changePassword = async (data) => {
    try {
      const res = await authApi.changePassword(data);
      if (res.data?.success) {
        return { success: true, message: res.data?.message || 'Đổi mật khẩu thành công' };
      }
      return { success: false, message: res.data?.message || 'Đổi mật khẩu thất bại' };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Đổi mật khẩu thất bại' };
    }
  };

  // Quy tắc nằm trong `utils/appPermissions` để kiểm thử được; ở đây chỉ gắn
  // người dùng hiện tại vào. Đây là lớp giao diện — server vẫn tự chặn — nó tồn
  // tại để người dùng không thấy nút rồi bấm vào mới biết mình không có quyền.
  const appPermissionRank = useCallback((moduleKey) => rankOf(user, moduleKey), [user]);
  const canViewModule = useCallback((moduleKey) => canView(user, moduleKey), [user]);
  const canManageModule = useCallback((moduleKey) => canManage(user, moduleKey), [user]);
  const hasAppAccess = useCallback((appKey) => appAccess(user, appKey), [user]);
  const canAccessResources = useCallback(() => resourceAccess(user), [user]);

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
        hasAppAccess,
        canAccessResources,
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
