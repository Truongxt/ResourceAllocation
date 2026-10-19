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

  it('PM ở dự án người khác: không sửa, không xóa việc giao cho người khác', async () => {
    mocks.project = project({
      tasks: [{
        _id: 't1', title: 'Việc của Nam', status: 'todo', priority: 'medium',
        assignee: { _id: 'u-m', name: 'Nam' }, createdBy: 'u-other',
        startDate: '2026-11-02T00:00:00.000Z', endDate: '2026-11-06T00:00:00.000Z',
      }],
    });
    await renderDetail();
    await userEvent.click(screen.getByRole('tab', { name: /Công việc/ }));
    const row = (await screen.findByText('Việc của Nam')).closest('tr');
    expect(row.querySelector('.anticon-edit')).toBeNull();
    expect(row.querySelector('.anticon-delete')).toBeNull();
  });

  it('không quản lý, không phải thành viên dự án: không có nút tạo công việc', async () => {
    mocks.project = project();
    await renderDetail();
    await userEvent.click(screen.getByRole('tab', { name: /Công việc/ }));
    expect(screen.queryByRole('button', { name: /Tạo công việc/ })).toBeNull();
  });

  it('thành viên dự án (dự án để mặc định): có nút tạo công việc', async () => {
    mocks.project = project({ members: [...project().members, { user: { _id: 'u-pm', name: 'PM' }, role: 'developer' }] });
    await renderDetail();
    await userEvent.click(screen.getByRole('tab', { name: /Công việc/ }));
    expect(await screen.findByRole('button', { name: /Tạo công việc/ })).toBeInTheDocument();
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
    // Dự án đã lưu trữ là chỉ đọc (server trả 409): không có nút tạo công việc, kể cả với quản lý.
    await userEvent.click(screen.getByRole('tab', { name: /Công việc/ }));
    expect(screen.queryByRole('button', { name: /Tạo công việc/ })).toBeNull();
  });
});
