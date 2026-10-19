/**
 * Màn Tối ưu hóa trên mobile.
 *
 * Trước bản này màn gọi `POST /optimization/run` — route không tồn tại, nên chưa lần nào chạy
 * được — và luôn chạy trên toàn công ty, trong khi PM chỉ được chạy trên dự án mình quản lý.
 * Khóa: phạm vi dự án theo vai trò, đúng endpoint và tham số, và các con số hiển thị đúng thang
 * server trả về (độ khớp kỹ năng đã là 0–100).
 */
import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithTheme } from './helpers';

jest.mock('../src/api/optimizationApi', () => ({
  __esModule: true,
  default: { run: jest.fn(), getHistory: jest.fn(), apply: jest.fn() },
}));
jest.mock('../src/api/projectApi', () => ({ __esModule: true, default: { getAll: jest.fn() } }));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));

import optimizationApi from '../src/api/optimizationApi';
import projectApi from '../src/api/projectApi';
import { useAuth } from '../src/context/AuthContext';
import OptimizationScreen from '../src/screens/optimization/OptimizationScreen';

const PM = { _id: 'u-pm', role: 'project_manager' };
const ADMIN = { _id: 'u-admin', role: 'admin' };

// Thứ tự như server trả (mới nhất trước): dự án đầu của PM không còn việc mở.
const PROJECTS = [
  { _id: 'p-empty', code: 'MOB', name: 'App', manager: { _id: 'u-pm' }, taskStats: { openTasks: 0 } },
  { _id: 'p-other', code: 'HR', name: 'Nhân sự', manager: { _id: 'u-other' }, taskStats: { openTasks: 4 } },
  { _id: 'p-open', code: 'ECOM', name: 'Web bán hàng', manager: 'u-pm', taskStats: { openTasks: 3 } },
];

const RESULT = {
  _id: 'r1',
  status: 'completed',
  fitness: 0.8531,
  executionTime: 140,
  metrics: { averageSkillMatch: 72 },
  assignments: [{ taskTitle: 'Thiết kế', resourceName: 'Lan', skillMatch: 85 }],
};

const asUser = (user) => useAuth.mockReturnValue({ user, canManageModule: () => true });
const open = () => renderWithTheme(<OptimizationScreen />);

beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  projectApi.getAll.mockReset().mockResolvedValue({ data: { data: { projects: PROJECTS } } });
  optimizationApi.run.mockReset().mockResolvedValue({ data: { success: true, data: { result: RESULT } } });
  optimizationApi.getHistory.mockReset().mockResolvedValue({ data: { data: { results: [] } } });
  optimizationApi.apply.mockReset().mockResolvedValue({ data: { success: true } });
});

afterEach(() => jest.restoreAllMocks());

test('PM: chỉ dự án mình quản lý, không có "Tất cả dự án", chọn sẵn dự án còn việc mở', async () => {
  asUser(PM);
  open();
  expect(await screen.findByText('ECOM · Web bán hàng')).toBeTruthy();
  expect(screen.getByText('MOB · App')).toBeTruthy();
  expect(screen.queryByText('HR · Nhân sự')).toBeNull();
  expect(screen.queryByText('Tất cả dự án')).toBeNull();
  expect(screen.getByTestId('optimize-project-p-open').props.accessibilityState).toMatchObject({ selected: true });
  expect(projectApi.getAll).toHaveBeenCalledWith({ limit: 100 });
});

test('PM chạy: gọi đúng thuật toán, kèm dự án đang chọn', async () => {
  asUser(PM);
  open();
  await screen.findByText('ECOM · Web bán hàng');
  fireEvent.press(screen.getByText('CSP Solver'));
  fireEvent.press(screen.getByText('⚡ Bắt đầu Tối ưu hóa'));
  await waitFor(() => expect(optimizationApi.run).toHaveBeenCalled());
  const [algorithm, params] = optimizationApi.run.mock.calls[0];
  expect(algorithm).toBe('csp');
  expect(params).toMatchObject({ projectId: 'p-open', workloadWeight: 0.5, skillWeight: 0.3, overallocationWeight: 0.2 });
});

test('PM chưa quản lý dự án nào: báo rõ, không có nút chạy', async () => {
  asUser(PM);
  projectApi.getAll.mockResolvedValue({ data: { data: { projects: [PROJECTS[1]] } } });
  open();
  expect(await screen.findByText(/chưa quản lý dự án nào/)).toBeTruthy();
  expect(screen.queryByText('⚡ Bắt đầu Tối ưu hóa')).toBeNull();
});

test('Admin: mặc định "Tất cả dự án" và chạy không kèm dự án', async () => {
  asUser(ADMIN);
  open();
  expect(await screen.findByText('HR · Nhân sự')).toBeTruthy();
  expect(screen.getByTestId('optimize-project-all').props.accessibilityState).toMatchObject({ selected: true });
  fireEvent.press(screen.getByText('⚡ Bắt đầu Tối ưu hóa'));
  await waitFor(() => expect(optimizationApi.run).toHaveBeenCalled());
  expect(optimizationApi.run.mock.calls[0][0]).toBe('genetic');
  expect(optimizationApi.run.mock.calls[0][1].projectId).toBeUndefined();
});

test('kết quả: số đúng thang server, không có số bịa', async () => {
  asUser(ADMIN);
  open();
  await screen.findByText('HR · Nhân sự');
  fireEvent.press(screen.getByText('⚡ Bắt đầu Tối ưu hóa'));
  expect(await screen.findByText('Khớp 85%')).toBeTruthy();
  expect(screen.getByText('72%')).toBeTruthy();
  expect(screen.getByText('0.8531')).toBeTruthy();
  expect(screen.getByText('140ms')).toBeTruthy();
});

test('thuật toán không xếp được: cảnh báo kèm lý do, không báo thành công', async () => {
  asUser(ADMIN);
  optimizationApi.run.mockResolvedValue({
    data: { success: true, data: { result: { ...RESULT, status: 'failed', errorMessage: 'Không ai đủ kỹ năng', assignments: [] } } },
  });
  open();
  await screen.findByText('HR · Nhân sự');
  fireEvent.press(screen.getByText('⚡ Bắt đầu Tối ưu hóa'));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
  expect(Alert.alert).toHaveBeenCalledWith('Không tìm được phương án', 'Không ai đủ kỹ năng');
});

test('lịch sử: phương án đã áp dụng hay thất bại không còn nút Áp dụng', async () => {
  asUser(PM);
  optimizationApi.getHistory.mockResolvedValue({
    data: {
      data: {
        results: [
          { _id: 'h1', algorithm: 'hybrid', status: 'completed', isApplied: true, fitness: 0.8, taskCount: 5, createdAt: new Date().toISOString(), projectFilter: { name: 'Web bán hàng', code: 'ECOM' } },
          { _id: 'h2', algorithm: 'csp', status: 'failed', isApplied: false, fitness: 0, taskCount: 5, createdAt: new Date().toISOString() },
          { _id: 'h3', algorithm: 'genetic', status: 'completed', isApplied: false, fitness: 0.7, taskCount: 5, createdAt: new Date().toISOString() },
        ],
      },
    },
  });
  open();
  fireEvent.press(screen.getByText('📜 Lịch sử chạy'));
  expect(await screen.findByText('Đã áp dụng')).toBeTruthy();
  expect(screen.getByText('Thất bại')).toBeTruthy();
  expect(screen.getByText(/ECOM · Web bán hàng/)).toBeTruthy();
  expect(screen.getAllByText('Áp dụng phương án này')).toHaveLength(1);
  fireEvent.press(screen.getByText('Áp dụng phương án này'));
  await waitFor(() => expect(optimizationApi.apply).toHaveBeenCalledWith('h3'));
});
