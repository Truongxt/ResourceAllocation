/**
 * Màn Dự án và Chi tiết dự án chỉ hiện thao tác thuộc quyền — luật dùng chung với web
 * (utils/projectAccess.js), khớp server:
 *   - Tạo dự án: Admin/Owner và PM; thành viên chỉ khi công ty cho phép mọi người tạo.
 *   - Sửa dự án: Admin/Owner hoặc PM của chính dự án (PM ở dự án khác chỉ như thành viên).
 *   - Thêm việc: quản lý dự án, hoặc thành viên khi dự án cho phép.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithTheme } from './helpers';

jest.mock('../src/api/projectApi', () => ({
  __esModule: true,
  default: { getAll: jest.fn(), getById: jest.fn(), create: jest.fn(), update: jest.fn() },
}));
jest.mock('../src/api/taskApi', () => ({ __esModule: true, default: { getAllPages: jest.fn(), create: jest.fn() } }));
jest.mock('../src/api/taskGroupApi', () => ({ __esModule: true, default: { getByProject: jest.fn() } }));
jest.mock('../src/api/companySettingApi', () => ({ __esModule: true, default: { get: jest.fn() } }));
const mockAuth = { user: null };
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: mockAuth.user, canManageModule: () => true }),
}));

import projectApi from '../src/api/projectApi';
import taskApi from '../src/api/taskApi';
import taskGroupApi from '../src/api/taskGroupApi';
import companySettingApi from '../src/api/companySettingApi';
import ProjectsScreen from '../src/screens/projects/ProjectsScreen';
import ProjectDetailScreen from '../src/screens/projects/ProjectDetailScreen';

const PM = { _id: 'u-pm', role: 'project_manager' };
const MEMBER = { _id: 'u-m', role: 'member' };
const PROJECT = {
  _id: 'p1', name: 'Website', code: 'WEB', status: 'active',
  manager: { _id: 'u-other', name: 'Người khác' },
  members: [{ user: { _id: 'u-m', name: 'Nam' }, role: 'developer' }, { user: { _id: 'u-pm', name: 'PM' }, role: 'developer' }],
  permissions: {},
};

beforeEach(() => {
  projectApi.getAll.mockReset().mockResolvedValue({ data: { data: { projects: [PROJECT] } } });
  projectApi.getById.mockReset().mockResolvedValue({ data: { data: { project: PROJECT } } });
  taskApi.getAllPages.mockReset().mockResolvedValue({ tasks: [], total: 0 });
  taskGroupApi.getByProject.mockReset().mockResolvedValue({ data: { data: { groups: [] } } });
  companySettingApi.get.mockReset().mockResolvedValue({ data: { data: { settings: { createProjectPermission: 'only_admin' } } } });
});

const openList = async () => {
  renderWithTheme(<ProjectsScreen navigation={{ navigate: jest.fn() }} />);
  await screen.findByText('Website');
};
const openDetail = async () => {
  renderWithTheme(<ProjectDetailScreen route={{ params: { projectId: 'p1' } }} navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);
  await waitFor(() => expect(projectApi.getById).toHaveBeenCalled());
  await screen.findAllByText('Website');
};

test('PM tạo được dự án', async () => {
  mockAuth.user = PM;
  await openList();
  expect(screen.getByLabelText('Tạo dự án mới')).toBeTruthy();
});

test('thành viên: công ty chỉ cho quản trị thì không có nút tạo dự án', async () => {
  mockAuth.user = MEMBER;
  await openList();
  await waitFor(() => expect(companySettingApi.get).toHaveBeenCalled());
  expect(screen.queryByLabelText('Tạo dự án mới')).toBeNull();
});

test('thành viên: công ty cho mọi người thì có nút tạo dự án', async () => {
  mockAuth.user = MEMBER;
  companySettingApi.get.mockResolvedValue({ data: { data: { settings: { createProjectPermission: 'all_members' } } } });
  await openList();
  expect(await screen.findByLabelText('Tạo dự án mới')).toBeTruthy();
});

test('PM ở dự án người khác: không sửa được dự án; vẫn thêm việc như thành viên', async () => {
  mockAuth.user = PM;
  await openDetail();
  expect(screen.queryByLabelText('Sửa dự án')).toBeNull();
  fireEvent.press(screen.getByText(/^Công việc/));
  expect(screen.getByText('Thêm việc')).toBeTruthy();
});

test('dự án tắt quyền thành viên tạo việc: thành viên không thấy nút thêm việc', async () => {
  mockAuth.user = MEMBER;
  projectApi.getById.mockResolvedValue({ data: { data: { project: { ...PROJECT, permissions: { allowMembersCreateTasks: false } } } } });
  await openDetail();
  fireEvent.press(screen.getByText(/^Công việc/));
  expect(screen.queryByText('Thêm việc')).toBeNull();
});

test('PM của chính dự án: sửa được dự án', async () => {
  mockAuth.user = PM;
  projectApi.getById.mockResolvedValue({ data: { data: { project: { ...PROJECT, manager: { _id: 'u-pm', name: 'PM' } } } } });
  await openDetail();
  expect(screen.getByLabelText('Sửa dự án')).toBeTruthy();
});
