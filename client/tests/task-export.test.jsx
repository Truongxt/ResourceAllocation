/**
 * Nút "Xuất CSV" ở màn Công việc.
 *
 * Server trả tối đa 100 việc mỗi trang, màn hình chỉ giữ trang đầu. Bộ này giữ hai
 * điều: file chứa việc của MỌI trang, và đi kèm đúng bộ lọc đang áp dụng.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, authState } from './helpers.jsx';
import i18n from '../src/i18n';

const mocks = vi.hoisted(() => ({ get: vi.fn(), download: vi.fn() }));

vi.mock('../src/context/AuthContext', async (importOriginal) => ({
  ...(await importOriginal()),
  useAuth: () => ({ ...authState(), canManageModule: () => true }),
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
vi.mock('../src/utils/csv', () => ({ downloadCsv: mocks.download, toCsv: vi.fn() }));
const { default: Tasks } = await import('../src/pages/tasks/Tasks');

const task = (id, title) => ({
  _id: id, title, status: 'in_progress', priority: 'high', progress: 40, estimatedHours: 8,
  startDate: '2026-10-01T00:00:00.000Z', endDate: '2026-10-09T00:00:00.000Z',
  project: { _id: 'p1', name: 'Dự án A' }, assignee: { _id: 'u2', name: 'Nam' },
});

/** Server giả: `pages` trang, mỗi trang một việc; trang 2 là việc bị chặn. */
const serve = ({ pages = 2, total = pages } = {}) =>
  mocks.get.mockReset().mockImplementation(async (url, { params = {} } = {}) => {
    if (url === '/tasks') {
      const page = params.page || 1;
      const one = { ...task(`t${page}`, `Việc trang ${page}`), ...(page === 2 ? { status: 'blocked' } : {}) };
      return { data: { total, pagination: { page, pages }, data: { tasks: [one] } } };
    }
    return { data: { data: {} } };
  });

beforeEach(async () => {
  await i18n.changeLanguage('vi');
  mocks.download.mockReset();
  serve();
});

describe('Xuất CSV công việc', () => {
  it('lấy hết mọi trang theo đúng bộ lọc đang áp dụng', async () => {
    renderWithProviders(<Tasks />, { route: '/tasks?timeFilter=overdue' });
    await screen.findByText('Việc trang 2');
    // Màn hình cũng tải theo trang 100 việc — chỉ đếm những lần gọi sau khi bấm Xuất.
    const before = mocks.get.mock.calls.length;
    await userEvent.click(await screen.findByRole('button', { name: /Xuất CSV/ }));
    await waitFor(() => expect(mocks.download).toHaveBeenCalledTimes(1));

    const exportCalls = mocks.get.mock.calls.slice(before).filter(([url]) => url === '/tasks');
    expect(exportCalls.map(([, opts]) => opts.params.page)).toEqual([1, 2]);
    expect(exportCalls.every(([, opts]) => opts.params.timeFilter === 'overdue')).toBe(true);

    const [filename, rows] = mocks.download.mock.calls[0];
    expect(filename).toMatch(/\.csv$/);
    expect(rows[0]).toContain('Tên công việc');
    expect(rows.slice(1).map((r) => r[0])).toEqual(['Việc trang 1', 'Việc trang 2']);
    expect(rows[1]).toEqual(expect.arrayContaining(['Dự án A', 'Nam', '2026-10-09', 8, 40]));
  });
});

/** Giá trị của một ô trong dải chỉ số, tìm theo nhãn. */
const metric = (label) => screen.getByText(label, { selector: 'dt' }).nextElementSibling.textContent;

describe('Danh sách công việc trên màn hình', () => {
  it('hiện việc ở mọi trang, không dừng ở trang đầu; chip đếm đủ', async () => {
    renderWithProviders(<Tasks />, { route: '/tasks' });
    expect(await screen.findByText('Việc trang 1')).toBeInTheDocument();
    expect(await screen.findByText('Việc trang 2')).toBeInTheDocument();
    expect(metric('Công việc')).toBe('2');
    // Chip "Bị chặn" từng đếm status 'cancelled' — trạng thái không tồn tại — nên luôn ra 0.
    expect(metric('Bị chặn')).toBe('1');
  });

  it('quá trần thì nói rõ đang hiện bao nhiêu trên tổng số', async () => {
    serve({ pages: 12, total: 1200 });
    renderWithProviders(<Tasks />, { route: '/tasks' });
    // Mỗi trang giả có một việc, nên trần 10 trang = 10 việc đang hiện.
    expect(await screen.findByText(/Đang hiện 10 \/ 1200 công việc/)).toBeInTheDocument();
    const pagesAsked = mocks.get.mock.calls
      .filter(([url, opts]) => url === '/tasks' && opts?.params?.limit === 100)
      .map(([, opts]) => opts.params.page);
    expect(Math.max(...pagesAsked)).toBe(10);
  });
});
