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
          const userData = res.data.data?.user || res.data.data;
          setUser(userData);
        } else {
          await AsyncStorage.removeItem('rao_access_token');
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
      await authApi.logout();
    } catch {
      /* ignore */
    } finally {
      await AsyncStorage.removeItem('rao_access_token');
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
