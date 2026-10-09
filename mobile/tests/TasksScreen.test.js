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
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'u-me', role: 'member' }, canManageModule: () => true }),
}));

import taskApi from '../src/api/taskApi';
import projectApi from '../src/api/projectApi';
import taskGroupApi from '../src/api/taskGroupApi';
import TasksScreen from '../src/screens/tasks/TasksScreen';

const MARKETING = {
  _id: 'p1',
  name: 'Marketing',
  customFields: [
    { key: 'f_aaaaaaaa', name: 'Kênh', type: 'select', options: ['Facebook', 'TikTok'], required: true, order: 0 },
    { key: 'f_bbbbbbbb', name: 'Ngày lên sóng', type: 'date', order: 1 },
  ],
};
const PLAIN = { _id: 'p2', name: 'Nội bộ' };

let alert;
beforeEach(() => {
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
