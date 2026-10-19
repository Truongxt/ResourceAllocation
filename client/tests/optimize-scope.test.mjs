// Phạm vi tối ưu hóa của người dùng — phải khớp `server/src/services/optimizeScope.js`.
// Chạy: cd client && npm test
//
// Lệch một chiều thì PM thấy trang Tối ưu nhưng mọi nút đều nhận 403; lệch chiều kia thì PM
// được phép mà không có lối vào.

import { optimizeScopeOf, optimizableProjects, defaultOptimizeProject } from '../src/utils/optimizeScope.js';

let passed = 0;
let failed = 0;

function check(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}\n      mong đợi: ${JSON.stringify(expected)}\n      nhận được: ${JSON.stringify(actual)}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

section('Ai được dùng, trên phạm vi nào');
check('Chưa đăng nhập → không', optimizeScopeOf(null), null);
check('Owner → toàn công ty', optimizeScopeOf({ role: 'member', isOwner: true }), 'all');
check('Admin → toàn công ty', optimizeScopeOf({ role: 'admin' }), 'all');
check('App Admin của optimize → toàn công ty', optimizeScopeOf({ role: 'member', appAdmins: ['optimize'] }), 'all');
check('App Admin phân hệ khác → không', optimizeScopeOf({ role: 'member', appAdmins: ['analytics'] }), null);
check('PM → dự án mình quản lý', optimizeScopeOf({ role: 'project_manager' }), 'managed');
check('PM kiêm App Admin optimize → toàn công ty', optimizeScopeOf({ role: 'project_manager', appAdmins: ['optimize'] }), 'all');
check('Member → không', optimizeScopeOf({ role: 'member' }), null);

section('Dự án được chọn');
const projects = [
  { _id: 'p1', manager: { _id: 'u-pm' } },
  { _id: 'p2', manager: 'u-pm' },
  { _id: 'p3', manager: { _id: 'u-other' } },
];
check('PM: chỉ dự án có manager là mình (manager populate hay chưa đều đọc được)',
  optimizableProjects(projects, { _id: 'u-pm', role: 'project_manager' }).map((p) => p._id), ['p1', 'p2']);
check('Admin: mọi dự án', optimizableProjects(projects, { _id: 'u-a', role: 'admin' }).map((p) => p._id), ['p1', 'p2', 'p3']);
check('Không có quyền: không dự án nào', optimizableProjects(projects, { _id: 'u-m', role: 'member' }), []);

section('Dự án chọn sẵn cho PM');
// Dự án không có việc mở thì bấm chạy chỉ nhận 400 — với dữ liệu mẫu, dự án mới nhất của PM
// (RAO-MOB) đúng là như vậy.
check('Bỏ qua dự án không có việc mở',
  defaultOptimizeProject([
    { _id: 'p1', taskStats: { openTasks: 0 } },
    { _id: 'p2', taskStats: { openTasks: 3 } },
  ])?._id, 'p2');
check('Không dự án nào có việc mở → vẫn chọn dự án đầu', defaultOptimizeProject([
  { _id: 'p1', taskStats: { openTasks: 0 } },
  { _id: 'p2' },
])?._id, 'p1');
check('Danh sách rỗng → không chọn', defaultOptimizeProject([]), null);

console.log(`\n  ${passed} đạt, ${failed} hỏng`);
process.exit(failed ? 1 : 0);
