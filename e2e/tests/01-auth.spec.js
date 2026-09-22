/**
 * Đường vào hệ thống: đăng nhập, giữ phiên, đăng xuất, và ranh giới của
 * `ProtectedRoute` khi gõ thẳng URL.
 *
 * Bộ này cố ý chạy đầu tiên: mọi bộ còn lại đều bắt đầu bằng `login()`, nên nếu
 * đường vào hỏng thì phải thấy nó hỏng ở đây chứ không phải dưới dạng 10 bộ
 * cùng timeout vì chờ một cái heading không bao giờ hiện.
 */

const { test, expect } = require('@playwright/test');
const { ACCOUNTS, login, watchForProblems } = require('../support/helpers');

test.describe('Xác thực', () => {
  test('trang đăng nhập dựng đủ form và không nổ lỗi JS', async ({ page }) => {
    const problems = watchForProblems(page);

    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Đăng nhập hệ thống' })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Đăng nhập/ })).toBeEnabled();
    await expect(page.getByRole('link', { name: 'Tạo tài khoản mới' })).toBeVisible();

    expect(problems).toEqual([]);
  });

  test('bỏ trống form thì chặn tại client, không gửi request', async ({ page }) => {
    await page.goto('/login');
    // Xóa giá trị email điền sẵn để chạm được nhánh "bắt buộc"
    await page.locator('#email').fill('');

    const loginCalls = [];
    page.on('request', (r) => { if (r.url().includes('/auth/login')) loginCalls.push(r.url()); });

    await page.getByRole('button', { name: /^Đăng nhập/ }).click();

    await expect(page.getByText('Vui lòng nhập email')).toBeVisible();
    await expect(page.getByText('Vui lòng nhập mật khẩu')).toBeVisible();
    expect(loginCalls).toEqual([]);
    await expect(page).toHaveURL(/\/login/);
  });

  test('sai mật khẩu thì báo lỗi và giữ nguyên trang', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill(ACCOUNTS.admin.email);
    await page.locator('#password').fill('sai-mat-khau');
    await page.getByRole('button', { name: /^Đăng nhập/ }).click();

    await expect(page.locator('.auth-error, .ant-alert-error').first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('đăng nhập đúng thì vào workspace và Header hiện đúng người', async ({ page }) => {
    const account = await login(page, 'admin');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('.workspace-sidebar')).toBeVisible();
    await expect(page.getByText(account.name).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tổng quan' }).first()).toBeVisible();
  });

  test('tải lại trang thì phiên vẫn còn nhờ cookie refresh', async ({ page }) => {
    // Access token nằm trong bộ nhớ, không ở localStorage — sau F5 nó mất sạch.
    // Phiên sống tiếp được hay không hoàn toàn phụ thuộc cookie refresh httpOnly,
    // nên đây chính là bài kiểm tra cho cơ chế đó.
    const account = await login(page, 'admin');
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'Quản lý Dự án' }).first()).toBeVisible();

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Quản lý Dự án' }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(account.name).first()).toBeVisible();
    await expect(page).toHaveURL(/\/projects/);
  });

  test('đã đăng nhập mà vào /login thì bị đẩy về dashboard', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test('chưa đăng nhập mà gõ thẳng URL nội bộ thì bị đẩy về /login', async ({ page }) => {
    for (const path of ['/dashboard', '/projects', '/tasks', '/reports']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
      await expect(page.getByRole('heading', { name: 'Đăng nhập hệ thống' })).toBeVisible();
    }
  });

  test('đăng xuất thì mất phiên, quay lại trang trong cũng không vào được', async ({ page }) => {
    const account = await login(page, 'admin');

    await page.getByText(account.name).first().click();
    await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });

    // Quan trọng hơn cả việc bị đá ra: cookie refresh phải bị thu hồi, nếu không
    // chỉ cần gõ /dashboard là vào lại được như chưa từng đăng xuất.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
  });

  test('trang đăng ký chặn mật khẩu xác nhận không khớp', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Tạo tài khoản mới' })).toBeVisible();

    await page.locator('#name').fill('Người Dùng Thử');
    await page.locator('#email').fill(`e2e-${Date.now()}@rao.com`);
    await page.locator('#phone').fill('0900000000');
    await page.locator('#companyName').fill('Công ty Kiểm Thử');
    await page.locator('#password').fill('matkhau123');
    await page.locator('#confirmPassword').fill('matkhau456');

    const registerCalls = [];
    page.on('request', (r) => { if (r.url().includes('/auth/register')) registerCalls.push(r.url()); });

    await page.getByRole('button', { name: /^Tạo tài khoản mới/ }).click();

    await expect(page.getByText('Mật khẩu xác nhận không khớp')).toBeVisible();
    expect(registerCalls).toEqual([]);
    await expect(page).toHaveURL(/\/register/);
  });
});
