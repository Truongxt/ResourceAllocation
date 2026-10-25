/**
 * Tạo công việc trên mobile ở dự án có trường tùy chỉnh.
 *
 * Trước bản này mobile không có ô nào cho trường tùy chỉnh, nên dự án có trường bắt buộc thì tạo
 * việc trên điện thoại luôn bị server từ chối. Màn Lịch và chi tiết dự án dùng cùng component và
 * cùng hàm chuyển đổi (utils/customFieldInputs.js), nối y hệt.
 */
import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithTheme } from './helpers';

jest.mock('../src/api/taskApi', () => ({
  __esModule: true,
  default: { getAllPages: jest.fn(), create: jest.fn(), updateStatus: jest.fn() },
}));
jest.mock('../src/api/projectApi', () => ({ __esModule: true, default: { getAll: jest.fn() } }));
jest.mock('../src/api/taskGroupApi', () => ({ __esModule: true, default: { getByProject: jest.fn() } }));
const mockAuth = { user: { _id: 'u-me', role: 'member' } };
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: mockAuth.user, canManageModule: () => true }),
}));

import taskApi from '../src/api/taskApi';
import projectApi from '../src/api/projectApi';
import taskGroupApi from '../src/api/taskGroupApi';
import TasksScreen from '../src/screens/tasks/TasksScreen';

// Người dùng là thành viên của hai dự án (dự án để mặc định: thành viên được tạo việc).
const ME = [{ user: { _id: 'u-me' }, role: 'developer' }];
const MARKETING = {
  _id: 'p1',
  name: 'Marketing',
  manager: { _id: 'u-pm' },
  members: ME,
  customFields: [
    { key: 'f_aaaaaaaa', name: 'Kênh', type: 'select', options: ['Facebook', 'TikTok'], required: true, order: 0 },
    { key: 'f_bbbbbbbb', name: 'Ngày lên sóng', type: 'date', order: 1 },
  ],
};
const PLAIN = { _id: 'p2', name: 'Nội bộ', manager: { _id: 'u-pm' }, members: ME };
const OUTSIDE = { _id: 'p3', name: 'Dự án ngoài', manager: { _id: 'u-pm' }, members: [] };

let alert;
beforeEach(() => {
  mockAuth.user = { _id: 'u-me', role: 'member' };
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  taskApi.getAllPages.mockReset().mockResolvedValue({ tasks: [], total: 0 });
  taskApi.create.mockReset().mockResolvedValue({ data: { success: true } });
  projectApi.getAll.mockReset().mockResolvedValue({ data: { data: { projects: [MARKETING, PLAIN] } } });
  taskGroupApi.getByProject.mockReset().mockResolvedValue({ data: { data: { taskGroups: [] } } });
});
afterEach(() => alert.mockRestore());

const openCreate = async () => {
  renderWithTheme(<TasksScreen navigation={{ navigate: jest.fn() }} />);
  await waitFor(() => expect(projectApi.getAll).toHaveBeenCalled());
  fireEvent.press(await screen.findByLabelText('Tạo công việc mới'));
  fireEvent.changeText(screen.getByPlaceholderText('VD: Thiết kế cơ sở dữ liệu'), 'Chiến dịch tháng 12');
};

test('chọn dự án có trường thì hiện ô; điền đủ thì gửi kèm customValues', async () => {
  await openCreate();
  expect(screen.queryByTestId('custom-field-inputs')).toBeNull();
  fireEvent.press(screen.getByText('Marketing'));
  expect(screen.getByTestId('custom-field-inputs')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Kênh: TikTok'));
  fireEvent.changeText(screen.getByLabelText('Ngày lên sóng'), '20/12/2026');
  fireEvent.press(screen.getByText('Tạo công việc'));
  await waitFor(() => expect(taskApi.create).toHaveBeenCalled());
  expect(taskApi.create.mock.calls[0][0]).toMatchObject({
    title: 'Chiến dịch tháng 12',
    project: 'p1',
    customValues: { f_aaaaaaaa: 'TikTok', f_bbbbbbbb: '2026-12-20' },
  });
});

test('thiếu trường bắt buộc thì báo ngay, không gửi', async () => {
  await openCreate();
  fireEvent.press(screen.getByText('Marketing'));
  fireEvent.press(screen.getByText('Tạo công việc'));
  expect(alert).toHaveBeenCalledWith('Thông báo', 'Chưa điền "Kênh"');
  expect(taskApi.create).not.toHaveBeenCalled();
});

test('đổi sang dự án không có trường thì bỏ giá trị đã điền, không gửi customValues', async () => {
  await openCreate();
  fireEvent.press(screen.getByText('Marketing'));
  fireEvent.press(screen.getByLabelText('Kênh: TikTok'));
  fireEvent.press(screen.getByText('Nội bộ'));
  expect(screen.queryByTestId('custom-field-inputs')).toBeNull();
  fireEvent.press(screen.getByText('Tạo công việc'));
  await waitFor(() => expect(taskApi.create).toHaveBeenCalled());
  expect(taskApi.create.mock.calls[0][0]).not.toHaveProperty('customValues');
  expect(taskApi.create.mock.calls[0][0].project).toBe('p2');
});

// ── Chỉ hiện thao tác thuộc quyền (utils/projectAccess.js, utils/taskPermissions.js) ──
const task = (id, assignee, status = 'todo') => ({
  _id: id, title: `Việc ${id}`, status, priority: 'medium',
  assignee: { _id: assignee, name: assignee }, createdBy: 'u-pm',
  project: { _id: 'p2', name: 'Nội bộ', manager: 'u-pm', members: ME, permissions: {} },
});

test('không tạo được việc ở dự án nào thì không có nút tạo', async () => {
  projectApi.getAll.mockResolvedValue({ data: { data: { projects: [OUTSIDE] } } });
  renderWithTheme(<TasksScreen navigation={{ navigate: jest.fn() }} />);
  await waitFor(() => expect(projectApi.getAll).toHaveBeenCalled());
  await waitFor(() => expect(taskApi.getAllPages).toHaveBeenCalled());
  expect(screen.queryByLabelText('Tạo công việc mới')).toBeNull();
});

test('form tạo chỉ liệt kê dự án người dùng tạo việc được', async () => {
  projectApi.getAll.mockResolvedValue({ data: { data: { projects: [PLAIN, OUTSIDE] } } });
  await openCreate();
  expect(screen.getByText('Nội bộ')).toBeTruthy();
  expect(screen.queryByText('Dự án ngoài')).toBeNull();
});

test('nút chuyển trạng thái nhanh chỉ có trên việc của mình', async () => {
  taskApi.getAllPages.mockResolvedValue({ tasks: [task('t1', 'u-me'), task('t2', 'u-other')], total: 2 });
  renderWithTheme(<TasksScreen navigation={{ navigate: jest.fn() }} />);
  await screen.findByText('Việc t2');
  expect(screen.getAllByText('Bắt đầu làm ➔')).toHaveLength(1);
});

test('dạng danh sách: chạm nhãn trạng thái của việc mình thì chuyển sang bước kế tiếp', async () => {
  taskApi.updateStatus.mockReset().mockResolvedValue({ data: { success: true } });
  taskApi.getAllPages.mockResolvedValue({ tasks: [task('t1', 'u-me')], total: 1 });
  renderWithTheme(<TasksScreen navigation={{ navigate: jest.fn() }} />);
  fireEvent.press(await screen.findByLabelText('Xem dạng danh sách'));
  fireEvent.press(await screen.findByLabelText('Chuyển sang bước kế tiếp: Việc t1'));
  await waitFor(() => expect(taskApi.updateStatus).toHaveBeenCalledWith('t1', 'in_progress'));
});
