/**
 * `notif.link` là đích điều hướng động duy nhất trong toàn bộ client — nó đến từ
 * database, và schema Notification không ràng buộc gì về nội dung. Header chặn
 * open redirect tại chỗ bấm. Bộ này bấm thật qua giao diện chứ không gọi thẳng
 * hàm kiểm tra, vì thứ cần bảo vệ là hành vi của nút bấm.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, authState } from './helpers.jsx';

const { auth, socket, navigate } = vi.hoisted(() => ({
  auth: { current: null },
  socket: { notifications: [] },
  navigate: { spy: null },
}));

vi.mock('../src/context/AuthContext', async (importOriginal) => ({
  ...(await importOriginal()),
  useAuth: () => auth.current,
}));

vi.mock('../src/context/SocketContext', async (importOriginal) => ({
  ...(await importOriginal()),
  useSocket: () => ({
    socket: null,
    notifications: socket.notifications,
    unreadCount: socket.notifications.filter((n) => !n.readAt).length,
    toastNotification: null,
    dismissToast: vi.fn(),
    markAsRead: socket.markAsRead,
    markAllAsRead: vi.fn(),
    refreshNotifications: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate.spy,
}));

const { default: Header } = await import('../src/components/layout/Header.jsx');

const TITLE = 'Bạn được giao một công việc';

/** Mở chuông thông báo với đúng một thông báo có `link` cho trước, rồi bấm vào nó. */
async function clickNotification(link, { readAt = new Date().toISOString() } = {}) {
  socket.notifications = [
    { _id: 'n1', type: 'task_assigned', title: TITLE, message: 'Chi tiết', link, readAt, createdAt: new Date().toISOString() },
  ];

  const user = userEvent.setup();
  const { container } = renderWithProviders(<Header collapsed={false} />);

  await user.click(container.querySelector('.anticon-bell').closest('button'));
  await user.click(await screen.findByText(TITLE));
}

describe('Chặn open redirect ở link thông báo', () => {
  beforeEach(() => {
    auth.current = authState();
    navigate.spy = vi.fn();
    socket.markAsRead = vi.fn();
  });

  it('đường dẫn nội bộ thì đi tới nơi', async () => {
    await clickNotification('/tasks');
    expect(navigate.spy).toHaveBeenCalledWith('/tasks');
  });

  it('“//host” bị chặn — trình duyệt hiểu đây là sang tên miền khác', async () => {
    await clickNotification('//evil.example.com');
    expect(navigate.spy).not.toHaveBeenCalled();
  });

  it('“/\\host” bị chặn — biến thể dùng dấu gạch ngược', async () => {
    await clickNotification('/\\evil.example.com');
    expect(navigate.spy).not.toHaveBeenCalled();
  });

  it('URL tuyệt đối bị chặn', async () => {
    await clickNotification('https://evil.example.com');
    expect(navigate.spy).not.toHaveBeenCalled();
  });

  it('thiếu link thì không điều hướng đi đâu cả', async () => {
    await clickNotification(undefined);
    expect(navigate.spy).not.toHaveBeenCalled();
  });

  it('thông báo chưa đọc thì vẫn được đánh dấu đã đọc, kể cả khi link bị chặn', async () => {
    await clickNotification('https://evil.example.com', { readAt: null });
    expect(socket.markAsRead).toHaveBeenCalledWith('n1');
    expect(navigate.spy).not.toHaveBeenCalled();
  });
});
