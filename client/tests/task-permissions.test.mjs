// Kiểm thử logic thuần của hai quyền mới: duyệt kết quả và đánh dấu thất bại.
// Chạy: cd client && npm test
//
// Hai quyền này quyết định nút nào hiện ra, nên sai ở đây là người dùng thấy một nút
// bấm vào chỉ để nhận thông báo từ chối — hoặc tệ hơn, không thấy nút mình được phép dùng.

import { getTaskPermissions } from '../src/utils/taskPermissions.js';

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

const member = { _id: 'u-member', role: 'member' };
const reviewer = { _id: 'u-reviewer', role: 'member' };
const creator = { _id: 'u-creator', role: 'member' };
const follower = { _id: 'u-follower', role: 'member' };
const pm = { _id: 'u-pm', role: 'project_manager' };

/** Dự án rút gọn; `permissions` phải có để helper nhận ra đây là project hợp lệ. */
const project = (extra = {}) => ({
  _id: 'p1',
  manager: 'u-pm',
  permissions: {},
  ...extra,
});

const task = (extra = {}) => ({
  _id: 't1',
  createdBy: 'u-creator',
  assignee: 'u-member',
  followers: ['u-follower'],
  ...extra,
});

// ──────────────────────────────────────────────
section('1. Quyền duyệt kết quả (canReview)');
// ──────────────────────────────────────────────
{
  const proj = project({ reviewConfig: { enabled: true, reviewers: ['u-reviewer'] } });
  check(
    'người nằm trong danh sách đánh giá thì duyệt được',
    getTaskPermissions(task(), proj, reviewer).canReview,
    true
  );
  check(
    'người ngoài danh sách thì không',
    getTaskPermissions(task(), proj, follower).canReview,
    false
  );
  check('quản lý dự án luôn duyệt được', getTaskPermissions(task(), proj, pm).canReview, true);
}
{
  // Điểm mấu chốt của cả bước đánh giá: người làm không tự chấm việc mình làm, kể cả
  // khi tên họ nằm trong danh sách người đánh giá của dự án.
  const proj = project({ reviewConfig: { enabled: true, reviewers: ['u-member'] } });
  check(
    'người thực hiện KHÔNG tự duyệt việc của mình dù có tên trong danh sách',
    getTaskPermissions(task(), proj, member).canReview,
    false
  );
}
{
  // Danh sách cấp công việc đè cấu hình dự án.
  const proj = project({ reviewConfig: { enabled: true, reviewers: ['u-reviewer'] } });
  const overridden = task({ reviewers: ['u-follower'] });
  check(
    'người đánh giá cấp công việc đè danh sách của dự án',
    getTaskPermissions(overridden, proj, follower).canReview,
    true
  );
  check(
    'và người của dự án mất quyền khi công việc đã khai riêng',
    getTaskPermissions(overridden, proj, reviewer).canReview,
    false
  );
}

// ──────────────────────────────────────────────
section('2. Quyền đánh dấu thất bại (canMarkFailed)');
// ──────────────────────────────────────────────
{
  const none = project({ failureConfig: { enabled: true, allowedRoles: [] } });
  check(
    'allowedRoles rỗng: người thực hiện không được đánh dấu',
    getTaskPermissions(task(), none, member).canMarkFailed,
    false
  );
  check('nhưng quản lý dự án vẫn được', getTaskPermissions(task(), none, pm).canMarkFailed, true);
}
{
  const byAssignee = project({ failureConfig: { enabled: true, allowedRoles: ['assignee'] } });
  check(
    "thêm 'assignee' thì người thực hiện được đánh dấu",
    getTaskPermissions(task(), byAssignee, member).canMarkFailed,
    true
  );
  check(
    'người giao việc vẫn chưa được nếu chưa khai',
    getTaskPermissions(task(), byAssignee, creator).canMarkFailed,
    false
  );
}
{
  const byAssigner = project({ failureConfig: { enabled: true, allowedRoles: ['assigner'] } });
  check(
    "'assigner' ứng với người giao việc",
    getTaskPermissions(task(), byAssigner, creator).canMarkFailed,
    true
  );
}
{
  const byFollower = project({ failureConfig: { enabled: true, allowedRoles: ['follower'] } });
  check(
    "'follower' ứng với người theo dõi",
    getTaskPermissions(task(), byFollower, follower).canMarkFailed,
    true
  );
}

// ──────────────────────────────────────────────
section('3. Chưa đăng nhập');
// ──────────────────────────────────────────────
{
  const anon = getTaskPermissions(task(), project(), null);
  check('không có quyền duyệt', anon.canReview, false);
  check('không có quyền đánh dấu thất bại', anon.canMarkFailed, false);
}

// ──────────────────────────────────────────────
console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} đạt, ${failed} lỗi\n`);
process.exit(failed === 0 ? 0 : 1);
