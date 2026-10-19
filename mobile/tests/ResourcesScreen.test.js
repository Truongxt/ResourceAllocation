/**
 * Màn Nhân sự: thêm và sửa nhân sự chỉ dành cho Admin/Owner và PM — khớp server
 * (`authorize('admin', 'project_manager')` ở resource.routes.js). Thành viên được cấp quyền ứng
 * dụng Nhân sự vẫn vào xem được, nhưng không thấy nút ghi — trước đây thấy, bấm vào thì nhận 403.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithTheme } from './helpers';

jest.mock('../src/api/resourceApi', () => ({
  __esModule: true,
  default: { getAll: jest.fn(), create: jest.fn(), update: jest.fn() },
}));
jest.mock('../src/api/departmentApi', () => ({ __esModule: true, default: { getAll: jest.fn() } }));
const mockAuth = { user: null };
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: mockAuth.user, canManageModule: () => true }),
}));

import resourceApi from '../src/api/resourceApi';
import departmentApi from '../src/api/departmentApi';
import ResourcesScreen from '../src/screens/resources/ResourcesScreen';

const RESOURCE = { _id: 'r1', user: { _id: 'u-m', name: 'Nam', email: 'nam@rao.com' }, position: 'Dev', maxCapacity: 40, currentWorkload: 20 };

beforeEach(() => {
  resourceApi.getAll.mockReset().mockResolvedValue({ data: { data: { resources: [RESOURCE] } } });
  departmentApi.getAll.mockReset().mockResolvedValue({ data: { data: { departments: [] } } });
});

test('thành viên có quyền xem Nhân sự: không có nút thêm, không có nút sửa', async () => {
  mockAuth.user = { _id: 'u-x', role: 'member', appAdmins: ['resource'] };
  renderWithTheme(<ResourcesScreen />);
  await screen.findByText('Nam');
  expect(screen.queryByLabelText('Thêm nhân sự')).toBeNull();
  expect(screen.queryByLabelText('Sửa nhân sự: Nam')).toBeNull();
});

test('PM: thêm và sửa được nhân sự', async () => {
  mockAuth.user = { _id: 'u-pm', role: 'project_manager' };
  renderWithTheme(<ResourcesScreen />);
  await screen.findByText('Nam');
  expect(screen.getByLabelText('Thêm nhân sự')).toBeTruthy();
  expect(screen.getByLabelText('Sửa nhân sự: Nam')).toBeTruthy();
});
