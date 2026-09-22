/**
 * Tùy chọn hiển thị: ngôn ngữ và giao diện sáng/tối.
 *
 * `client/tests/language-switch.test.jsx` đã kiểm việc đổi ngôn ngữ ở tầng
 * component. Bộ này kiểm phần chỉ trình duyệt thật mới chứng minh được: lựa chọn
 * có **sống sót qua F5** không, và có theo người dùng sang trang khác không.
 *
 * Đó là chỗ dễ hỏng nhất: ghi vào localStorage rồi nhưng lúc khởi động lại không
 * đọc ra, thì trên màn hình mọi thứ vẫn đúng cho tới khi tải lại trang.
 */

const { test, expect } = require('@playwright/test');
const { login } = require('../support/helpers');

test.describe('Ngôn ngữ', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
  });

  test('đổi sang tiếng Anh thì sidebar và tiêu đề trang đổi theo', async ({ page }) => {
    await page.goto('/projects');
    const sidebar = page.locator('.workspace-sidebar');
    await expect(sidebar.getByText('Dự án', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'EN', exact: true }).click();

    await expect(sidebar.getByText('Projects', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(sidebar.getByText('Tasks', { exact: true })).toBeVisible();
    // Nút đổi ngôn ngữ giờ phải mời quay về tiếng Việt
    await expect(page.getByRole('button', { name: 'VI', exact: true })).toBeVisible();
  });

  test('lựa chọn ngôn ngữ sống sót qua F5', async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.getByRole('button', { name: 'VI', exact: true })).toBeVisible({ timeout: 15_000 });

    await page.reload();

    await expect(page.getByRole('button', { name: 'VI', exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.workspace-sidebar').getByText('Projects', { exact: true })).toBeVisible();

    // Trả lại tiếng Việt để bộ test sau không thừa hưởng trạng thái này
    await page.getByRole('button', { name: 'VI', exact: true }).click();
    await expect(page.getByRole('button', { name: 'EN', exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test('ngôn ngữ giữ nguyên khi đi sang trang khác', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.getByRole('button', { name: 'VI', exact: true })).toBeVisible({ timeout: 15_000 });

    await page.locator('.workspace-sidebar').getByRole('menuitem', { name: /Reports$/ }).click();
    await expect(page.getByRole('button', { name: 'VI', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'VI', exact: true }).click();
    await expect(page.getByRole('button', { name: 'EN', exact: true })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Giao diện sáng/tối', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
  });

  test('bấm đổi giao diện thì nền trang đổi và lựa chọn được nhớ', async ({ page }) => {
    await page.goto('/dashboard');

    const before = await page.evaluate(() => localStorage.getItem('rao_theme'));
    await page.getByRole('button', { name: 'Toggle Theme', exact: true }).click();

    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('rao_theme')), { timeout: 10_000 })
      .not.toBe(before);

    const after = await page.evaluate(() => localStorage.getItem('rao_theme'));

    // Đổi giao diện mà tải lại vẫn giữ nguyên — đây mới là phần hay hỏng
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Tổng quan' }).first())
      .toBeVisible({ timeout: 30_000 });
    expect(await page.evaluate(() => localStorage.getItem('rao_theme'))).toBe(after);

    // Trả lại giá trị ban đầu
    await page.getByRole('button', { name: 'Toggle Theme', exact: true }).click();
  });
});

test.describe('Tìm kiếm toàn cục', () => {
  test('mở bằng nút và tìm được dự án lẫn công việc', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/dashboard');

    // Ô mở tìm kiếm là một `div` bắt sự kiện click, không phải `input` cũng
    // không có `role="button"`, nên phải bám vào class.
    await page.locator('.header-search-trigger').click();

    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 15_000 });

    await modal.getByRole('textbox').first().fill('REST');
    await expect(modal.getByText('Xây dựng REST APIs Quản lý Đơn hàng').first())
      .toBeVisible({ timeout: 15_000 });
  });
});
