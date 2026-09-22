/**
 * Công việc: danh sách/Kanban, lọc, tạo–sửa–xóa, và drawer chi tiết.
 *
 * Trang này là nơi người dùng ở lâu nhất, nên bộ test đi theo đúng thứ tự thao
 * tác thật: xem danh sách → lọc → mở chi tiết → tạo việc mới → dọn.
 */

const { test, expect } = require('@playwright/test');
const { login, uniqueName, watchForProblems } = require('../support/helpers');

const SEED_TASK = 'Xây dựng REST APIs Quản lý Đơn hàng';

test.describe('Quản lý công việc', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Quản lý Công việc' }).first()).toBeVisible();
  });

  test('danh sách hiện công việc của dữ liệu mẫu kèm dự án và người thực hiện', async ({ page }) => {
    const row = page.locator('.ant-table-row').filter({ hasText: SEED_TASK });
    await expect(row).toHaveCount(1);
    // Cột phải nối được sang dữ liệu liên quan chứ không chỉ hiện id
    await expect(row).toContainText('Nâng cấp Nền tảng E-Commerce');
    await expect(row).toContainText('Trần Văn Nam');
  });

  test('chuyển qua Kanban thì công việc nằm đúng cột trạng thái', async ({ page }) => {
    await page.locator('.ant-segmented-item').filter({ hasText: 'Kanban' }).first().click();

    // Cột "Đang làm" phải chứa đúng công việc đang ở trạng thái in_progress
    const board = page.locator('.ant-layout-content');
    await expect(board).toContainText('Cần làm');
    await expect(board).toContainText('Đang làm');
    await expect(board).toContainText('Hoàn thành');
    await expect(board).toContainText(SEED_TASK);

    // Quay lại danh sách thì bảng phải hiện lại
    await page.locator('.ant-segmented-item').filter({ hasText: 'Danh sách' }).first().click();
    await expect(page.locator('.ant-table-row').filter({ hasText: SEED_TASK })).toHaveCount(1);
  });

  test('tìm kiếm theo tiêu đề thu hẹp đúng danh sách', async ({ page }) => {
    // Chờ dữ liệu về trước khi đếm: `count()` trên bảng chưa tải xong trả 0 và
    // biến bài test thành "thu hẹp từ 0 xuống 0", tức là không kiểm gì cả.
    await expect(page.locator('.ant-table-row').first()).toBeVisible({ timeout: 20_000 });
    const before = await page.locator('.ant-table-row').count();
    expect(before).toBeGreaterThan(1);

    await page.getByPlaceholder('Tìm theo tiêu đề công việc...').fill('REST APIs');

    await expect(page.locator('.ant-table-row')).toHaveCount(1);
    await expect(page.locator('.ant-table-row').first()).toContainText(SEED_TASK);

    // Từ khóa không khớp gì thì phải ra trạng thái rỗng, không phải danh sách cũ
    await page.getByPlaceholder('Tìm theo tiêu đề công việc...').fill('zzz-khong-co-gi-zzz');
    await expect(page.locator('.ant-table-row')).toHaveCount(0);
  });

  test('các tab không gian làm việc lọc theo vai trò của người đăng nhập', async ({ page }) => {
    for (const tab of ['Việc tôi làm', 'Việc tôi giao', 'Việc tôi theo dõi', 'Tất cả công việc']) {
      await page.getByRole('tab', { name: tab }).click();
      // Tab nào cũng phải dựng xong không nổ lỗi; "Tất cả" thì phải có dữ liệu trở lại
      await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
    }
    await expect(page.locator('.ant-table-row').filter({ hasText: SEED_TASK })).toHaveCount(1);
  });

  test('mở chi tiết một công việc thì drawer hiện đúng nội dung', async ({ page }) => {
    const problems = watchForProblems(page);

    const row = page.locator('.ant-table-row').filter({ hasText: SEED_TASK });
    await expect(row).toHaveCount(1, { timeout: 20_000 });
    await row.locator('.task-title-link').click();

    const drawer = page.locator('.ant-drawer');
    await expect(drawer).toBeVisible({ timeout: 20_000 });
    await expect(drawer).toContainText(SEED_TASK);
    // Drawer phải nạp được dữ liệu liên quan chứ không chỉ cái tiêu đề truyền vào
    await expect(drawer).toContainText('Nâng cấp Nền tảng E-Commerce');
    await expect(drawer).toContainText('Trần Văn Nam');
    // Thanh chuyển mục là một tablist thật, nên bám được theo vai trò thay vì
    // theo chữ hiện trên màn hình.
    const tablist = drawer.getByRole('tablist', { name: 'Các mục của công việc' });
    await expect(tablist).toBeVisible();
    for (const section of ['Thông tin', 'Checklist', 'Bình luận', 'Công việc con', 'Lịch sử hạn']) {
      await expect(tablist.getByRole('tab', { name: new RegExp(section) }).first()).toBeVisible();
    }

    // Đúng một tab được chọn, và nội dung tương ứng phải là một tabpanel gắn với nó.
    await expect(drawer.getByRole('tab', { selected: true })).toHaveCount(1);
    const checklistTab = tablist.getByRole('tab', { name: /Checklist/ }).first();
    await checklistTab.click();
    await expect(checklistTab).toHaveAttribute('aria-selected', 'true');
    const panelId = await checklistTab.getAttribute('aria-controls');
    await expect(drawer.locator(`#${panelId}`)).toBeVisible();

    // Mũi tên phải chuyển tab: cả dải chỉ có một điểm dừng Tab.
    await checklistTab.press('ArrowRight');
    await expect(checklistTab).toHaveAttribute('aria-selected', 'false');
    await expect(drawer.getByRole('tab', { selected: true })).toHaveCount(1);

    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    expect(problems).toEqual([]);
  });

  test('tạo công việc mới rồi xóa đi', async ({ page }) => {
    const problems = watchForProblems(page);
    const title = uniqueName('E2E Công việc');

    await page.getByRole('button', { name: 'Tạo công việc' }).click();
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible();

    await modal.locator('#title').fill(title);
    await modal.locator('#project').click();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();

    await modal.getByRole('button', { name: 'Tạo công việc' }).click();
    await expect(modal).toBeHidden({ timeout: 20_000 });

    const row = page.locator('.ant-table-row').filter({ hasText: title });
    await expect(row).toHaveCount(1, { timeout: 20_000 });

    await row.locator('.anticon-delete').first().click();
    await page.getByRole('button', { name: /^(OK|Xóa|Đồng ý)/ }).last().click();
    await expect(page.locator('.ant-table-row').filter({ hasText: title })).toHaveCount(0, { timeout: 20_000 });

    expect(problems).toEqual([]);
  });

  test('thiếu tiêu đề thì form chặn, không gửi request', async ({ page }) => {
    const posted = [];
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().endsWith('/api/tasks')) posted.push(r.url());
    });

    await page.getByRole('button', { name: 'Tạo công việc' }).click();
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Tạo công việc' }).click();

    await expect(modal.locator('.ant-form-item-explain-error').first()).toBeVisible();
    await expect(modal).toBeVisible();
    expect(posted).toEqual([]);
  });

  test('lọc nhanh từ URL: chỉ hiện việc đang bị chặn', async ({ page }) => {
    // Dashboard dẫn sang đây bằng đúng link này, nên tham số phải có tác dụng
    await page.goto('/tasks?status=blocked');
    await expect(page.getByRole('heading', { name: 'Quản lý Công việc' }).first()).toBeVisible();

    const rows = page.locator('.ant-table-row');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText('Bị chặn');
    }
  });
});
