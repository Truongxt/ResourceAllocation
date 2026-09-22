/**
 * Phân quyền theo vai trò, nhìn từ phía trình duyệt.
 *
 * `server/tests/task-permissions.test.mjs` đã kiểm ma trận quyền ở tầng API.
 * Bộ này kiểm phần còn lại mà API không nói được: sidebar có giấu đúng mục
 * không, và gõ thẳng URL vào trang cấm thì màn hình hiện ra cái gì.
 *
 * Hai chuyện đó tách biệt nhau và **đều** phải đúng: giấu mục menu mà vẫn vào
 * được bằng URL thì chỉ là giấu, không phải chặn.
 */

const { test, expect } = require('@playwright/test');
const { ACCOUNTS, login } = require('../support/helpers');

/** Mục sidebar mà từng vai trò được thấy. */
const SIDEBAR = {
  admin: {
    visible: ['Dashboard', 'Dự án', 'Công việc', 'Nhân sự', 'Tối ưu hóa', 'Benchmark Studio', 'Gantt Chart', 'Báo cáo'],
    hidden: [],
  },
  project_manager: {
    visible: ['Dashboard', 'Dự án', 'Công việc', 'Nhân sự', 'Gantt Chart', 'Báo cáo'],
    hidden: [],
  },
  member: {
    // Member không quản lý nhân sự và không chạy thuật toán phân bổ
    visible: ['Dashboard', 'Dự án', 'Công việc', 'Gantt Chart', 'Báo cáo'],
    hidden: ['Nhân sự', 'Tối ưu hóa', 'Benchmark Studio'],
  },
};

test.describe('Phân quyền theo vai trò', () => {
  for (const role of ['admin', 'pm', 'member']) {
    test(`sidebar của ${role} hiện đúng các mục được phép`, async ({ page }) => {
      const account = await login(page, role);
      const sidebar = page.locator('.workspace-sidebar');
      const rules = SIDEBAR[account.role];

      for (const label of rules.visible) {
        await expect(
          sidebar.getByRole('menuitem', { name: new RegExp(label + '$') }),
          `${role} phải thấy mục "${label}"`
        ).toBeVisible();
      }
      for (const label of rules.hidden) {
        await expect(
          sidebar.getByRole('menuitem', { name: new RegExp(label + '$') }),
          `${role} không được thấy mục "${label}"`
        ).toHaveCount(0);
      }
    });
  }

  test('member gõ thẳng /resources thì bị chặn ngay tại trang', async ({ page }) => {
    await login(page, 'member');
    await page.goto('/resources');

    // Chặn tại chỗ chứ **không** đá về /login: bị đá ra trông như phiên hết hạn,
    // người dùng sẽ đăng nhập lại rồi gặp đúng màn hình đó lần nữa.
    await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' }))
      .toBeVisible({ timeout: 20_000 });
    await expect(page).not.toHaveURL(/\/login/);
    // Và không được rò rỉ dữ liệu của trang bị cấm
    await expect(page.getByText('Quản lý Nhân sự & Phòng ban')).toHaveCount(0);
  });

  test('member gõ thẳng /optimization và /benchmark cũng bị chặn', async ({ page }) => {
    await login(page, 'member');

    // Hai trang này chặn theo quyền **ứng dụng** (App Admin) chứ không theo vai
    // trò, nên màn hình từ chối là một màn hình khác hẳn với /resources.
    for (const path of ['/optimization', '/benchmark']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: /Chưa được phân quyền Quản trị ứng dụng/ }))
        .toBeVisible({ timeout: 20_000 });
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByText('Cấu hình Thuật toán')).toHaveCount(0);
    }

    // Màn hình này có lối quay ra; màn hình của /resources thì không.
    await page.getByRole('button', { name: /Quay lại Tổng quan Dashboard/ }).click();
    await expect(page).toHaveURL(/\/dashboard|\/$/, { timeout: 20_000 });
  });

  test('member vẫn vào được các trang dùng chung', async ({ page }) => {
    await login(page, 'member');

    for (const [path, heading] of [
      ['/dashboard', 'Tổng quan'],
      ['/tasks', 'Quản lý Công việc'],
      ['/projects', 'Quản lý Dự án'],
      ['/gantt', 'Gantt Chart'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading }).first())
        .toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('Không có quyền truy cập')).toHaveCount(0);
    }
  });

  test('PM vào được trang Nhân sự', async ({ page }) => {
    await login(page, 'pm');
    await page.goto('/resources');

    await expect(page.getByRole('heading', { name: 'Quản lý Nhân sự & Phòng ban' }))
      .toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Không có quyền truy cập')).toHaveCount(0);
  });

  test('Header hiện đúng vai trò của người đang đăng nhập', async ({ page }) => {
    for (const role of ['admin', 'pm', 'member']) {
      await login(page, role);
      await expect(page.getByText(ACCOUNTS[role].name).first()).toBeVisible();
      // Đăng xuất để vòng sau đăng nhập lại từ đầu
      await page.getByText(ACCOUNTS[role].name).first().click();
      await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
      await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
    }
  });
});
