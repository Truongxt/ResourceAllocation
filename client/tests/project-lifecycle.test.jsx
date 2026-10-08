/**
 * Menu vòng đời và modal nhân bản ở màn Dự án.
 *
 * Giữ ba điều: mục trong menu đúng với chỗ dự án đang ở (chạy / lưu trữ / mẫu), modal
 * gửi đúng tham số cho từng thao tác, và lý do server từ chối lưu trữ (còn bao nhiêu
 * việc mở) đến được tới người dùng nguyên văn.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers.jsx';
import i18n from '../src/i18n';

const mocks = vi.hoisted(() => ({ duplicate: vi.fn(), archive: vi.fn(), unarchive: vi.fn() }));
vi.mock('../src/services/projectService', () => ({
  default: { duplicate: mocks.duplicate, archive: mocks.archive, unarchive: mocks.unarchive },
}));
const { default: ProjectLifecycleMenu } = await import('../src/components/projects/ProjectLifecycleMenu');
const { default: ProjectDuplicateModal } = await import('../src/components/projects/ProjectDuplicateModal');
const { default: ProjectRowActions } = await import('../src/components/projects/ProjectRowActions');

const project = (extra = {}) => ({ _id: 'p1', name: 'Website', startDate: '2026-11-02T00:00:00.000Z', ...extra });
const openMenu = async () => userEvent.click(screen.getByRole('button', { name: 'Thao tác khác' }));

beforeEach(async () => {
  await i18n.changeLanguage('vi');
  Object.values(mocks).forEach((m) => m.mockReset());
});

describe('Menu vòng đời dự án', () => {
  it('dự án đang chạy: nhân bản, lưu thành mẫu, lưu trữ', async () => {
    renderWithProviders(<ProjectLifecycleMenu project={project()} />);
    await openMenu();
    for (const label of ['Nhân bản', 'Lưu thành mẫu', 'Lưu trữ']) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText('Mở lại')).toBeNull();
  });

  it('mẫu chỉ có "Tạo dự án từ mẫu" và gọi lại với đúng chế độ', async () => {
    const onDuplicate = vi.fn();
    renderWithProviders(<ProjectLifecycleMenu project={project({ isTemplate: true })} onDuplicate={onDuplicate} />);
    await openMenu();
    await userEvent.click(await screen.findByText('Tạo dự án từ mẫu'));
    expect(onDuplicate).toHaveBeenCalledWith('fromTemplate', expect.objectContaining({ _id: 'p1' }));
    expect(screen.queryByText('Lưu trữ')).toBeNull();
  });

  it('lưu trữ bị từ chối thì hiện nguyên văn lý do của server', async () => {
    mocks.archive.mockRejectedValue({ response: { data: { message: 'Còn 3 công việc chưa đóng' } } });
    renderWithProviders(<ProjectLifecycleMenu project={project()} />);
    await openMenu();
    await userEvent.click(await screen.findByText('Lưu trữ'));
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu trữ' }));
    expect(await screen.findByText('Còn 3 công việc chưa đóng')).toBeInTheDocument();
  });
});

describe('Modal nhân bản', () => {
  it('tạo từ mẫu: gửi tên, ngày bắt đầu và asTemplate=false', async () => {
    mocks.duplicate.mockResolvedValue({ data: { data: { project: { _id: 'p2' } } } });
    const onDone = vi.fn();
    renderWithProviders(<ProjectDuplicateModal mode="fromTemplate" source={project({ isTemplate: true })} onDone={onDone} />);
    await userEvent.type(await screen.findByLabelText('Tên'), 'Website khách B');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo dự án' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const [id, body] = mocks.duplicate.mock.calls[0];
    expect(id).toBe('p1');
    expect(body).toMatchObject({ name: 'Website khách B', asTemplate: false });
    expect(body.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('lưu thành mẫu: không hỏi ngày, gửi asTemplate=true', async () => {
    mocks.duplicate.mockResolvedValue({ data: { data: { project: { _id: 'p3', isTemplate: true } } } });
    renderWithProviders(<ProjectDuplicateModal mode="saveTemplate" source={project()} onDone={() => {}} />);
    expect(await screen.findByDisplayValue('Mẫu — Website')).toBeInTheDocument();
    expect(screen.queryByLabelText('Ngày bắt đầu')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu mẫu' }));
    await waitFor(() => expect(mocks.duplicate).toHaveBeenCalled());
    expect(mocks.duplicate.mock.calls[0][1]).toEqual({ name: 'Mẫu — Website', asTemplate: true });
  });
});

// Bảng và thẻ ở màn Dự án dùng chung cụm nút này. Trước đây thẻ tự vẽ nút riêng nên
// dự án lưu trữ vẫn có nút sửa, và quyền "Chỉ xem" vẫn thấy nút sửa/xóa.
describe('Cụm thao tác của một dự án', () => {
  const EDIT_BUTTONS = ['Quản lý nhóm công việc', 'Chỉnh sửa nhanh', 'Sửa', 'Xóa'];

  it('dự án đang chạy: đủ nút sửa, xóa và menu vòng đời', () => {
    renderWithProviders(<ProjectRowActions project={project()} canManage />);
    for (const name of EDIT_BUTTONS) expect(screen.getByRole('button', { name })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thao tác khác' })).toBeInTheDocument();
  });

  it('dự án lưu trữ: chỉ còn menu vòng đời', () => {
    renderWithProviders(<ProjectRowActions project={project({ isArchived: true })} canManage />);
    for (const name of EDIT_BUTTONS) expect(screen.queryByRole('button', { name })).toBeNull();
    expect(screen.getByRole('button', { name: 'Thao tác khác' })).toBeInTheDocument();
  });

  it('quyền phân hệ "Chỉ xem": không có nút nào', () => {
    const { container } = renderWithProviders(<ProjectRowActions project={project()} canManage={false} />);
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('nút gọi lại với đúng dự án', async () => {
    const onEdit = vi.fn();
    const onQuickEdit = vi.fn();
    renderWithProviders(<ProjectRowActions project={project()} canManage onEdit={onEdit} onQuickEdit={onQuickEdit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sửa' }));
    await userEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa nhanh' }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ _id: 'p1' }));
    expect(onQuickEdit).toHaveBeenCalledWith(expect.objectContaining({ _id: 'p1' }));
  });
});
