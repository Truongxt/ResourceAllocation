/**
 * Ai được làm gì với một dự án — khớp đúng luật server (`server/src/services/projectAccess.js`),
 * để giao diện chỉ hiện thao tác thuộc quyền thay vì hiện ra rồi nhận 403.
 *
 *   - Quản lý dự án (sửa, xóa, thành viên, nhóm công việc, lưu trữ, trường tùy chỉnh, phân quyền):
 *     Admin/Owner, hoặc PM là `manager` của chính dự án đó.
 *   - Nhân bản / lưu thành mẫu / tạo từ mẫu: Admin/Owner và mọi PM (chỉ đọc dự án nguồn).
 */
const idOf = (value) => String(value?._id ?? value ?? '');

const isAdmin = (user) => Boolean(user) && (user.role === 'admin' || Boolean(user.isOwner));

export const canManageProject = (user, project) =>
  Boolean(user && project) && (isAdmin(user) || (Boolean(project.manager) && idOf(project.manager) === idOf(user._id)));

export const canDuplicateProject = (user) => isAdmin(user) || user?.role === 'project_manager';

/**
 * Tạo công việc trong một dự án — khớp `createDeniedReason` (server/src/middleware/taskAccess.js):
 * người quản lý được dự án thì luôn được; còn lại phải là thành viên dự án, và dự án cho phép
 * (`allowMembersCreateTasks`, mặc định bật; khách theo `allowGuestCreateTask`, mặc định tắt).
 */
export const canCreateTaskIn = (user, project) => {
  if (!user || !project) return false;
  if (canManageProject(user, project)) return true;
  const membership = (project.members || []).find((m) => idOf(m?.user ?? m) === idOf(user._id));
  if (!membership) return false;
  const perms = project.permissions || {};
  return membership.role === 'guest'
    ? Boolean(perms.allowGuestCreateTask)
    : perms.allowMembersCreateTasks !== false;
};

/**
 * Tạo dự án mới — khớp `createProject` (server/src/controllers/project.controller.js): Admin/Owner
 * và PM luôn được; thành viên chỉ khi công ty đặt `createProjectPermission: 'all_members'`.
 */
export const canCreateProject = (user, companySettings) => {
  if (!user) return false;
  if (user.role === 'member' && !user.isOwner) return companySettings?.createProjectPermission === 'all_members';
  return isAdmin(user) || user.role === 'project_manager';
};
