/**
 * Đổi ngôn ngữ.
 *
 * Kiểm hai điều dễ hỏng nhất:
 *   1. Bấm nút có thật sự đổi chữ trên màn hình không — nếu component lấy nhãn ở
 *      cấp module thay vì trong hàm render thì nhãn đứng yên và lỗi này rất khó
 *      thấy khi tự bấm thử, vì phần lớn màn hình vẫn đổi.
 *   2. Lựa chọn có được nhớ lại không.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n, { LANG_STORAGE_KEY } from '../src/i18n';
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

const { default: Header } = await import('../src/components/layout/Header.jsx');
const { default: Sidebar } = await import('../src/components/layout/Sidebar.jsx');
const { default: Settings } = await import('../src/pages/Settings.jsx');

function renderChrome() {
  return renderWithProviders(
    <>
      <Sidebar collapsed={false} onToggle={() => {}} />
      <Header collapsed={false} />
    </>,
    { route: '/projects' }
  );
}

describe('Đổi ngôn ngữ', () => {
  beforeEach(async () => {
    auth.current = authState();
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  // i18n là singleton dùng chung cả file; trả về tiếng Việt để không rò sang bộ khác.
  afterAll(async () => {
    await i18n.changeLanguage('vi');
  });

  it('nút hiện ngôn ngữ sẽ chuyển sang, không phải ngôn ngữ đang dùng', () => {
    renderChrome();
    // Đang tiếng Việt thì nút phải mời sang EN. Hiện "VI" là mời quay lại chính nó.
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
  });

  it('bấm nút thì cả sidebar lẫn tiêu đề trang đổi theo', async () => {
    const user = userEvent.setup();
    renderChrome();

    expect(screen.getByText('Dự án')).toBeInTheDocument();
    expect(screen.getByText('Quản lý Dự án')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'EN' }));

    // Hai chỗ: mục menu ở sidebar và tiêu đề trang ở header — tiếng Anh gọi cả
    // hai là "Projects", nên đếm thay vì đòi duy nhất một phần tử.
    expect(screen.getAllByText('Projects').length).toBe(2);
    expect(screen.queryByText('Quản lý Dự án')).toBeNull();
    expect(screen.queryByText('Dự án')).toBeNull();
    expect(screen.getByRole('button', { name: 'VI' })).toBeInTheDocument();
  });

  it('nhớ lựa chọn để lần mở sau vẫn đúng ngôn ngữ', async () => {
    const user = userEvent.setup();
    renderChrome();

    await user.click(screen.getByRole('button', { name: 'EN' }));

    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
  });

  it('nhãn vai trò trong enum cũng đổi theo', async () => {
    const user = userEvent.setup();
    renderChrome();

    expect(screen.getByText('Quản trị viên')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });

  // Bốn ca trên chỉ chạm vào khung ứng dụng. Ca này chạm vào một trang nghiệp vụ
  // thật: tiêu đề thẻ, nhãn form, và thông báo lỗi validation — nhóm cuối dễ bị
  // bỏ sót nhất vì chúng không hiện ra cho tới khi người dùng thao tác sai.
  it('trang nghiệp vụ đổi cả nhãn form lẫn thông báo lỗi', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Settings />, { route: '/settings' });

    expect(screen.getByText('Hồ sơ cá nhân')).toBeInTheDocument();
    expect(screen.getByLabelText('Họ và tên')).toBeInTheDocument();

    // Bỏ trống ô bắt buộc để ép thông báo validation hiện ra.
    await user.clear(screen.getByLabelText('Họ và tên'));
    await user.click(screen.getByRole('button', { name: /Lưu thay đổi/ }));
    expect(await screen.findByText('Vui lòng nhập họ tên')).toBeInTheDocument();

    await i18n.changeLanguage('en');

    expect(await screen.findByText('Profile')).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();

    // Antd giữ nguyên chuỗi lỗi từ lần kiểm trước, đổi ngôn ngữ không viết lại nó.
    // Trong app thật điều này không lộ ra vì `key={i18n.language}` dựng lại cả cây
    // nên form bị xóa trắng. Ở đây phải kiểm lại để luật validation sinh câu mới.
    await user.click(screen.getByRole('button', { name: /Save changes/ }));
    expect(await screen.findByText('Please enter your name')).toBeInTheDocument();
    expect(screen.queryByText('Vui lòng nhập họ tên')).toBeNull();
  });
});
