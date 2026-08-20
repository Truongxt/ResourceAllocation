import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, authState } from './helpers.jsx';

const { auth } = vi.hoisted(() => ({ auth: { current: null } }));

vi.mock('../src/context/AuthContext', async (importOriginal) => ({
  ...(await importOriginal()),
  useAuth: () => auth.current,
}));

const { default: ProtectedRoute } = await import('../src/components/common/ProtectedRoute.jsx');

function renderGuarded(roles) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<div>TRANG ĐĂNG NHẬP</div>} />
      <Route
        path="/"
        element={
          <ProtectedRoute roles={roles}>
            <div>NỘI DUNG ĐƯỢC BẢO VỆ</div>
          </ProtectedRoute>
        }
      />
    </Routes>,
    { route: '/' }
  );
}

describe('ProtectedRoute', () => {
  it('đang kiểm tra phiên thì hiện spinner, chưa quyết định gì', () => {
    auth.current = authState({ loading: true, authenticated: false });
    const { container } = renderGuarded();

    expect(container.querySelector('.spinner')).toBeTruthy();
    // Quan trọng: lúc này KHÔNG được đá về /login, vì chưa biết có phiên hay không.
    expect(screen.queryByText('TRANG ĐĂNG NHẬP')).toBeNull();
    expect(screen.queryByText('NỘI DUNG ĐƯỢC BẢO VỆ')).toBeNull();
  });

  it('chưa đăng nhập thì chuyển về /login', () => {
    auth.current = authState({ authenticated: false });
    renderGuarded();

    expect(screen.getByText('TRANG ĐĂNG NHẬP')).toBeInTheDocument();
    expect(screen.queryByText('NỘI DUNG ĐƯỢC BẢO VỆ')).toBeNull();
  });

  it('đã đăng nhập thì cho qua', () => {
    auth.current = authState();
    renderGuarded();

    expect(screen.getByText('NỘI DUNG ĐƯỢC BẢO VỆ')).toBeInTheDocument();
  });

  it('sai vai trò thì chặn tại chỗ chứ không đá về /login', () => {
    auth.current = authState({ role: 'member' });
    renderGuarded(['admin']);

    expect(screen.getByText('Không có quyền truy cập')).toBeInTheDocument();
    expect(screen.queryByText('NỘI DUNG ĐƯỢC BẢO VỆ')).toBeNull();
    // Đá về /login ở đây sẽ sai: người dùng đã đăng nhập, chỉ là không đủ quyền.
    expect(screen.queryByText('TRANG ĐĂNG NHẬP')).toBeNull();
  });

  it('đúng vai trò trong danh sách thì cho qua', () => {
    auth.current = authState({ role: 'project_manager' });
    renderGuarded(['admin', 'project_manager']);

    expect(screen.getByText('NỘI DUNG ĐƯỢC BẢO VỆ')).toBeInTheDocument();
  });
});
