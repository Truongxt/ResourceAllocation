/**
 * Màn chi tiết công việc: tab "Tệp" có mặt và nối đúng vào danh sách tệp của việc đang mở (phần
 * bên trong tab được khóa ở TaskAttachments.test.js); tab Thông tin hiện và sửa được giá trị trường
 * tùy chỉnh.
 */
import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { renderWithTheme } from './helpers';

jest.mock('../src/api/taskApi', () => ({ __esModule: true, default: { getById: jest.fn(), update: jest.fn() } }));
jest.mock('../src/api/attachmentApi', () => ({
  __esModule: true,
  default: { list: jest.fn(), upload: jest.fn(), download: jest.fn(), remove: jest.fn() },
}));
const mockAuth = { canManage: true };
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'u-me', role: 'member' }, canManageModule: () => mockAuth.canManage }),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

import taskApi from '../src/api/taskApi';
import attachmentApi from '../src/api/attachmentApi';
import TaskDetailScreen from '../src/screens/tasks/TaskDetailScreen';

const TASK = {
  _id: 't1',
  title: 'Xây dựng API',
  status: 'in_progress',
  priority: 'high',
  project: { _id: 'p1', name: 'Web', manager: { _id: 'u-pm' } },
  comments: [],
  checklist: [],
};

beforeEach(() => {
  mockAuth.canManage = true;
  taskApi.update.mockReset().mockResolvedValue({ data: { success: true } });
  taskApi.getById.mockReset().mockResolvedValue({ data: { data: { task: TASK } } });
  attachmentApi.list.mockReset().mockResolvedValue([
    { _id: 'a1', originalName: 'Đặc tả.pdf', size: 2048, createdAt: new Date().toISOString(), uploadedBy: { _id: 'u-me', name: 'Nam' } },
  ]);
});

test('tab Tệp mở danh sách tệp của đúng công việc', async () => {
  renderWithTheme(<TaskDetailScreen route={{ params: { taskId: 't1', title: 'Xây dựng API' } }} navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);
  fireEvent.press(await screen.findByText(/^Tệp/));
  expect(await screen.findByText('Đặc tả.pdf')).toBeTruthy();
  expect(attachmentApi.list).toHaveBeenCalledWith('t1');
});

test('chưa mở tab thì chưa gọi danh sách tệp', async () => {
  renderWithTheme(<TaskDetailScreen route={{ params: { taskId: 't1', title: 'Xây dựng API' } }} navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);
  await screen.findByText(/^Tệp/);
  expect(attachmentApi.list).not.toHaveBeenCalled();
});

test('tab Thông tin hiện giá trị trường tùy chỉnh của dự án, theo thứ tự', async () => {
  taskApi.getById.mockResolvedValue({
    data: {
      data: {
        task: {
          ...TASK,
          project: {
            ...TASK.project,
            customFields: [
              { key: 'f_bbbbbbbb', name: 'Ngân sách', type: 'number', order: 1 },
              { key: 'f_aaaaaaaa', name: 'Kênh', type: 'select', options: ['TikTok'], order: 0 },
              { key: 'f_cccccccc', name: 'Ngày phát hành', type: 'date', order: 2 },
            ],
          },
          customValues: { f_aaaaaaaa: 'TikTok', f_bbbbbbbb: 15000000 },
        },
      },
    },
  });
  renderWithTheme(<TaskDetailScreen route={{ params: { taskId: 't1', title: 'Xây dựng API' } }} navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);
  const card = await screen.findByTestId('task-custom-values');
  const texts = within(card).getAllByText(/.+/).map((n) => n.props.children).flat().join('|');
  expect(texts).toBe('Sửa|Kênh|:|TikTok|Ngân sách|:|15.000.000|Ngày phát hành|:|—');
});

test('dự án không có trường tùy chỉnh thì không có thẻ đó', async () => {
  renderWithTheme(<TaskDetailScreen route={{ params: { taskId: 't1', title: 'Xây dựng API' } }} navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);
  await screen.findByText(/^Tệp/);
  expect(screen.queryByTestId('task-custom-values')).toBeNull();
});

const CUSTOM_TASK = {
  ...TASK,
  project: {
    ...TASK.project,
    customFields: [
      { key: 'f_aaaaaaaa', name: 'Kênh', type: 'select', options: ['Facebook', 'TikTok'], required: true, order: 0 },
      { key: 'f_bbbbbbbb', name: 'Ngân sách', type: 'number', order: 1 },
    ],
  },
  customValues: { f_aaaaaaaa: 'TikTok', f_bbbbbbbb: 1500 },
};
const openDetail = () => renderWithTheme(<TaskDetailScreen route={{ params: { taskId: 't1', title: 'Xây dựng API' } }} navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

test('sửa trường tùy chỉnh: ô điền sẵn giá trị cũ, lưu gửi customValues rồi tải lại việc', async () => {
  taskApi.getById.mockResolvedValue({ data: { data: { task: CUSTOM_TASK } } });
  openDetail();
  fireEvent.press(await screen.findByLabelText('Sửa trường tùy chỉnh'));
  expect(screen.getByLabelText('Ngân sách').props.value).toBe('1500');
  expect(screen.getByLabelText('Kênh: TikTok').props.accessibilityState).toMatchObject({ selected: true });
  fireEvent.press(screen.getByLabelText('Kênh: Facebook'));
  fireEvent.changeText(screen.getByLabelText('Ngân sách'), '2.000.000');
  fireEvent.press(screen.getByText('Lưu'));
  await waitFor(() => expect(taskApi.update).toHaveBeenCalledWith('t1', { customValues: { f_aaaaaaaa: 'Facebook', f_bbbbbbbb: 2000000 } }));
  await waitFor(() => expect(taskApi.getById).toHaveBeenCalledTimes(2));
});

test('bỏ trống trường bắt buộc thì báo ngay, không gửi', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  taskApi.getById.mockResolvedValue({ data: { data: { task: CUSTOM_TASK } } });
  openDetail();
  fireEvent.press(await screen.findByLabelText('Sửa trường tùy chỉnh'));
  fireEvent.press(screen.getByLabelText('Kênh: TikTok')); // chạm lại lựa chọn đang chọn = bỏ chọn
  fireEvent.press(screen.getByText('Lưu'));
  expect(alert).toHaveBeenCalledWith('Thông báo', 'Chưa điền "Kênh"');
  expect(taskApi.update).not.toHaveBeenCalled();
  alert.mockRestore();
});

test('chỉ có quyền xem, hoặc dự án lưu trữ: không có nút Sửa', async () => {
  mockAuth.canManage = false;
  taskApi.getById.mockResolvedValue({ data: { data: { task: CUSTOM_TASK } } });
  const first = openDetail();
  await screen.findByTestId('task-custom-values');
  expect(screen.queryByLabelText('Sửa trường tùy chỉnh')).toBeNull();
  first.unmount();

  mockAuth.canManage = true;
  taskApi.getById.mockResolvedValue({ data: { data: { task: { ...CUSTOM_TASK, project: { ...CUSTOM_TASK.project, isArchived: true } } } } });
  openDetail();
  await screen.findByTestId('task-custom-values');
  expect(screen.queryByLabelText('Sửa trường tùy chỉnh')).toBeNull();
});
