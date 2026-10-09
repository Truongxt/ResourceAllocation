/**
 * Màn chi tiết công việc: tab "Tệp" có mặt và nối đúng vào danh sách tệp của việc đang mở.
 * Phần bên trong tab được khóa ở TaskAttachments.test.js.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
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
