/**
 * Realtime qua Socket.IO, nhìn từ hai trình duyệt cùng lúc.
 *
 * `server/tests/socket.test.mjs` đã kiểm phía server: xác thực token, tách room
 * theo user, phát đúng sự kiện. Cái nó **không** kiểm được là nửa còn lại của
 * đường dây: client có mở kết nối không, có mở tới đúng địa chỉ không, và có vẽ
 * thông báo ra màn hình khi sự kiện tới không.
 *
 * Nửa đó rất dễ hỏng âm thầm. Địa chỉ socket đọc từ `VITE_SOCKET_URL`, mặc định
 * `http://localhost:5000`; đặt sai thì mọi trang vẫn chạy bình thường, chỉ có
 * realtime lặng lẽ không bao giờ kết nối. Không có bài test này thì không ai
 * phát hiện ra.
 *
 * Cách làm: mở hai context riêng — admin giao việc cho member, member phải thấy
 * chuông báo nhảy số mà **không** tải lại trang.
 */

const { test, expect } = require('@playwright/test');
const { login, uniqueName } = require('../support/helpers');
const { SERVER_PORT } = require('../support/env');

test.describe('Thông báo realtime', () => {
  test('client mở được kết nối socket tới đúng server', async ({ page }) => {
    const sockets = [];
    page.on('websocket', (ws) => sockets.push(ws.url()));

    await login(page, 'admin');

    // Chờ kết nối được thiết lập; socket.io thử polling trước rồi mới nâng cấp.
    await expect.poll(() => sockets.length, { timeout: 20_000 }).toBeGreaterThan(0);

    // Phải trỏ về server test chứ không phải cổng 5000 mặc định trong SocketContext
    expect(sockets.some((url) => url.includes(`:${SERVER_PORT}`))).toBe(true);
  });

  test('member nhận được thông báo ngay khi admin giao việc, không cần tải lại', async ({ browser }) => {
    const adminCtx = await browser.newContext();
    const memberCtx = await browser.newContext();

    try {
      const adminPage = await adminCtx.newPage();
      const memberPage = await memberCtx.newPage();

      await login(memberPage, 'member');
      await login(adminPage, 'admin');

      // Chốt số thông báo chưa đọc của member trước khi có gì xảy ra
      const bell = memberPage.getByRole('button', { name: 'Notifications' });
      await expect(bell).toBeVisible({ timeout: 20_000 });
      const before = (await bell.textContent()).trim();

      // Admin tạo một công việc và giao cho member
      const title = uniqueName('E2E Realtime');
      await adminPage.goto('/tasks');
      await adminPage.getByRole('button', { name: 'Tạo công việc' }).click();

      const modal = adminPage.locator('.ant-modal');
      await expect(modal).toBeVisible();
      await modal.locator('#title').fill(title);
      await modal.locator('#project').click();
      await adminPage.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
      await modal.locator('#assignee').click();
      await adminPage.locator('.ant-select-dropdown:visible .ant-select-item-option')
        .filter({ hasText: 'Trần Văn Nam' }).first().click();
      await modal.getByRole('button', { name: 'Tạo công việc' }).click();
      await expect(modal).toBeHidden({ timeout: 20_000 });

      // Trang của member không hề được tải lại — con số phải tự đổi
      await expect
        .poll(async () => (await bell.textContent()).trim(), { timeout: 30_000 })
        .not.toBe(before);

      // Và nội dung thông báo phải nhắc đúng công việc vừa giao
      await bell.click();
      await expect(memberPage.getByText(title).first()).toBeVisible({ timeout: 15_000 });

      // Dọn: xóa công việc vừa tạo
      await adminPage.getByPlaceholder('Tìm theo tiêu đề công việc...').fill(title);
      const row = adminPage.locator('.ant-table-row').filter({ hasText: title });
      await expect(row).toHaveCount(1, { timeout: 20_000 });
      await row.locator('.anticon-delete').first().click();
      await adminPage.getByRole('button', { name: /^(OK|Xóa|Đồng ý)/ }).last().click();
      await expect(adminPage.locator('.ant-table-row').filter({ hasText: title }))
        .toHaveCount(0, { timeout: 20_000 });
    } finally {
      await adminCtx.close();
      await memberCtx.close();
    }
  });
});
