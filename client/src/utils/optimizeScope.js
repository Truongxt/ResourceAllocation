// Phạm vi tối ưu hóa của người dùng. Phải khớp `server/src/services/optimizeScope.js`:
//   'all'     Owner, Admin, App Admin của Base Optimize+ — toàn công ty
//   'managed' PM — chỉ dự án có `manager` là chính họ
//   null      không được dùng
// Logic thuần, chạy được bằng node (tests/optimize-scope.test.mjs).

export function optimizeScopeOf(user) {
  if (!user) return null;
  const isAppAdmin = Array.isArray(user.appAdmins) && user.appAdmins.includes('optimize');
  if (user.isOwner || user.role === 'admin' || isAppAdmin) return 'all';
  if (user.role === 'project_manager') return 'managed';
  return null;
}

const idOf = (value) => String((value && value._id) || value);

/** Dự án người dùng được chạy tối ưu trên đó. */
export function optimizableProjects(projects, user) {
  const scope = optimizeScopeOf(user);
  if (scope === 'all') return projects;
  if (scope === 'managed') return projects.filter((p) => p.manager && idOf(p.manager) === idOf(user._id));
  return [];
}

/**
 * Dự án chọn sẵn khi người dùng không có "Tất cả dự án" (PM): dự án đầu tiên còn việc mở
 * (`taskStats.openTasks` của `GET /projects`), vì dự án không có việc mở thì chạy chỉ nhận 400.
 * Không dự án nào còn việc thì vẫn chọn dự án đầu để trang không trống.
 */
export function defaultOptimizeProject(projects) {
  return projects.find((p) => p.taskStats?.openTasks > 0) || projects[0] || null;
}
