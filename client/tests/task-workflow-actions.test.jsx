import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers.jsx';

const state = vi.hoisted(() => ({
  complete: vi.fn(),
  review: vi.fn(),
  updateStatus: vi.fn(),
}));

vi.mock('../src/services/taskService', () => ({
  default: {
    complete: state.complete,
    review: state.review,
    updateStatus: state.updateStatus,
  },
}));

const { default: TaskWorkflowActions } = await import('../src/components/tasks/TaskWorkflowActions');

const task = (extra = {}) => ({
  _id: 't1',
  title: 'Công việc thử',
  status: 'in_progress',
  project: { _id: 'p1' },
  ...extra,
});

const allPerms = { canReportResult: true, canReview: true, canMarkFailed: true };

beforeEach(() => {
  state.complete.mockReset().mockResolvedValue({});
  state.review.mockReset().mockResolvedValue({});
  state.updateStatus.mockReset().mockResolvedValue({});
});

describe('Thao tác đóng công việc', () => {
  it('dự án tắt hai tính năng thì chỉ còn nút báo hoàn thành', () => {
    renderWithProviders(<TaskWorkflowActions task={task()} perms={allPerms} />);

    expect(screen.getByRole('button', { name: /Báo hoàn thành/ })).toBeInTheDocument();
    // Nút chỉ hiện khi dự án bật — hiện sẵn rồi báo lỗi khi bấm là một nút sai.
    expect(screen.queryByRole('button', { name: /Thất bại/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Duyệt/ })).toBeNull();
  });

  it('dự án bật đánh dấu thất bại thì hiện nút, và bắt buộc nhập lý do', async () => {
    const withFailure = task({ project: { _id: 'p1', failureConfig: { enabled: true } } });
    renderWithProviders(<TaskWorkflowActions task={withFailure} perms={allPerms} />);

    await userEvent.click(screen.getByRole('button', { name: /Thất bại/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Đánh dấu thất bại/ }));

    // Lý do trống: không được gọi API nào cả.
    expect(state.updateStatus).not.toHaveBeenCalled();

    await userEvent.type(
      screen.getByPlaceholderText('Vì sao công việc này không hoàn thành được?'),
      'Khách hàng hủy hợp đồng'
    );
    await userEvent.click(screen.getByRole('button', { name: /Đánh dấu thất bại/ }));

    expect(state.updateStatus).toHaveBeenCalledWith('t1', 'failed', {
      failureReason: 'Khách hàng hủy hợp đồng',
    });
  });

  it('việc đang chờ đánh giá thì người duyệt thấy Duyệt và Trả lại, không thấy Thất bại', () => {
    const pending = task({
      status: 'review',
      project: { _id: 'p1', reviewConfig: { enabled: true }, failureConfig: { enabled: true } },
    });
    renderWithProviders(<TaskWorkflowActions task={pending} perms={allPerms} />);

    expect(screen.getByRole('button', { name: /Duyệt/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Trả lại/ })).toBeInTheDocument();
    // Đang chờ đánh giá thì kết quả thuộc về người đánh giá — đường tắt sang Thất bại
    // bị server chặn, nên giao diện cũng không được mời gọi.
    expect(screen.queryByRole('button', { name: /Thất bại/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Báo hoàn thành/ })).toBeNull();
  });

  it('không có quyền duyệt thì việc chờ đánh giá không hiện nút nào', () => {
    const pending = task({ status: 'review', project: { _id: 'p1', reviewConfig: { enabled: true } } });
    renderWithProviders(
      <TaskWorkflowActions task={pending} perms={{ ...allPerms, canReview: false }} />
    );

    expect(screen.queryByRole('button', { name: /Duyệt/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Trả lại/ })).toBeNull();
  });

  it('trả lại phải kèm lý do', async () => {
    const pending = task({ status: 'review', project: { _id: 'p1', reviewConfig: { enabled: true } } });
    renderWithProviders(<TaskWorkflowActions task={pending} perms={allPerms} />);

    await userEvent.click(screen.getByRole('button', { name: /Trả lại/ }));

    // Hai nút cùng mang chữ 'Trả lại' (nút mở hộp thoại và nút xác nhận trong đó),
    // nên phải neo vào hộp thoại thay vì tìm trên cả màn hình.
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Trả lại' });
    await userEvent.click(confirm);
    expect(state.review).not.toHaveBeenCalled();

    await userEvent.type(
      screen.getByPlaceholderText('Cần sửa gì trước khi nộp lại?'),
      'Thiếu phần kiểm thử'
    );
    await userEvent.click(confirm);
    expect(state.review).toHaveBeenCalledWith('t1', 'reject', 'Thiếu phần kiểm thử');
  });

  it('việc đã đóng thì không còn thao tác nào', () => {
    const done = task({
      status: 'done',
      project: { _id: 'p1', reviewConfig: { enabled: true }, failureConfig: { enabled: true } },
    });
    const { container } = renderWithProviders(
      <TaskWorkflowActions task={done} perms={allPerms} />
    );
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});
