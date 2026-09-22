/**
 * Tiện ích dùng chung cho bộ kiểm thử giao diện.
 *
 * Nguyên tắc chọn phần tử: ưu tiên vai trò (role) và nhãn người dùng nhìn thấy,
 * vì đó chính là thứ bài test đang bảo vệ. Chỉ rơi xuống class của Ant Design
 * (`.ant-table-row`, `.ant-modal`…) khi phần tử không có vai trò ARIA nào đọc
 * được — và khi đó luôn kèm một điều kiện về nội dung để test không "xanh" chỉ
 * vì cái khung rỗng vẫn được vẽ ra.
 */

const { expect } = require('@playwright/test');

/** Tài khoản do seeder tạo. Mật khẩu giống nhau, vai trò khác nhau. */
const ACCOUNTS = {
  admin: { email: 'admin@rao.com', password: 'password123', name: 'System Admin', role: 'admin' },
  pm: { email: 'pm@rao.com', password: 'password123', name: 'Nguyễn Văn Quản Lý', role: 'project_manager' },
  member: { email: 'nam.tran@rao.com', password: 'password123', name: 'Trần Văn Nam', role: 'member' },
};

/** Tên dự án/công việc trong dữ liệu mẫu, dùng để assert danh sách có thật. */
const SEED = {
  projects: ['Ứng dụng Di động RAO Mobile App', 'Nâng cấp Nền tảng E-Commerce'],
  resourceCount: 3,
  departmentCount: 4,
};

/** Hậu tố ngẫu nhiên: bộ test tạo bản ghi phải đặt tên không đụng lần chạy trước. */
const uniqueName = (prefix) =>
  `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Đăng nhập **qua giao diện thật** chứ không nhét token vào localStorage.
 *
 * Access token của hệ thống nằm trong bộ nhớ chứ không ở localStorage (xem
 * `client/src/services/tokenStore.js`), nên không có cách nào "dựng sẵn" phiên
 * từ bên ngoài. Đi qua form cũng đúng tinh thần e2e hơn: mỗi bộ test tự chứng
 * minh rằng đường vào hệ thống còn hoạt động.
 */
async function login(page, role = 'admin') {
  const account = ACCOUNTS[role];
  if (!account) throw new Error(`Không có tài khoản mẫu cho vai trò "${role}"`);

  await page.goto('/login');
  await page.locator('#email').fill(account.email);
  await page.locator('#password').fill(account.password);
  await page.getByRole('button', { name: /^Đăng nhập/ }).click();

  // Login điều hướng về '/', nơi Dashboard được nạp theo chunk riêng.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
  await expect(page.getByText(account.name).first()).toBeVisible({ timeout: 20_000 });
  return account;
}

/**
 * Gắn máy thu lỗi vào một page.
 *
 * Thu **hai** loại: ngoại lệ JavaScript chưa bắt (`pageerror`) và response 5xx.
 * Cố tình bỏ qua 4xx — nhiều bộ test cố tình gây ra 401/403 để kiểm ranh giới
 * phân quyền, và `/auth/refresh` trả 401 khi chưa có cookie là chuyện bình thường.
 */
function watchForProblems(page) {
  const problems = [];
  page.on('pageerror', (err) => problems.push(`JS: ${err.message}`));
  page.on('response', (res) => {
    if (res.status() >= 500) problems.push(`HTTP ${res.status()} ${res.request().method()} ${res.url()}`);
  });
  return problems;
}

module.exports = { ACCOUNTS, SEED, uniqueName, login, watchForProblems };
