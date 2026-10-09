import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers.jsx';

const state = vi.hoisted(() => ({ update: vi.fn(), user: null }));

vi.mock('../src/services/projectService', () => ({
  default: { updateCustomFields: state.update },
}));
vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: state.user }),
}));

const { default: ProjectCustomFields } = await import('../src/components/projects/ProjectCustomFields');

const PM = { _id: 'u-pm', role: 'project_manager' };
const channel = { key: 'f_aaaaaaaa', name: 'Kênh', type: 'select', options: ['Facebook', 'TikTok'], required: true, order: 0 };
const budget = { key: 'f_bbbbbbbb', name: 'Ngân sách', type: 'number', options: [], required: false, order: 1 };
const project = (extra = {}) => ({ _id: 'p1', manager: { _id: 'u-pm' }, customFields: [budget, channel], ...extra });

const onSaved = vi.fn();
const open = (p = project()) => renderWithProviders(<ProjectCustomFields project={p} onSaved={onSaved} />);

beforeEach(() => {
  state.user = PM;
  onSaved.mockReset();
  state.update.mockReset().mockImplementation(async (id, fields) => ({
    data: { data: { project: { ...project(), customFields: fields.map((f, i) => ({ key: f.key || `f_new0000${i}`, ...f, order: i })) } } },
  }));
});

describe('Trường tùy chỉnh của dự án', () => {
  it('liệt kê theo thứ tự, kiểu của trường đã có không đổi được', async () => {
    open();
    const rows = screen.getAllByTestId('custom-field-row');
    expect(within(rows[0]).getByDisplayValue('Kênh')).toBeInTheDocument();
    expect(within(rows[1]).getByDisplayValue('Ngân sách')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Facebook')).toBeInTheDocument();
    // Select của antd: ô bị khóa mang lớp ant-select-disabled.
    expect(rows[0].querySelector('[data-testid="custom-field-type"]').closest('.ant-select')).toHaveClass('ant-select-disabled');
  });

  it('thêm trường mới rồi lưu: gửi cả danh sách, trường mới không có key', async () => {
    open();
    await userEvent.click(screen.getByRole('button', { name: /Thêm trường/ }));
    const rows = screen.getAllByTestId('custom-field-row');
    await userEvent.type(within(rows[2]).getByPlaceholderText('Tên trường'), 'Ghi chú');
    await userEvent.click(screen.getByRole('button', { name: /Lưu trường/ }));
    await waitFor(() => expect(state.update).toHaveBeenCalled());
    const [id, fields] = state.update.mock.calls[0];
    expect(id).toBe('p1');
    expect(fields.map((f) => [f.key, f.name, f.type])).toEqual([
      ['f_aaaaaaaa', 'Kênh', 'select'],
      ['f_bbbbbbbb', 'Ngân sách', 'number'],
      [undefined, 'Ghi chú', 'text'],
    ]);
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('đổi thứ tự bằng nút lên/xuống', async () => {
    open();
    const rows = screen.getAllByTestId('custom-field-row');
    await userEvent.click(within(rows[1]).getByRole('button', { name: 'Đưa lên' }));
    await userEvent.click(screen.getByRole('button', { name: /Lưu trường/ }));
    await waitFor(() => expect(state.update).toHaveBeenCalled());
    expect(state.update.mock.calls[0][1].map((f) => f.key)).toEqual(['f_bbbbbbbb', 'f_aaaaaaaa']);
  });

  it('xóa một trường đã có thì báo trước: giá trị trên mọi việc sẽ mất', async () => {
    open();
    const rows = screen.getAllByTestId('custom-field-row');
    await userEvent.click(within(rows[1]).getByRole('button', { name: 'Xóa trường' }));
    expect(screen.getByText(/Ngân sách/, { selector: '.ant-alert *' })).toBeInTheDocument();
    expect(screen.getAllByTestId('custom-field-row')).toHaveLength(1);
  });

  it('server từ chối thì hiện đúng lý do', async () => {
    state.update.mockRejectedValue({ response: { data: { message: 'Tên trường "Kênh" bị trùng' } } });
    open();
    await userEvent.click(screen.getByRole('button', { name: /Lưu trường/ }));
    expect(await screen.findByText('Tên trường "Kênh" bị trùng')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('PM không quản lý dự án này: chỉ xem', async () => {
    state.user = { _id: 'u-pm2', role: 'project_manager' };
    open();
    expect(screen.queryByRole('button', { name: /Lưu trường/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Thêm trường/ })).toBeNull();
    expect(screen.getByText('Kênh')).toBeInTheDocument();
  });

  it('dự án lưu trữ: chỉ xem, kể cả admin', async () => {
    state.user = { _id: 'u-a', role: 'admin' };
    open(project({ isArchived: true }));
    expect(screen.queryByRole('button', { name: /Lưu trường/ })).toBeNull();
  });
});
