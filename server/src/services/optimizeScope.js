const Project = require('../models/Project');
const { DEFAULT_COMPANY, companyOf } = require('./companyRefs.service');

/**
 * Ai được dùng tối ưu hóa, và trên phạm vi nào.
 *
 *   - Owner, Admin, App Admin của Base Optimize+: toàn công ty (`{ all: true }`).
 *   - PM (`role: 'project_manager'`): chỉ các dự án có `Project.manager` là chính họ — cùng
 *     định nghĩa "quản lý dự án" với `middleware/taskAccess.js`.
 *   - Còn lại: không được dùng (`null`).
 *
 * Tối ưu hóa đọc tải của nhân sự trên mọi dự án và ghi đè phân công khi áp dụng, nên với
 * PM, mọi lối vào (chạy, xem, so sánh, áp dụng, hoàn tác, benchmark dữ liệu thật) đều phải
 * kiểm dự án — xem `projectScopeError` và `resultScopeError`.
 */
const resolveOptimizeScope = async (user) => {
  if (!user) return null;
  const isAppAdmin = Array.isArray(user.appAdmins) && user.appAdmins.includes('optimize');
  if (user.isOwner || user.role === 'admin' || isAppAdmin) return { all: true };
  if (user.role !== 'project_manager') return null;

  // Công ty mặc định gồm cả bản ghi cũ chưa có `companyName` — như ở loadOptimizationData.
  const company = companyOf(user);
  const companyName = company === DEFAULT_COMPANY ? { $in: [company, null, undefined] } : company;
  const managed = await Project.find({ manager: user._id, companyName }).distinct('_id');
  return { all: false, projectIds: new Set(managed.map(String)) };
};

/** Lý do chặn khi người gọi chạy / xem dữ liệu của `projectId`; null nếu được phép. */
const projectScopeError = (scope, projectId) => {
  if (!scope) return 'Bạn không có quyền dùng tối ưu hóa';
  if (scope.all) return null;
  if (!projectId) return 'PM chỉ chạy tối ưu được trên từng dự án mình quản lý — hãy chọn một dự án';
  if (!scope.projectIds.has(String(projectId))) return 'Bạn không quản lý dự án này';
  return null;
};

/** Lý do chặn khi người gọi đụng tới một kết quả tối ưu; null nếu được phép. */
const resultScopeError = (scope, result) => {
  if (!scope) return 'Bạn không có quyền dùng tối ưu hóa';
  if (scope.all) return null;
  // Kết quả chạy trên toàn công ty không có `projectFilter`: nằm ngoài phạm vi của PM dù
  // có chứa việc của dự án họ.
  const projectId = result.projectFilter?._id || result.projectFilter;
  if (!projectId || !scope.projectIds.has(String(projectId))) {
    return 'Kết quả này thuộc dự án bạn không quản lý';
  }
  return null;
};

module.exports = { resolveOptimizeScope, projectScopeError, resultScopeError };
