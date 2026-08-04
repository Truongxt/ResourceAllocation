import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verify token and load user on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('rao_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await authService.getMe();
        setUser(response.data.user);
      } catch {
        // Token invalid or expired
        localStorage.removeItem('rao_token');
        localStorage.removeItem('rao_user');
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
      localStorage.setItem('rao_token', token);
      localStorage.setItem('rao_user', JSON.stringify(newUser));
      setUser(newUser);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Đăng ký thất bại';
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
      localStorage.setItem('rao_token', token);
      localStorage.setItem('rao_user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Đăng nhập thất bại';
      setError(message);
      return { success: false, message };
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem('rao_token');
    localStorage.removeItem('rao_user');
    setUser(null);
    setError(null);
  }, []);

  // Update profile
  const updateProfile = useCallback(async (profileData) => {
    setError(null);
    try {
      const response = await authService.updateProfile(profileData);
      const updatedUser = response.data.user;
      localStorage.setItem('rao_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true, message: response.message };
    } catch (err) {
      const message = err.response?.data?.message || 'Cập nhật thất bại';
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
        localStorage.setItem('rao_token', response.data.token);
      }
      return { success: true, message: response.message };
    } catch (err) {
      const message = err.response?.data?.message || 'Đổi mật khẩu thất bại';
      setError(message);
      return { success: false, message };
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    clearError,
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
