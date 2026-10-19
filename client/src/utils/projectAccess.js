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
