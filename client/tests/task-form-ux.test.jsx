import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from 'antd';
import dayjs from 'dayjs';
import { renderWithProviders } from './helpers.jsx';
import TaskFormModal from '../src/pages/tasks/components/TaskFormModal';

const PROJECT = {
  _id: 'p1',
  name: 'Dự án mẫu',
  customFields: [{ key: 'channel', name: 'Kênh bắt buộc', type: 'text', required: true }],
};
const VALUES = {
  title: 'Thiết kế giao diện',
  project: 'p1',
  status: 'todo',
  priority: 'medium',
  description: 'Mô tả ban đầu',
  progress: 25,
  estimatedHours: 8,
  actualHours: 2,
  customValues: { channel: 'Web' },
};
const ADVANCED = {
  taskGroup: 'g1',
  parentTask: 't1',
  followers: ['u1'],
  requiredSkills: [{ name: 'React', level: 3, weight: 0.7 }],
  dependencies: [{ task: 't1', type: 'start_to_start' }],
};

function Harness({ values = VALUES, captureForm, ...props }) {
  const [form] = Form.useForm();
  useEffect(() => {
    form.setFieldsValue(values);
    captureForm?.(form);
  }, [form, values, captureForm]);
  return (
    <TaskFormModal
      open
      form={form}
      canManageTasks
      currentUser={{ _id: 'u1', role: 'admin' }}
      projects={[PROJECT]}
      selectedProject="p1"
      taskGroups={[{ _id: 'g1', name: 'Thiết kế' }]}
      resources={[{ _id: 'u1', userName: 'Người thực hiện' }]}
      dependencyOptions={[{ value: 't1', label: 'Công việc trước' }]}
      onClose={() => {}}
      onSubmit={() => {}}
      t={() => ''}
      {...props}
    />
  );
}

const disclosure = () => screen.getByText('Cấu hình nâng cao').closest('details');
const toggle = () => userEvent.click(screen.getByText('Cấu hình nâng cao'));

describe('Task form — focused UX', () => {
  it('starts with advanced fields collapsed but mounted, and required custom fields visible', async () => {
    renderWithProviders(<Harness values={{ ...VALUES, ...ADVANCED }} />);
    expect(disclosure()).not.toHaveAttribute('open');
    expect(screen.getByLabelText('Tên kỹ năng')).toHaveValue('React');
    expect(disclosure()).toContainElement(screen.getByLabelText('Tên kỹ năng'));
    await waitFor(() => expect(screen.getByLabelText('Kênh bắt buộc')).toBeVisible());
    expect(disclosure()).not.toContainElement(screen.getByLabelText('Giờ thực tế'));
    expect(disclosure()).not.toContainElement(screen.getByLabelText('Thời gian thực hiện').closest('.ant-form-item'));
  });

  it('submits all existing advanced values unchanged while collapsed when editing', async () => {
    const onSubmit = vi.fn();
    const values = {
      ...VALUES,
      ...ADVANCED,
      difficulty: 'hard',
      dateRange: [dayjs('2026-11-01T09:00'), dayjs('2026-11-02T17:00')],
    };
    renderWithProviders(<Harness values={values} editingTask={{ _id: 'edit-1', project: 'p1' }} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0]).toEqual(expect.objectContaining(values));
    expect(disclosure()).not.toHaveAttribute('open');
  });

  it('preserves edited values across collapse and expands hidden validation errors before focusing', async () => {
    const onSubmit = vi.fn();
    const scrollToField = vi.fn();
    renderWithProviders(
      <Harness
        values={{ ...VALUES, ...ADVANCED }}
        onSubmit={onSubmit}
        captureForm={(form) => { form.scrollToField = scrollToField; }}
      />
    );
    await toggle();
    const name = screen.getByRole('combobox', { name: 'Tên kỹ năng' });
    await userEvent.clear(name);
    await toggle();
    expect(disclosure()).not.toHaveAttribute('open');
    expect(screen.getByLabelText('Tên kỹ năng')).toHaveValue('');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo công việc' }));
    expect(await screen.findByText('Nhập tên kỹ năng')).toBeVisible();
    expect(disclosure()).toHaveAttribute('open');
    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(scrollToField).toHaveBeenCalledWith(['requiredSkills', 0, 'name'], { focus: true }));
  });

  it('also reveals an invalid dependency in a closed section', async () => {
    renderWithProviders(
      <Harness values={{ ...VALUES, dependencies: [{ type: 'finish_to_start' }] }} captureForm={(form) => { form.scrollToField = vi.fn(); }} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tạo công việc' }));
    expect(await screen.findByText('Chọn công việc tiền nhiệm')).toBeVisible();
    expect(disclosure()).toHaveAttribute('open');
  });

  it('removes a skill by keyboard without submitting and preserves the remaining skill payload', async () => {
    const onSubmit = vi.fn();
    const remaining = { name: 'SQL', level: 2, weight: 0.4 };
    renderWithProviders(
      <Harness values={{ ...VALUES, requiredSkills: [...ADVANCED.requiredSkills, remaining] }} onSubmit={onSubmit} />
    );
    await toggle();
    const remove = screen.getByRole('button', { name: 'Xóa kỹ năng 1' });
    remove.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.queryByDisplayValue('React')).toBeNull();
    expect(screen.getByDisplayValue('SQL')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    await toggle();
    await userEvent.click(screen.getByRole('button', { name: 'Tạo công việc' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0].requiredSkills).toEqual([remaining]);
  });

  it('keeps existing member restrictions after opening advanced configuration', async () => {
    renderWithProviders(<Harness canManageTasks={false} currentUser={{ _id: 'member', role: 'member' }} />);
    expect(screen.getByLabelText('Tiêu đề công việc')).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Độ ưu tiên' })).toBeDisabled();
    expect(screen.getByLabelText('Giờ thực tế')).not.toBeDisabled();
    await toggle();
    expect(screen.getByRole('combobox', { name: /Nhóm công việc/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Thêm công việc tiền nhiệm' })).toBeNull();
  });
});
