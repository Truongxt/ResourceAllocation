/**
 * Nút "Tạo công việc" ở màn Công việc theo đúng luật tạo việc của server (`canCreateTaskIn`):
 * hiện khi người dùng tạo được việc ở ít nhất một dự án — quản lý dự án, hoặc thành viên khi dự án
 * cho phép. Trước đây nút ở cấp danh sách chỉ xét "có dự án nào trong danh sách không".
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, authState } from './helpers.jsx';
import i18n from '../src/i18n';

const mocks = vi.hoisted(() => ({ get: vi.fn(), projects: [] }));

vi.mock('../src/context/AuthContext', async (importOriginal) => ({
  ...(await importOriginal()),
  useAuth: () => ({ ...authState({ role: 'member' }), canManageModule: () => true }),
}));
vi.mock('../src/context/SocketContext', async (importOriginal) => ({
  ...(await importOriginal()),
  useSocket: () => ({ socket: null, notifications: [], unreadCount: 0 }),
}));
vi.mock('../src/services/api', () => ({
  default: {
    get: mocks.get,
    post: vi.fn().mockResolvedValue({ data: { data: {} } }),
    put: vi.fn().mockResolvedValue({ data: { data: {} } }),
    patch: vi.fn().mockResolvedValue({ data: { data: {} } }),
    delete: vi.fn().mockResolvedValue({ data: { data: {} } }),
  },
}));
const { default: Tasks } = await import('../src/pages/tasks/Tasks');

// authState() đăng nhập người dùng `u1`.
const project = (id, name, extra = {}) => ({ _id: id, name, manager: { _id: 'u-pm' }, members: [], permissions: {}, ...extra });
const ME = [{ user: { _id: 'u1' }, role: 'developer' }];

beforeEach(async () => {
  await i18n.changeLanguage('vi');
  mocks.get.mockReset().mockImplementation(async (url) => {
    if (url === '/projects') return { data: { data: { projects: mocks.projects } } };
    if (url === '/tasks') return { data: { total: 0, pagination: { page: 1, pages: 1 }, data: { tasks: [] } } };
    return { data: { data: {} } };
  });
});

describe('Nút Tạo công việc — chỉ hiện khi tạo được ở ít nhất một dự án', () => {
  it('chỉ thấy dự án mình không phải thành viên: không có nút', async () => {
    mocks.projects = [project('p1', 'Dự án ngoài')];
    renderWithProviders(<Tasks />, { route: '/tasks' });
    await screen.findByRole('button', { name: /Xuất CSV/ });
    expect(screen.queryByRole('button', { name: /Tạo công việc/ })).toBeNull();
  });

  it('là thành viên một dự án cho phép tạo việc: có nút', async () => {
    mocks.projects = [project('p1', 'Dự án ngoài'), project('p2', 'Dự án của tôi', { members: ME })];
    renderWithProviders(<Tasks />, { route: '/tasks' });
    expect(await screen.findByRole('button', { name: /Tạo công việc/ })).toBeInTheDocument();
  });
});
