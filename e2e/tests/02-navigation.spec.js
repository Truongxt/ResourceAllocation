/**
 * Khung điều hướng: 11 trang trong workspace có dựng được nội dung thật không,
 * đi bằng sidebar có tới đúng chỗ không, và URL lạ có bị nuốt gọn không.
 *
 * Mỗi trang được kiểm bằng **ba** điều kiện chứ không chỉ "URL đổi":
 *   1. tiêu đề riêng của trang hiện ra (chunk `React.lazy` đã tải xong),
 *   2. không có ngoại lệ JavaScript nào,
 *   3. không có response 5xx nào.
 *
 * Điều kiện 2 và 3 mới là phần đáng giá: một trang lỗi API vẫn vẽ được cái khung
 * rỗng, và chỉ nhìn tiêu đề thì test vẫn xanh trong khi màn hình trống trơn.
 */

const { test, expect } = require('@playwright/test');
const { login, watchForProblems } = require('../support/helpers');

// Mỗi mục: [đường dẫn, tiêu đề trong Header, một dấu hiệu chỉ trang đó mới có]
const PAGES = [
  ['/dashboard', 'Tổng quan', 'Cần xử lý'],
  ['/projects', 'Quản lý Dự án', 'Phòng ban (Departments)'],
  ['/tasks', 'Quản lý Công việc', 'Tất cả công việc'],
  ['/calendar', 'Tổng quan', 'Hôm nay'],
  ['/resources', 'Quản lý Nhân sự', 'Tải công việc của nhóm'],
  ['/optimization', 'Tối ưu hóa Phân bổ', 'Cấu hình Thuật toán'],
  ['/benchmark', 'Tổng quan', 'Experimental Benchmark Studio'],
  ['/gantt', 'Gantt Chart', 'Sơ đồ Gantt'],
  ['/reports', 'Báo cáo', 'Resource Histogram'],
  ['/activity-logs', 'Nhật ký Hoạt động', 'Activity Logs'],
  ['/settings', 'Cài đặt tài khoản', 'Hồ sơ cá nhân'],
];

test.describe('Điều hướng workspace', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
  });

  for (const [path, title, marker] of PAGES) {
    test(`${path} dựng xong nội dung, không lỗi JS, không 5xx`, async ({ page }) => {
      const problems = watchForProblems(page);

      await page.goto(path);

      await expect(page.getByRole('heading', { name: title }).first())
        .toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(marker, { exact: false }).first())
        .toBeVisible({ timeout: 30_000 });

      // Cho các lời gọi API muộn (biểu đồ, đếm badge) kịp trả lời rồi mới kết luận.
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
      expect(problems, `Trang ${path} phát sinh lỗi`).toEqual([]);
    });
  }

  test('bấm sidebar đi được tới các trang chính', async ({ page }) => {
    const sidebar = page.locator('.workspace-sidebar');

    for (const [label, expectedPath, title] of [
      ['Dự án', '/projects', 'Quản lý Dự án'],
      ['Công việc', '/tasks', 'Quản lý Công việc'],
      ['Gantt Chart', '/gantt', 'Gantt Chart'],
      ['Báo cáo', '/reports', 'Báo cáo'],
      ['Dashboard', '/dashboard', 'Tổng quan'],
    ]) {
      // Tên khả dụng của mục menu gồm cả tên icon ("project Dự án"), nên neo vào
      // cuối chuỗi thay vì so khớp tuyệt đối — và neo là cần thiết, vì so khớp
      // lỏng thì "Công việc" trúng luôn cả "Lịch công việc".
      await sidebar.getByRole('menuitem', { name: new RegExp(label + '$') }).click();
      await expect(page).toHaveURL(new RegExp(`${expectedPath}$`), { timeout: 20_000 });
      await expect(page.getByRole('heading', { name: title }).first()).toBeVisible({ timeout: 30_000 });
    }
  });

  test('mục sidebar của trang đang mở được đánh dấu đang chọn', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Báo cáo' }).first()).toBeVisible();

    const selected = page.locator('.workspace-sidebar .ant-menu-item-selected');
    await expect(selected).toHaveCount(1);
    await expect(selected).toContainText('Báo cáo');
  });

  test('URL không tồn tại thì đẩy về trang gốc chứ không để màn hình trắng', async ({ page }) => {
    await page.goto('/khong-co-trang-nay');
    await expect(page).toHaveURL(/localhost:\d+\/$/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Tổng quan' }).first()).toBeVisible({ timeout: 30_000 });
  });

  test('thu gọn sidebar vẫn giữ được đường đi và nội dung trang', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'Quản lý Dự án' }).first()).toBeVisible();

    await page.getByText('Thu gọn thanh bên', { exact: false }).first().click()
      .catch(async () => { await page.locator('.workspace-sidebar').getByText(/Thu gọn/).first().click(); });

    await expect(page.locator('.workspace-sidebar.ant-layout-sider-collapsed')).toBeVisible({ timeout: 10_000 });
    // Thu gọn chỉ là chuyện hiển thị: nội dung trang không được mất đi
    await expect(page.getByRole('heading', { name: 'Quản lý Dự án' }).first()).toBeVisible();
  });
});
