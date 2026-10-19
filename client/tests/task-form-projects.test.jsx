/**
 * Form tạo công việc chỉ cho chọn dự án người dùng tạo việc được (utils/projectAccess.js,
 * `canCreateTaskIn` — khớp createDeniedReason ở server). Trước đây form liệt kê mọi dự án, chọn
 * dự án không được phép thì bấm Tạo mới nhận 403; còn ô chọn dự án thì bị khóa với người không
 * quản lý dự án nào, kể cả khi thành viên được phép tạo việc.
 */
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from 'antd';
import { renderWithProviders } from './helpers.jsx';

vi.mock('../src/services/taskService', () => ({ default: {} }));
const { default: TaskFormModal } = await import('../src/pages/tasks/components/TaskFormModal');

const ME = { _id: 'u-me', role: 'member' };
const MINE = { _id: 'p1', name: 'Nội bộ', manager: { _id: 'u-pm' }, members: [{ user: { _id: 'u-me' }, role: 'developer' }], permissions: {} };
const CLOSED = { ...MINE, _id: 'p2', name: 'Đã tắt tạo việc', permissions: { allowMembersCreateTasks: false } };
const OUTSIDE = { _id: 'p3', name: 'Dự án ngoài', manager: { _id: 'u-pm' }, members: [], permissions: {} };

function Harness(props) {
  const [form] = Form.useForm();
  return (
    <TaskFormModal
      open
      onClose={() => {}}
      editingTask={null}
      form={form}
      currentUser={ME}
      projects={[MINE, CLOSED, OUTSIDE]}
      t={() => ''}
      onSubmit={() => {}}
      {...props}
    />
  );
}

describe('Form tạo công việc — chọn dự án', () => {
  it('thành viên chọn được dự án, và chỉ thấy dự án mình tạo việc được', async () => {
    renderWithProviders(<Harness />);
    const select = await screen.findByRole('combobox', { name: /Thuộc dự án/ });
    expect(select).not.toBeDisabled();
    await userEvent.click(select);
    expect(await screen.findByText('Nội bộ')).toBeInTheDocument();
    expect(screen.queryByText('Đã tắt tạo việc')).toBeNull();
    expect(screen.queryByText('Dự án ngoài')).toBeNull();
  });
});
