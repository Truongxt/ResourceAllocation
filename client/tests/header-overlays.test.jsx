/**
 * Bốn lớp phủ của Header (tìm kiếm, tạo nhanh, nhắc việc, chi tiết công việc) chỉ
 * được tải khi mở lần đầu, để chunk chính không phải mang theo DatePicker, Form và
 * cả khối chi tiết công việc cho mọi trang.
 *
 * Bộ này canh hai điều mà việc tách đó có thể làm hỏng:
 *   1. Bấm vào thì lớp phủ vẫn hiện ra — trước khi bấm thì chưa dựng gì.
 *   2. Chunk không tải được (tab mở từ trước một lần deploy) thì báo lỗi và đóng lại,
 *      không ném lỗi ra ngoài làm trắng cả ứng dụng.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Không bộ nào ở đây kiểm dữ liệu: mọi request trả về rỗng.
vi.mock('../src/services/api', () => {
  const empty = () => Promise.resolve({
    data: { success: true, data: { projects: [], tasks: [], resources: [], pagination: { pages: 1 } } },
  });
  return { default: { get: vi.fn(empty), post: vi.fn(empty), put: vi.fn(empty), delete: vi.fn(empty) } };
});

// Giả lập chunk không còn trên máy chủ: lệnh import động của nó bị từ chối.
vi.mock('../src/components/tasks/RemindersDrawer', () => {
  throw new Error('Failed to fetch dynamically imported module');
});

const { default: Header } = await import('../src/components/layout/Header.jsx');

const SEARCH_PLACEHOLDER = /Tìm nhanh trang, dự án, công việc, nhân sự/;

describe('Lớp phủ của Header tải khi mở lần đầu', () => {
  beforeEach(() => {
    auth.current = authState();
  });

  it('chưa mở thì chưa dựng; Ctrl+K thì ô tìm kiếm hiện ra', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Header collapsed={false} />);

    expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).toBeNull();

    await user.keyboard('{Control>}k{/Control}');

    expect(await screen.findByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
  });

  it('chunk không tải được thì báo lỗi, Header vẫn còn nguyên', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<Header collapsed={false} />);

    await user.click(container.querySelector('.anticon-clock-circle').closest('button'));

    expect(await screen.findByText(/Không tải được phần này/)).toBeInTheDocument();
    // Lỗi không lan ra ngoài: phần còn lại của Header vẫn được dựng và dùng được.
    await waitFor(() => expect(container.querySelector('.anticon-bell')).not.toBeNull());
    await user.keyboard('{Control>}k{/Control}');
    expect(await screen.findByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
  });
});
