import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers.jsx';

const state = vi.hoisted(() => ({
  list: vi.fn(),
  upload: vi.fn(),
  download: vi.fn(),
  remove: vi.fn(),
  user: null,
  canManage: true,
}));

vi.mock('../src/services/attachmentService', () => ({
  default: { list: state.list, upload: state.upload, download: state.download, remove: state.remove },
}));
vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: state.user, canManageModule: () => state.canManage }),
}));

const { default: TaskAttachments } = await import('../src/components/tasks/TaskAttachments');

const ME = { _id: 'u-me', name: 'Nam', role: 'member' };
const PM = { _id: 'u-pm', name: 'Quản lý', role: 'project_manager' };

const file = (id, name, uploader, size = 1536) => ({
  _id: id,
  originalName: name,
  size,
  createdAt: new Date().toISOString(),
  uploadedBy: { _id: uploader, name: uploader === 'u-me' ? 'Nam' : 'Hoa' },
});

const task = (project = {}) => ({ _id: 't1', title: 'Việc', project: { _id: 'p1', manager: { _id: 'u-pm' }, ...project } });
const open = (t = task()) => renderWithProviders(<TaskAttachments task={t} />);

beforeEach(() => {
  state.user = ME;
  state.canManage = true;
  state.list.mockReset().mockResolvedValue([file('a1', 'Báo cáo tuần.pdf', 'u-me'), file('a2', 'Ảnh chụp.png', 'u-hoa', 2 * 1024 * 1024)]);
  state.upload.mockReset();
  state.download.mockReset().mockResolvedValue();
  state.remove.mockReset().mockResolvedValue();
});

describe('Tệp đính kèm của công việc', () => {
  it('liệt kê tên, cỡ và người tải lên', async () => {
    open();
    expect(await screen.findByText('Báo cáo tuần.pdf')).toBeInTheDocument();
    expect(screen.getByText(/1\.5 KB · Nam/)).toBeInTheDocument();
    expect(screen.getByText(/2\.0 MB · Hoa/)).toBeInTheDocument();
    expect(state.list).toHaveBeenCalledWith('t1');
  });

  it('tải lên: gửi tệp đã chọn và thêm vào đầu danh sách', async () => {
    state.upload.mockResolvedValue(file('a3', 'Biên bản.docx', 'u-me'));
    open();
    await screen.findByText('Báo cáo tuần.pdf');
    const picked = new File(['nội dung'], 'Biên bản.docx');
    await userEvent.upload(screen.getByTestId('attachment-input'), picked);
    await waitFor(() => expect(state.upload).toHaveBeenCalledWith('t1', picked));
    const items = await screen.findAllByTestId('attachment-item');
    expect(within(items[0]).getByText('Biên bản.docx')).toBeInTheDocument();
  });

  it('tệp quá 10 MB bị chặn ngay, không gửi lên', async () => {
    open();
    await screen.findByText('Báo cáo tuần.pdf');
    const big = new File(['x'], 'lon.zip');
    Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 });
    await userEvent.upload(screen.getByTestId('attachment-input'), big);
    expect(await screen.findByText('Tệp vượt quá 10 MB')).toBeInTheDocument();
    expect(state.upload).not.toHaveBeenCalled();
  });

  it('server từ chối thì hiện đúng lý do của server', async () => {
    state.upload.mockRejectedValue({ response: { data: { message: 'Loại tệp không được hỗ trợ' } } });
    open();
    await screen.findByText('Báo cáo tuần.pdf');
    await userEvent.upload(screen.getByTestId('attachment-input'), new File(['x'], 'a.pdf'));
    expect(await screen.findByText('Loại tệp không được hỗ trợ')).toBeInTheDocument();
  });

  it('bấm tên tệp thì tải về', async () => {
    open();
    await userEvent.click(await screen.findByText('Báo cáo tuần.pdf'));
    expect(state.download).toHaveBeenCalledWith('t1', expect.objectContaining({ _id: 'a1' }));
  });

  it('thành viên chỉ xóa được tệp của mình, có hỏi lại trước khi xóa', async () => {
    open();
    await screen.findByText('Báo cáo tuần.pdf');
    const [mine, others] = screen.getAllByTestId('attachment-item');
    expect(within(others).queryByRole('button', { name: /xóa/i })).toBeNull();
    await userEvent.click(within(mine).getByRole('button', { name: /xóa/i }));
    await userEvent.click(await screen.findByRole('button', { name: 'Xóa tệp' }));
    await waitFor(() => expect(state.remove).toHaveBeenCalledWith('t1', 'a1'));
    await waitFor(() => expect(screen.queryByText('Báo cáo tuần.pdf')).toBeNull());
  });

  it('quản lý dự án xóa được mọi tệp', async () => {
    state.user = PM;
    open();
    await screen.findByText('Báo cáo tuần.pdf');
    screen.getAllByTestId('attachment-item').forEach((item) => {
      expect(within(item).getByRole('button', { name: /xóa/i })).toBeInTheDocument();
    });
  });

  it('dự án lưu trữ: chỉ xem và tải về', async () => {
    open(task({ isArchived: true }));
    await screen.findByText('Báo cáo tuần.pdf');
    expect(screen.queryByTestId('attachment-input')).toBeNull();
    expect(screen.queryByRole('button', { name: /xóa/i })).toBeNull();
    expect(screen.getByText(/Dự án đã lưu trữ/)).toBeInTheDocument();
  });

  it('quyền "Chỉ xem" ở phân hệ Công việc: không tải lên, không xóa', async () => {
    state.canManage = false;
    open();
    await screen.findByText('Báo cáo tuần.pdf');
    expect(screen.queryByTestId('attachment-input')).toBeNull();
    expect(screen.queryByRole('button', { name: /xóa/i })).toBeNull();
  });

  it('chưa có tệp thì nói rõ', async () => {
    state.list.mockResolvedValue([]);
    open();
    expect(await screen.findByText('Chưa có tệp đính kèm')).toBeInTheDocument();
  });
});
