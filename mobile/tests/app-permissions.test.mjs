// Quyền theo phân hệ trên app di động.
// Chạy: cd mobile && npm test
//
// Trước đây mobile chỉ kiểm đúng một biểu thức `role === 'member'`, trong khi
// server có bốn lớp quyền. Hậu quả không phải lỗ hổng — server vẫn chặn — mà là
// giao diện bày ra những nút bấm vào chỉ để nhận 403.
//
// Bộ này khóa ba quy tắc dễ làm sai nhất, vì làm sai theo chiều ngược lại còn
// tệ hơn: khóa nhầm người đang có quyền thì họ mất sạch tính năng.

import {
  appPermissionRank,
  canViewModule,
  canManageModule,
} from '../src/utils/appPermissions.js';

let passed = 0;
let failed = 0;

function check(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(
      `  ✗ ${label}\n      mong đợi: ${JSON.stringify(expected)}\n      nhận được: ${JSON.stringify(actual)}`
    );
  }
}

function section(title) {
  console.log(`\n${title}`);
}

// ──────────────────────────────────────────────
section('Chưa đăng nhập');
{
  check('Không có user → không xem được gì', appPermissionRank(null, 'tasks'), 0);
  check('canViewModule = false', canViewModule(undefined, 'tasks'), false);
}

// ──────────────────────────────────────────────
section('Chủ sở hữu vượt mọi cấu hình');
{
  const owner = { isOwner: true, appPermissions: { tasks: 'none', reports: 'none' } };
  check('Dù cấu hình là none vẫn đủ quyền sửa', appPermissionRank(owner, 'tasks'), 2);
  check('canManageModule = true', canManageModule(owner, 'reports'), true);
}

// ──────────────────────────────────────────────
section('Ba mức quyền');
{
  const u = (level) => ({ appPermissions: { tasks: level } });

  check('none → 0', appPermissionRank(u('none'), 'tasks'), 0);
  check('view → 1', appPermissionRank(u('view'), 'tasks'), 1);
  check('manage → 2', appPermissionRank(u('manage'), 'tasks'), 2);

  check('view thì xem được', canViewModule(u('view'), 'tasks'), true);
  check('view thì KHÔNG sửa được', canManageModule(u('view'), 'tasks'), false);
  check('none thì không xem được', canViewModule(u('none'), 'tasks'), false);
  check('manage thì sửa được', canManageModule(u('manage'), 'tasks'), true);
}

// ──────────────────────────────────────────────
section('Thiếu cấu hình mặc định là manage, không phải none');
{
  // Đây là ca dễ làm sai nhất. Chọn nhầm chiều thì mọi tài khoản tạo trước khi
  // có `appPermissions` sẽ mở app ra thấy thanh tab trống trơn.
  const legacy = {};
  check('User không có appPermissions', appPermissionRank(legacy, 'tasks'), 2);
  check('→ vẫn sửa được', canManageModule(legacy, 'tasks'), true);

  const partial = { appPermissions: { tasks: 'view' } };
  check('Phân hệ không được cấu hình', appPermissionRank(partial, 'reports'), 2);
  check('Phân hệ có cấu hình thì theo cấu hình', appPermissionRank(partial, 'tasks'), 1);

  const broken = { appPermissions: { tasks: 'xyz' } };
  check('Giá trị lạ cũng coi là manage', appPermissionRank(broken, 'tasks'), 2);
}

// ──────────────────────────────────────────────
section('Các phân hệ độc lập nhau');
{
  const u = {
    appPermissions: {
      projects: 'manage',
      tasks: 'view',
      calendar: 'none',
      optimization: 'view',
      reports: 'none',
    },
  };

  check('projects: sửa được', canManageModule(u, 'projects'), true);
  check('tasks: chỉ xem', [canViewModule(u, 'tasks'), canManageModule(u, 'tasks')], [true, false]);
  check('calendar: không vào được', canViewModule(u, 'calendar'), false);
  check('reports: không vào được', canViewModule(u, 'reports'), false);
  // Mặc định của optimization là `view`: chạy thử được, nhưng áp phương án vào
  // hệ thống là ghi đè phân công thật nên phải có `manage`.
  check('optimization: xem được nhưng không áp được phương án',
    [canViewModule(u, 'optimization'), canManageModule(u, 'optimization')], [true, false]);
}

console.log(`\n  ${passed} đạt, ${failed} hỏng`);
process.exit(failed === 0 ? 0 : 1);
