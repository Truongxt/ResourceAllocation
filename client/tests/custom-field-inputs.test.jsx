import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Form } from 'antd';
import dayjs from 'dayjs';
import { renderWithProviders } from './helpers.jsx';
import CustomFieldInputs, { toFormCustomValues, fromFormCustomValues } from '../src/components/tasks/CustomFieldInputs';

const channel = { key: 'f_aaaaaaaa', name: 'Kênh', type: 'select', options: ['Facebook', 'TikTok'], required: true, order: 1 };
const budget = { key: 'f_bbbbbbbb', name: 'Ngân sách', type: 'number', options: [], order: 0 };
const release = { key: 'f_cccccccc', name: 'Ngày phát hành', type: 'date', options: [], order: 2 };
const project = { _id: 'p1', customFields: [channel, budget, release] };

function Harness({ onFinish, initialValues, disabled }) {
  const [form] = Form.useForm();
  return (
    <Form form={form} onFinish={onFinish} initialValues={initialValues}>
      <CustomFieldInputs project={project} disabled={disabled} />
      <Button htmlType="submit">Lưu</Button>
    </Form>
  );
}

describe('Ô nhập trường tùy chỉnh', () => {
  it('một ô cho mỗi trường, theo thứ tự của dự án', () => {
    renderWithProviders(<Harness onFinish={() => {}} />);
    const labels = [...document.querySelectorAll('[data-testid="custom-field-inputs"] label')].map((l) => l.textContent);
    expect(labels).toEqual(['Ngân sách', 'Kênh', 'Ngày phát hành']);
  });

  it('dự án không có trường thì không vẽ gì', () => {
    renderWithProviders(<Form><CustomFieldInputs project={{ customFields: [] }} /></Form>);
    expect(screen.queryByTestId('custom-field-inputs')).toBeNull();
  });

  it('trường bắt buộc bỏ trống thì form chặn, không gửi', async () => {
    const onFinish = vi.fn();
    renderWithProviders(<Harness onFinish={onFinish} />);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Chưa điền "Kênh"')).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('nạp giá trị cũ vào form rồi gửi lại đúng dạng server cần', async () => {
    const onFinish = vi.fn();
    const stored = { [channel.key]: 'TikTok', [budget.key]: 1500, [release.key]: '2026-11-20T00:00:00.000Z' };
    renderWithProviders(<Harness onFinish={onFinish} initialValues={{ customValues: toFormCustomValues(project, stored) }} />);
    expect(screen.getByDisplayValue('20/11/2026')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(onFinish).toHaveBeenCalled());
    expect(fromFormCustomValues(project, onFinish.mock.calls[0][0].customValues)).toEqual({
      [budget.key]: 1500,
      [channel.key]: 'TikTok',
      [release.key]: '2026-11-20',
    });
  });

  it('ô trống gửi null để xóa giá trị cũ; ô của dự án khác bị bỏ', () => {
    expect(fromFormCustomValues(project, { [budget.key]: undefined, f_zzzzzzzz: 'x', [release.key]: dayjs('2026-01-05') })).toEqual({
      [budget.key]: null,
      [channel.key]: null,
      [release.key]: '2026-01-05',
    });
  });

  it('không có quyền sửa nội dung thì ô bị khóa', () => {
    renderWithProviders(<Harness onFinish={() => {}} disabled />);
    expect(document.querySelector('.ant-input-number-disabled')).toBeTruthy();
  });
});
