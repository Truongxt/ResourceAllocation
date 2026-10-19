/**
 * Ai được quản lý một dự án: sửa, xóa, thành viên, nhóm công việc, lưu trữ, cấu hình.
 * Admin/Owner trên mọi dự án trong công ty; PM chỉ trên dự án có `Project.manager` là chính họ.
 * Giao diện ẩn nút theo đúng luật này (`client/src/utils/projectAccess.js`).
 */
const canManageProject = (user, project) => {
  if (!user || !project) return false;
  if (user.role === 'admin' || user.isOwner) return true;
  const managerId = project.manager?._id || project.manager;
  return Boolean(managerId) && managerId.toString() === user._id.toString();
};

const MANAGE_DENIED = 'Chỉ Quản trị viên hoặc người quản lý dự án mới thao tác được trên dự án này';

module.exports = { canManageProject, MANAGE_DENIED };
