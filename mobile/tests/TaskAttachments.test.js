/**
 * Tab "Tệp" trong chi tiết công việc trên mobile.
 *
 * Khóa những gì người dùng thấy và bấm được: danh sách, chọn tệp rồi gửi lên, tệp quá 10 MB bị
 * chặn trước khi gửi, lý do từ chối của server hiện ra, chạm tên tệp thì tải về và mở bảng chia
 * sẻ, chỉ người được phép mới thấy nút xóa, và xóa có hỏi lại.
 */
import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { renderWithTheme } from './helpers';

jest.mock('../src/api/attachmentApi', () => ({
  __esModule: true,
  default: { list: jest.fn(), upload: jest.fn(), download: jest.fn(), remove: jest.fn() },
}));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

import attachmentApi from '../src/api/attachmentApi';
import { useAuth } from '../src/context/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import TaskAttachments from '../src/components/tasks/TaskAttachments';

const ME = { _id: 'u-me', name: 'Nam', role: 'member' };
const PM = { _id: 'u-pm', name: 'Quản lý', role: 'project_manager' };

const file = (id, name, uploader, size = 1536) => ({
  _id: id,
  originalName: name,
  size,
  mimeType: 'application/pdf',
  createdAt: new Date().toISOString(),
  uploadedBy: { _id: uploader, name: uploader === 'u-me' ? 'Nam' : 'Hoa' },
});

const task = (project = {}) => ({ _id: 't1', project: { _id: 'p1', manager: { _id: 'u-pm' }, ...project } });
const asUser = (user, canManage = true) => useAuth.mockReturnValue({ user, canManageModule: () => canManage });
const open = (t = task()) => renderWithTheme(<TaskAttachments task={t} />);

beforeEach(() => {
  asUser(ME);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  attachmentApi.list.mockReset().mockResolvedValue([
    file('a1', 'Báo cáo tuần.pdf', 'u-me'),
    file('a2', 'Ảnh chụp.png', 'u-hoa', 2 * 1024 * 1024),
  ]);
  attachmentApi.upload.mockReset();
  attachmentApi.download.mockReset().mockResolvedValue('file:///cache/Bao-cao.pdf');
  attachmentApi.remove.mockReset().mockResolvedValue({});
  DocumentPicker.getDocumentAsync.mockReset();
  Sharing.isAvailableAsync.mockReset().mockResolvedValue(true);
  Sharing.shareAsync.mockReset().mockResolvedValue();
});

afterEach(() => jest.restoreAllMocks());

test('liệt kê tên, cỡ và người tải lên', async () => {
  open();
  expect(await screen.findByText('Báo cáo tuần.pdf')).toBeTruthy();
  expect(screen.getByText(/1\.5 KB · Nam/)).toBeTruthy();
  expect(screen.getByText(/2\.0 MB · Hoa/)).toBeTruthy();
  expect(attachmentApi.list).toHaveBeenCalledWith('t1');
});

test('chọn tệp rồi gửi lên, tệp mới đứng đầu danh sách', async () => {
  const asset = { uri: 'file:///picked/bien-ban.docx', name: 'Biên bản.docx', size: 2048, mimeType: 'application/msword' };
  DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: false, assets: [asset] });
  attachmentApi.upload.mockResolvedValue(file('a3', 'Biên bản.docx', 'u-me'));
  open();
  await screen.findByText('Báo cáo tuần.pdf');
  fireEvent.press(screen.getByText('Tải tệp lên'));
  await waitFor(() => expect(attachmentApi.upload).toHaveBeenCalledWith('t1', asset));
  const items = await screen.findAllByTestId('attachment-item');
  expect(within(items[0]).getByText('Biên bản.docx')).toBeTruthy();
});

test('hủy hộp chọn tệp thì không gửi gì', async () => {
  DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: true, assets: null });
  open();
  await screen.findByText('Báo cáo tuần.pdf');
  fireEvent.press(screen.getByText('Tải tệp lên'));
  await waitFor(() => expect(DocumentPicker.getDocumentAsync).toHaveBeenCalled());
  expect(attachmentApi.upload).not.toHaveBeenCalled();
});

test('tệp quá 10 MB bị chặn ngay, không gửi lên', async () => {
  DocumentPicker.getDocumentAsync.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///big.zip', name: 'lon.zip', size: 10 * 1024 * 1024 + 1 }],
  });
  open();
  await screen.findByText('Báo cáo tuần.pdf');
  fireEvent.press(screen.getByText('Tải tệp lên'));
  expect(await screen.findByText('Tệp vượt quá 10 MB')).toBeTruthy();
  expect(attachmentApi.upload).not.toHaveBeenCalled();
});

test('server từ chối thì hiện đúng lý do của server', async () => {
  DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///a.svg', name: 'a.svg', size: 10 }] });
  attachmentApi.upload.mockRejectedValue({ response: { data: { message: 'Loại tệp không được hỗ trợ' } } });
  open();
  await screen.findByText('Báo cáo tuần.pdf');
  fireEvent.press(screen.getByText('Tải tệp lên'));
  expect(await screen.findByText('Loại tệp không được hỗ trợ')).toBeTruthy();
});

test('chạm tên tệp: tải về rồi mở bảng chia sẻ', async () => {
  open();
  fireEvent.press(await screen.findByText('Báo cáo tuần.pdf'));
  await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalledWith(
    'file:///cache/Bao-cao.pdf',
    expect.objectContaining({ mimeType: 'application/pdf' })
  ));
  expect(attachmentApi.download).toHaveBeenCalledWith('t1', expect.objectContaining({ _id: 'a1' }));
});

test('thành viên chỉ xóa được tệp của mình, có hỏi lại trước khi xóa', async () => {
  open();
  await screen.findByText('Báo cáo tuần.pdf');
  const [mine, others] = screen.getAllByTestId('attachment-item');
  expect(within(others).queryByLabelText(/^Xóa /)).toBeNull();
  fireEvent.press(within(mine).getByLabelText('Xóa Báo cáo tuần.pdf'));
  expect(attachmentApi.remove).not.toHaveBeenCalled();
  const buttons = Alert.alert.mock.calls[0][2];
  buttons.find((b) => b.style === 'destructive').onPress();
  await waitFor(() => expect(attachmentApi.remove).toHaveBeenCalledWith('t1', 'a1'));
  await waitFor(() => expect(screen.queryByText('Báo cáo tuần.pdf')).toBeNull());
});

test('quản lý dự án xóa được mọi tệp', async () => {
  asUser(PM);
  open();
  await screen.findByText('Báo cáo tuần.pdf');
  expect(screen.getByLabelText('Xóa Báo cáo tuần.pdf')).toBeTruthy();
  expect(screen.getByLabelText('Xóa Ảnh chụp.png')).toBeTruthy();
});

test('dự án lưu trữ: chỉ xem và tải về', async () => {
  open(task({ isArchived: true }));
  await screen.findByText('Báo cáo tuần.pdf');
  expect(screen.queryByText('Tải tệp lên')).toBeNull();
  expect(screen.queryByLabelText(/^Xóa /)).toBeNull();
  expect(screen.getByText(/Dự án đã lưu trữ/)).toBeTruthy();
});

test('quyền "Chỉ xem" ở phân hệ Công việc: không tải lên, không xóa', async () => {
  asUser(ME, false);
  open();
  await screen.findByText('Báo cáo tuần.pdf');
  expect(screen.queryByText('Tải tệp lên')).toBeNull();
  expect(screen.queryByLabelText(/^Xóa /)).toBeNull();
});

test('chưa có tệp thì nói rõ', async () => {
  attachmentApi.list.mockResolvedValue([]);
  open();
  expect(await screen.findByText('Chưa có tệp đính kèm')).toBeTruthy();
});
