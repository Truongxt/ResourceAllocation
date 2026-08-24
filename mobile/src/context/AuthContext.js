import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authApi from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('rao_access_token');
      if (token) {
        const res = await authApi.getMe();
        if (res.data?.success) {
          setUser(res.data.data);
        } else {
          await AsyncStorage.removeItem('rao_access_token');
          setUser(null);
        }
      }
    } catch (e) {
      console.log('Session check failed or expired');
      await AsyncStorage.removeItem('rao_access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    if (res.data?.success && res.data.data?.accessToken) {
      await AsyncStorage.setItem('rao_access_token', res.data.data.accessToken);
      setUser(res.data.data.user);
      return { success: true };
    }
    return { success: false, message: res.data?.message || 'Đăng nhập thất bại' };
  };

  const register = async (userData) => {
    const res = await authApi.register(userData);
    if (res.data?.success && res.data.data?.accessToken) {
      await AsyncStorage.setItem('rao_access_token', res.data.data.accessToken);
      setUser(res.data.data.user);
      return { success: true };
    }
    return { success: false, message: res.data?.message || 'Đăng ký thất bại' };
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    } finally {
      await AsyncStorage.removeItem('rao_access_token');
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
      return { success: true, message: 'Đổi mật khẩu thành công' };
    }
    return { success: false, message: res.data?.message || 'Đổi mật khẩu thất bại' };
  };

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
