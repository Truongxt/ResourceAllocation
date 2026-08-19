import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { ThemeProvider } from '../src/context/ThemeContext';

/**
 * Dựng cây provider giống `main.jsx`, trừ hai điểm:
 *   - `MemoryRouter` thay `BrowserRouter` để đặt được route ban đầu.
 *   - `ConfigProvider` chỉ truyền `locale`, bỏ phần theme: không assertion nào
 *     trong các bộ này phụ thuộc màu sắc, mà kéo cả theme vào thì mỗi lần render
 *     phải tính lại toàn bộ token của antd.
 *
 * AuthProvider và SocketProvider cố tình KHÔNG có ở đây — bộ test nào cần thì tự
 * mock `useAuth` / `useSocket`, vì thứ đang kiểm là component chứ không phải hai
 * context đó.
 */
export function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider>
        <ConfigProvider locale={viVN}>{ui}</ConfigProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

/** Trạng thái đăng nhập dùng cho `useAuth` đã mock. */
export function authState({ role = 'admin', loading = false, authenticated = true } = {}) {
  return {
    loading,
    isAuthenticated: authenticated,
    user: authenticated ? { _id: 'u1', name: 'Người Kiểm Thử', email: 'test@rao.com', role } : null,
    login: () => {},
    logout: () => {},
    register: () => {},
    updateProfile: () => {},
    changePassword: () => {},
    clearError: () => {},
    error: null,
  };
}
