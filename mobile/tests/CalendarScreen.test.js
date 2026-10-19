/**
 * Màn Lịch chỉ hiện thao tác thuộc quyền — luật dùng chung với web (utils/projectAccess.js,
 * utils/taskPermissions.js), khớp server. Trước bản này ai mở lịch cũng thấy nút "Thêm việc" và
 * nút chuyển trạng thái trên mọi việc, bấm vào thì nhận 403.
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import dayjs from 'dayjs';
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
import CalendarScreen from '../src/screens/calendar/CalendarScreen';

const ME = [{ user: { _id: 'u-me' }, role: 'developer' }];
const MINE = { _id: 'p1', name: 'Nội bộ', manager: { _id: 'u-pm' }, members: ME };
const OUTSIDE = { _id: 'p2', name: 'Dự án ngoài', manager: { _id: 'u-pm' }, members: [] };

const today = dayjs();
const task = (id, assignee) => ({
  _id: id, title: `Việc ${id}`, status: 'todo', priority: 'medium',
  startDate: today.subtract(1, 'day').toISOString(), endDate: today.add(1, 'day').toISOString(),
  assignee: { _id: assignee, name: assignee }, createdBy: 'u-pm',
  project: { _id: 'p1', name: 'Nội bộ', manager: 'u-pm', members: ME, permissions: {} },
});

beforeEach(() => {
  taskApi.getAllPages.mockReset().mockResolvedValue({ tasks: [task('t1', 'u-me'), task('t2', 'u-other')], total: 2 });
  projectApi.getAll.mockReset().mockResolvedValue({ data: { data: { projects: [MINE] } } });
  taskGroupApi.getByProject.mockReset().mockResolvedValue({ data: { data: { taskGroups: [] } } });
});

const open = () => renderWithTheme(<CalendarScreen navigation={{ navigate: jest.fn() }} />);

test('nút chuyển trạng thái chỉ có trên việc của mình', async () => {
  open();
  await screen.findByText('Việc t2');
  expect(screen.getAllByText('Bắt đầu làm ➔')).toHaveLength(1);
});

test('có dự án tạo việc được thì có nút "Thêm việc"', async () => {
  open();
  expect(await screen.findByText('Thêm việc')).toBeTruthy();
});

test('không tạo được việc ở dự án nào thì không có nút "Thêm việc"', async () => {
  projectApi.getAll.mockResolvedValue({ data: { data: { projects: [OUTSIDE] } } });
  open();
  await screen.findByText('Việc t2');
  await waitFor(() => expect(projectApi.getAll).toHaveBeenCalled());
  expect(screen.queryByText('Thêm việc')).toBeNull();
});
