/**
 * Trang chi tiết dự án chỉ hiện thao tác quản lý dự án cho Admin/Owner hoặc PM của chính dự
 * án đó — khớp luật server (services/projectAccess.js). PM ở dự án người khác vẫn xem được dự
 * án, nhưng không thấy nút nhóm công việc, thêm thành viên, tab cấu hình, hay nút Mở lại.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders, authState } from './helpers.jsx';
import i18n from '../src/i18n';

const mocks = vi.hoisted(() => ({ user: null, project: null }));
vi.mock('../src/context/AuthContext', async (importOriginal) => ({
  ...(await importOriginal()),
  useAuth: () => ({ ...authState(), user: mocks.user }),
}));
vi.mock('../src/services/projectService', () => ({
  default: { getById: vi.fn(async () => ({ data: { data: { project: mocks.project } } })) },
}));
vi.mock('../src/services/resourceService', () => ({
  default: { getAll: vi.fn(async () => ({ data: { data: { resources: [] } } })) },
}));
vi.mock('../src/services/taskGroupService', () => ({
  default: { getByProject: vi.fn(async () => ({ data: { data: { groups: [] } } })) },
}));
const { default: ProjectDetail } = await import('../src/pages/projects/ProjectDetail');

const PM = { _id: 'u-pm', name: 'PM', role: 'project_manager' };
const project = (extra = {}) => ({
  _id: 'p1',
  name: 'Website',
  status: 'active',
  priority: 'medium',
  manager: { _id: 'u-other', name: 'Người khác' },
  members: [{ user: { _id: 'u-m', name: 'Nam' }, role: 'developer', allocation: 50 }],
  tasks: [],
  permissions: {},
  ...extra,
});

const renderDetail = async () => {
  renderWithProviders(
    <Routes><Route path="/projects/:id" element={<ProjectDetail />} /></Routes>,
    { route: '/projects/p1' }
  );
  await screen.findAllByText('Website');
};

beforeEach(async () => {
  await i18n.changeLanguage('vi');
  mocks.user = PM;
});

describe('Chi tiết dự án — chỉ hiện thao tác thuộc quyền', () => {
  it('PM ở dự án người khác: không có nút nhóm công việc, thêm thành viên, tab cấu hình', async () => {
    mocks.project = project();
    await renderDetail();
    expect(screen.queryByRole('button', { name: /Nhóm công việc/ })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Trường tùy chỉnh/ })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Phân quyền thao tác/ })).toBeNull();
    await userEvent.click(screen.getByRole('tab', { name: /Thành viên/ }));
    expect(await screen.findByText('Nam')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thêm thành viên/ })).toBeNull();
  });

  it('PM ở dự án người khác đã lưu trữ: không có nút Mở lại', async () => {
    mocks.project = project({ isArchived: true });
    await renderDetail();
    expect(screen.queryByRole('button', { name: 'Mở lại' })).toBeNull();
  });

  it('PM của chính dự án: đủ các thao tác', async () => {
    mocks.project = project({ manager: { _id: 'u-pm', name: 'PM' }, isArchived: true });
    await renderDetail();
    expect(screen.getByRole('button', { name: 'Mở lại' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Nhóm công việc/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: /Trường tùy chỉnh/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Phân quyền thao tác/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Thành viên/ }));
    expect(await screen.findByRole('button', { name: /Thêm thành viên/ })).toBeInTheDocument();
  });
});
