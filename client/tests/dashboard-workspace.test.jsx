import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, authState } from './helpers.jsx';
import i18n from '../src/i18n';

const state = vi.hoisted(() => ({ auth: null, getDashboard: vi.fn() }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => state.auth }));
vi.mock('../src/services/analyticsService', () => ({ default: { getDashboard: state.getDashboard } }));
const { default: Dashboard } = await import('../src/pages/dashboard/Dashboard');

const data = {
  projects: { total: 4, active: 2 },
  tasks: { total: 9, inProgress: 3, done: 2, blocked: 1, overdue: 2, unassigned: 3 },
  resources: { total: 5, available: 2, avgUtilization: 80, overloaded: 1 },
  recentTasks: [{ _id: 'task-1', title: 'Kiểm tra thanh toán', status: 'blocked', updatedAt: new Date().toISOString() }],
};
beforeEach(async () => {
  state.auth = authState();
  state.getDashboard.mockReset().mockResolvedValue({ data: { data } });
  await i18n.changeLanguage('vi');
});

describe('Dashboard working view', () => {
  it('links each exception to the matching filter and opens recent task details', async () => {
    renderWithProviders(<Dashboard />);
    expect(await screen.findByRole('heading', { name: 'Cần xử lý' })).toBeInTheDocument();
    // Kiểm đích đến và con số riêng rẽ. Trước đây gộp cả hai vào một chuỗi tên
    // ("2 Công việc trễ hạn") nên chỉ cần đổi thứ tự số với nhãn trong DOM là test
    // đỏ, dù liên kết vẫn trỏ đúng chỗ.
    const exceptions = [
      ['Công việc trễ hạn', '/tasks?timeFilter=overdue', '2'],
      ['Công việc bị chặn', '/tasks?status=blocked', '1'],
      ['Chưa phân công', '/tasks?unassigned=true', '3'],
      ['Nhân sự quá tải', '/resources?workload=overloaded', '1'],
    ];
    for (const [name, href, count] of exceptions) {
      const row = screen.getByRole('link', { name: new RegExp(name) });
      expect(row).toHaveAttribute('href', href);
      expect(row).toHaveTextContent(count);
    }
    expect(screen.getByRole('link', { name: 'Kiểm tra thanh toán' })).toHaveAttribute('href', '/tasks?taskId=task-1');
  });

  it('shows a retry instead of misleading zero metrics after a failed load', async () => {
    state.getDashboard.mockRejectedValueOnce(new Error('offline'));
    renderWithProviders(<Dashboard />);
    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('Không tải được dữ liệu');
    expect(screen.queryByRole('heading', { name: 'Cần xử lý' })).not.toBeInTheDocument();
    await userEvent.click(error.querySelector('button'));
    expect(await screen.findByRole('heading', { name: 'Cần xử lý' })).toBeInTheDocument();
  });

  it('does not offer restricted resource or optimization pages to members', async () => {
    state.auth = { ...authState({ role: 'member' }), hasAppAccess: () => false };
    renderWithProviders(<Dashboard />);
    await screen.findByRole('heading', { name: 'Cần xử lý' });
    expect(screen.queryByRole('link', { name: /Nhân sự quá tải/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lập phương án phân bổ' })).not.toBeInTheDocument();
  });
});
