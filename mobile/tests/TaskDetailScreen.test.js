/**
 * Màn chi tiết công việc: tab "Tệp" có mặt và nối đúng vào danh sách tệp của việc đang mở (phần
 * bên trong tab được khóa ở TaskAttachments.test.js); tab Thông tin hiện giá trị trường tùy chỉnh.
 */
import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { renderWithTheme } from './helpers';

jest.mock('../src/api/taskApi', () => ({ __esModule: true, default: { getById: jest.fn() } }));
jest.mock('../src/api/attachmentApi', () => ({
  __esModule: true,
  default: { list: jest.fn(), upload: jest.fn(), download: jest.fn(), remove: jest.fn() },
}));
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'u-me', role: 'member' }, canManageModule: () => true }),
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
  expect(texts).toBe('Kênh|:|TikTok|Ngân sách|:|15.000.000|Ngày phát hành|:|—');
});

test('dự án không có trường tùy chỉnh thì không có thẻ đó', async () => {
  renderWithTheme(<TaskDetailScreen route={{ params: { taskId: 't1', title: 'Xây dựng API' } }} navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);
  await screen.findByText(/^Tệp/);
  expect(screen.queryByTestId('task-custom-values')).toBeNull();
});
