// Kiểm thử logic thuần của utils/projectAccess.js — ai được làm gì với một dự án.
// Chạy: cd client && npm test
//
// Web và mobile (bản chép nguyên, khóa ở mobile/tests/shared-copies.test.mjs) dùng các hàm này
// để chỉ hiện thao tác thuộc quyền. Luật phải khớp server: services/projectAccess.js,
// createDeniedReason trong middleware/taskAccess.js, createProject trong project.controller.js.

import {
  canManageProject,
  canDuplicateProject,
  canCreateTaskIn,
  canCreateProject,
} from '../src/utils/projectAccess.js';

let passed = 0;
let failed = 0;
const check = (label, actual, expected) => {
  if (actual === expected) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}\n      mong đợi: ${expected}\n      nhận được: ${actual}`);
  }
};

const ADMIN = { _id: 'u-admin', role: 'admin' };
const OWNER_MEMBER = { _id: 'u-owner', role: 'member', isOwner: true };
const PM = { _id: 'u-pm', role: 'project_manager' };
const MEMBER = { _id: 'u-m', role: 'member' };
const GUEST = { _id: 'u-g', role: 'member' };

const project = (extra = {}) => ({
  _id: 'p1',
  manager: { _id: 'u-other' },
  members: [{ user: { _id: 'u-m' }, role: 'developer' }, { user: 'u-g', role: 'guest' }, { user: 'u-pm', role: 'developer' }],
  permissions: {},
  ...extra,
});

console.log('\n1. Quản lý dự án: Admin/Owner hoặc PM của chính dự án');
check('admin quản lý mọi dự án', canManageProject(ADMIN, project()), true);
check('owner quản lý mọi dự án', canManageProject(OWNER_MEMBER, project()), true);
check('PM của dự án', canManageProject(PM, project({ manager: 'u-pm' })), true);
check('PM ở dự án người khác, dù có tên trong dự án', canManageProject(PM, project()), false);
check('thành viên', canManageProject(MEMBER, project()), false);
check('chưa có dự án', canManageProject(ADMIN, null), false);

console.log('\n2. Nhân bản / mẫu: Admin/Owner và mọi PM');
check('PM bất kỳ', canDuplicateProject(PM), true);
check('thành viên', canDuplicateProject(MEMBER), false);

console.log('\n3. Tạo công việc trong dự án (khớp createDeniedReason)');
check('admin', canCreateTaskIn(ADMIN, project()), true);
check('PM của dự án', canCreateTaskIn(PM, project({ manager: 'u-pm' })), true);
check('PM ở dự án khác, là thành viên, dự án để mặc định → như thành viên: được', canCreateTaskIn(PM, project()), true);
check('PM ở dự án khác, dự án tắt quyền thành viên tạo việc', canCreateTaskIn(PM, project({ permissions: { allowMembersCreateTasks: false } })), false);
check('thành viên, dự án để mặc định', canCreateTaskIn(MEMBER, project()), true);
check('thành viên, dự án tắt quyền', canCreateTaskIn(MEMBER, project({ permissions: { allowMembersCreateTasks: false } })), false);
check('người ngoài dự án', canCreateTaskIn({ _id: 'u-x', role: 'member' }, project()), false);
check('khách, dự án chưa cho khách tạo', canCreateTaskIn(GUEST, project()), false);
check('khách, dự án cho khách tạo', canCreateTaskIn(GUEST, project({ permissions: { allowGuestCreateTask: true } })), true);

console.log('\n4. Tạo dự án (khớp createProject)');
check('admin', canCreateProject(ADMIN, {}), true);
check('PM', canCreateProject(PM, {}), true);
check('thành viên, công ty chỉ cho quản trị', canCreateProject(MEMBER, { createProjectPermission: 'only_admin' }), false);
check('thành viên, công ty cho mọi người', canCreateProject(MEMBER, { createProjectPermission: 'all_members' }), true);
check('chưa tải cấu hình công ty', canCreateProject(MEMBER, null), false);

console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} đạt, ${failed} lỗi\n`);
process.exit(failed === 0 ? 0 : 1);
