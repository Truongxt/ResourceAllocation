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
  hasAppAccess,
  canAccessResources,
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

// ──────────────────────────────────────────────
section('Quản trị ứng dụng — lớp quyền KHÁC với appPermissions');
{
  // Hai lớp này độc lập hoàn toàn. Nhầm lẫn giữa chúng chính là chỗ web và mobile
  // từng nói hai chuyện khác nhau: mobile chỉ nhìn `appPermissions` nên hiện tab
  // Tối ưu hóa cho người mà server chặn bằng `authorizeApp('optimize')`.
  check('Không có user → false', hasAppAccess(null, 'optimize'), false);
  check('Owner luôn qua', hasAppAccess({ isOwner: true }, 'optimize'), true);
  check('Admin luôn qua', hasAppAccess({ role: 'admin' }, 'optimize'), true);

  const granted = { role: 'member', appAdmins: ['optimize'] };
  check('Member được cấp thì qua', hasAppAccess(granted, 'optimize'), true);
  check('…nhưng chỉ đúng app được cấp', hasAppAccess(granted, 'resource'), false);

  check('Không có appAdmins → false', hasAppAccess({ role: 'member' }, 'optimize'), false);
  check('appAdmins không phải mảng → false',
    hasAppAccess({ role: 'member', appAdmins: 'optimize' }, 'optimize'), false);

  // Ca quyết định: đủ appPermissions nhưng thiếu quyền quản trị ứng dụng.
  // Trước bản vá, mobile hiện tab cho đúng người này.
  const viewerOnly = { role: 'member', appPermissions: { optimization: 'view' } };
  check('Có appPermissions nhưng thiếu appAdmins vẫn KHÔNG vào được phân hệ',
    [canViewModule(viewerOnly, 'optimization'), hasAppAccess(viewerOnly, 'optimize')],
    [true, false]);
}

// ──────────────────────────────────────────────
section('Phân hệ Nhân sự — khớp quy tắc của Sidebar bên web');
{
  check('PM vào được', canAccessResources({ role: 'project_manager' }), true);
  check('Admin vào được', canAccessResources({ role: 'admin' }), true);
  check('Member thường không', canAccessResources({ role: 'member' }), false);
  check('Owner vào được dù là member',
    canAccessResources({ role: 'member', isOwner: true }), true);
  // Đây là ca mobile từng bỏ sót vì chỉ kiểm `role !== 'member'`.
  check('Member được cấp quyền quản trị `resource` thì vào được',
    canAccessResources({ role: 'member', appAdmins: ['resource'] }), true);
  check('Không có user → false', canAccessResources(null), false);
}

console.log(`\n  ${passed} đạt, ${failed} hỏng`);
process.exit(failed === 0 ? 0 : 1);
