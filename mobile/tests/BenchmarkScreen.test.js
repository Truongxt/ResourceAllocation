/**
 * Màn Benchmark trên mobile: "Dữ liệu Thật" chạy trên toàn công ty, nên PM — chỉ được dự án
 * mình quản lý — không có lựa chọn này (server cũng chặn bằng 403). Khớp Benchmark Studio web.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithTheme } from './helpers';

jest.mock('../src/api/optimizationApi', () => ({ __esModule: true, default: { runBenchmark: jest.fn() } }));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));

import { useAuth } from '../src/context/AuthContext';
import BenchmarkScreen from '../src/screens/benchmark/BenchmarkScreen';

const open = () => renderWithTheme(<BenchmarkScreen navigation={{ goBack: jest.fn() }} />);

test('PM: không có lựa chọn dữ liệu thật', () => {
  useAuth.mockReturnValue({ user: { _id: 'u-pm', role: 'project_manager' } });
  open();
  expect(screen.getByText('Tập Nhỏ')).toBeTruthy();
  expect(screen.queryByText('Dữ liệu Thật')).toBeNull();
});

test('Admin: vẫn có dữ liệu thật', () => {
  useAuth.mockReturnValue({ user: { _id: 'u-admin', role: 'admin' } });
  open();
  expect(screen.getByText('Dữ liệu Thật')).toBeTruthy();
});
