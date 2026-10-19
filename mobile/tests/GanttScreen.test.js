/**
 * Màn Gantt trên mobile (chỉ xem).
 *
 * Khóa những thứ người dùng thấy được: mỗi việc có lịch một thanh, việc thiếu ngày không biến
 * mất, chạm thanh mở đúng việc, đường găng tô đúng việc và báo khi phụ thuộc vòng tròn, lọc
 * theo dự án gọi API với đúng tham số.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithTheme } from './helpers';

jest.mock('../src/api/taskApi', () => ({ __esModule: true, default: { getAllPages: jest.fn() } }));
jest.mock('../src/api/projectApi', () => ({ __esModule: true, default: { getAll: jest.fn() } }));

import taskApi from '../src/api/taskApi';
import projectApi from '../src/api/projectApi';
import GanttScreen from '../src/screens/gantt/GanttScreen';

const day = (d) => new Date(2026, 2, d, 9).toISOString();
const A = { _id: 'A', title: 'Thiết kế', status: 'done', startDate: day(5), endDate: day(8) };
const B = { _id: 'B', title: 'Lập trình', status: 'in_progress', startDate: day(10), endDate: day(12), dependencies: ['A'] };
const C = { _id: 'C', title: 'Viết tài liệu', status: 'todo', startDate: day(5), endDate: day(6) };
const U = { _id: 'U', title: 'Chưa xếp', status: 'todo', startDate: null, endDate: null };

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const open = (params = {}) => renderWithTheme(<GanttScreen navigation={navigation} route={{ params }} />);

beforeEach(() => {
  navigation.navigate.mockReset();
  taskApi.getAllPages.mockReset().mockResolvedValue({ tasks: [A, B, C, U], total: 4 });
  projectApi.getAll.mockReset().mockResolvedValue({
    data: { data: { projects: [{ _id: 'p1', name: 'Website' }, { _id: 'p2', name: 'App' }] } },
  });
});

test('mỗi việc có lịch một thanh; việc thiếu ngày được đếm riêng', async () => {
  open();
  expect(await screen.findByTestId('gantt-bar-A')).toBeTruthy();
  expect(screen.getByTestId('gantt-bar-B')).toBeTruthy();
  expect(screen.getByTestId('gantt-bar-C')).toBeTruthy();
  expect(screen.queryByTestId('gantt-bar-U')).toBeNull();
  expect(screen.getByText('Chưa có lịch (1)')).toBeTruthy();
  expect(screen.getByText('Chưa xếp')).toBeTruthy();
});

test('chạm thanh mở chi tiết đúng việc', async () => {
  open();
  fireEvent.press(await screen.findByTestId('gantt-bar-B'));
  expect(navigation.navigate).toHaveBeenCalledWith('TaskDetail', { taskId: 'B', title: 'Lập trình' });
});

test('thu phóng đổi độ rộng thanh', async () => {
  open();
  const bar = await screen.findByTestId('gantt-bar-A'); // 3 ngày
  expect(bar).toHaveStyle({ width: 96 }); // mặc định: Ngày, 32px/ngày
  fireEvent.press(screen.getByText('Tuần'));
  expect(screen.getByTestId('gantt-bar-A')).toHaveStyle({ width: 36 }); // 12px/ngày
});

test('bật đường găng: tóm tắt và đúng việc được đánh dấu', async () => {
  open();
  await screen.findByTestId('gantt-bar-A');
  expect(screen.queryByText(/Đường găng: /)).toBeNull();
  fireEvent.press(screen.getByText('Đường găng'));
  expect(screen.getByText('Đường găng: 2 việc, 5 ngày')).toBeTruthy();
  expect(screen.getByTestId('gantt-bar-A').props.accessibilityLabel).toMatch(/đường găng/);
  expect(screen.getByTestId('gantt-bar-C').props.accessibilityLabel).not.toMatch(/đường găng/);
});

test('phụ thuộc vòng tròn: báo, không treo', async () => {
  taskApi.getAllPages.mockResolvedValue({
    tasks: [{ ...A, dependencies: ['B'] }, B],
    total: 2,
  });
  open();
  await screen.findByTestId('gantt-bar-A');
  fireEvent.press(screen.getByText('Đường găng'));
  expect(screen.getByText(/vòng tròn/)).toBeTruthy();
});

test('mở từ dự án thì chỉ tải việc của dự án đó; chọn dự án khác thì tải lại', async () => {
  open({ projectId: 'p1' });
  await screen.findByTestId('gantt-bar-A');
  expect(taskApi.getAllPages).toHaveBeenLastCalledWith({ project: 'p1' });

  fireEvent.press(await screen.findByText('App'));
  await waitFor(() => expect(taskApi.getAllPages).toHaveBeenLastCalledWith({ project: 'p2' }));
  fireEvent.press(screen.getByText('Tất cả'));
  await waitFor(() => expect(taskApi.getAllPages).toHaveBeenLastCalledWith({}));
});

test('không có việc nào: hiện trạng thái trống', async () => {
  taskApi.getAllPages.mockResolvedValue({ tasks: [], total: 0 });
  open();
  expect(await screen.findByText('Chưa có công việc nào')).toBeTruthy();
});
