/**
 * Bộ này giữ đúng thứ không kiểm chứng được bằng build: sau khi 12 trang chuyển
 * sang `React.lazy`, chúng có thật sự render ra không, và ranh giới `Suspense`
 * đặt trong `Content` có giữ được sidebar/header khi nội dung đang tải không.
 * Build xanh không trả lời được câu nào trong hai câu đó.
 */
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, authState } from './helpers.jsx';

const { auth } = vi.hoisted(() => ({ auth: { current: null } }));

vi.mock('../src/context/AuthContext', async (importOriginal) => ({
  ...(await importOriginal()),
  useAuth: () => auth.current,
}));

vi.mock('../src/context/SocketContext', async (importOriginal) => ({
  ...(await importOriginal()),
  useSocket: () => ({
    socket: null,
    notifications: [],
    unreadCount: 0,
    toastNotification: null,
    dismissToast: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    refreshNotifications: vi.fn(),
  }),
}));

vi.mock('../src/services/analyticsService', () => ({
  default: { getDashboard: vi.fn().mockResolvedValue({ data: { data: {} } }) },
}));

const { default: App } = await import('../src/App.jsx');

const DASHBOARD_TEXT = 'Tổng quan hệ thống quản lý nguồn lực và phân bổ nhân sự';

describe('Định tuyến và nạp trang theo chunk', () => {
  it('khung layout đứng yên trong lúc chunk của trang đang tải', async () => {
    auth.current = authState();
    const { container } = renderWithProviders(<App />, { route: '/' });

    // Ngay sau render, chunk Dashboard chưa về: fallback đang hiện...
    expect(container.querySelector('.spinner')).toBeTruthy();
    expect(screen.queryByText(DASHBOARD_TEXT)).toBeNull();
    // ...nhưng sidebar và header phải còn nguyên. Đây là lý do ranh giới Suspense
    // nằm trong Content chứ không bọc cả <Routes>.
    expect(container.querySelector('.ant-layout-sider')).toBeTruthy();
    expect(container.querySelector('.ant-layout-header')).toBeTruthy();

    await screen.findByText(DASHBOARD_TEXT);
    expect(container.querySelector('.spinner')).toBeNull();
  });

  it('chưa đăng nhập vào route bảo vệ thì rơi về trang đăng nhập, không có khung layout', async () => {
    auth.current = authState({ authenticated: false });
    const { container } = renderWithProviders(<App />, { route: '/dashboard' });

    await screen.findByText('Đăng nhập hệ thống');
    // Login nằm ngoài AppLayout nên không được kèm sidebar.
    expect(container.querySelector('.ant-layout-sider')).toBeNull();
  });

  it('đường dẫn không tồn tại thì quay về trang chủ', async () => {
    auth.current = authState();
    renderWithProviders(<App />, { route: '/duong-dan-khong-co-that' });

    await screen.findByText(DASHBOARD_TEXT);
  });

  it('đã đăng nhập mà vào /login thì bị đẩy về trang chủ', async () => {
    auth.current = authState();
    renderWithProviders(<App />, { route: '/login' });

    await screen.findByText(DASHBOARD_TEXT);
    expect(screen.queryByText('Đăng nhập hệ thống')).toBeNull();
  });
});
