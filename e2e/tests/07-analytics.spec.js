/**
 * Ba màn hình chỉ đọc: Dashboard, Gantt và Báo cáo.
 *
 * Điểm chung của chúng là **không có nút nào để bấm** — giá trị nằm hết ở con
 * số hiển thị. Nên bài test ở đây chủ yếu đối chiếu số liệu với dữ liệu mẫu, và
 * bắt các trường hợp "vẽ được khung nhưng không có dữ liệu".
 */

const { test, expect } = require('@playwright/test');
const { login, watchForProblems } = require('../support/helpers');

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Tổng quan' }).first()).toBeVisible();
  });

  test('bốn thẻ KPI có số thật, không phải dấu gạch ngang', async ({ page }) => {
    const problems = watchForProblems(page);
    const content = page.locator('.ant-layout-content');

    await expect(content).toContainText('Dự án hoạt động');
    await expect(content).toContainText('Công việc đang chạy');
    await expect(content).toContainText('Tổng nhân sự');
    await expect(content).toContainText(/Tỷ lệ xong: \d+%/);
    await expect(content).toContainText(/Sẵn sàng: \d+\/\d+ nhân sự/);

    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    expect(problems).toEqual([]);
  });

  test('khối "Cần xử lý" đếm đúng và không bỏ sót nhóm nào', async ({ page }) => {
    const content = page.locator('.ant-layout-content');
    await expect(content).toContainText('Cần xử lý');
    await expect(content).toContainText('Công việc trễ hạn');
    await expect(content).toContainText('Công việc bị chặn');
    await expect(content).toContainText('Chưa phân công');
    await expect(content).toContainText('Nhân sự quá tải');

    // Dữ liệu mẫu không có việc nào bị chặn hay quá hạn
    await expect(content).toContainText('Tất cả ổn định');
  });

  test('danh sách việc vừa cập nhật dẫn sang trang công việc', async ({ page }) => {
    const content = page.locator('.ant-layout-content');
    await expect(content).toContainText('Công việc vừa cập nhật');
    await expect(content).toContainText('Xây dựng REST APIs Quản lý Đơn hàng');

    await page.getByRole('link', { name: /Xem tất cả/ }).click();
    await expect(page).toHaveURL(/\/tasks/, { timeout: 15_000 });
  });

  test('nút lập phương án phân bổ dẫn sang trang tối ưu hóa', async ({ page }) => {
    await page.getByRole('button', { name: /Lập phương án phân bổ/ }).click();
    await expect(page).toHaveURL(/\/optimization/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Tối ưu hóa Phân bổ Nguồn lực' })).toBeVisible();
  });
});

test.describe('Sơ đồ Gantt', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/gantt');
    await expect(page.getByRole('heading', { name: 'Sơ đồ Gantt (Gantt Chart)' })).toBeVisible();
  });

  test('vẽ đủ thanh cho các công việc của dữ liệu mẫu', async ({ page }) => {
    const problems = watchForProblems(page);
    const content = page.locator('.ant-layout-content');

    await expect(content).toContainText('Công việc (3)');
    for (const title of [
      'Xây dựng REST APIs Quản lý Đơn hàng',
      'Phát triển Giao diện Quản lý Đơn hàng (React)',
      'Thiết kế Design System & Wireframes',
    ]) {
      await expect(content.getByText(title).first()).toBeVisible();
    }

    expect(problems).toEqual([]);
  });

  test('phát hiện và báo được phụ thuộc bị vi phạm', async ({ page }) => {
    // Dữ liệu mẫu cố ý có ràng buộc bị phá; dòng cảnh báo này biến mất nghĩa là
    // phần kiểm tra phụ thuộc đã thôi chạy.
    await expect(page.locator('.ant-layout-content'))
      .toContainText(/\d+ phụ thuộc đang bị vi phạm/);
  });

  test('đổi thang thời gian Ngày/Tuần/Tháng không làm mất dữ liệu', async ({ page }) => {
    const content = page.locator('.ant-layout-content');
    for (const scale of ['Tuần', 'Tháng', 'Ngày']) {
      await content.locator('.ant-segmented-item').filter({ hasText: scale }).first().click();
      await expect(content).toContainText('Công việc (3)');
    }
  });

  test('chú giải trạng thái và đường găng hiện đủ', async ({ page }) => {
    const content = page.locator('.ant-layout-content');
    await expect(content).toContainText('Đường găng (CPM)');
    await expect(content).toContainText('Mũi tên phụ thuộc');
    for (const status of ['Cần làm', 'Đang làm', 'Hoàn thành', 'Bị chặn', 'Thất bại']) {
      await expect(content.getByText(status, { exact: true }).first()).toBeVisible();
    }
  });
});

test.describe('Báo cáo', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Báo cáo & Thống kê Nguồn lực' })).toBeVisible();
  });

  test('Resource Histogram tính đúng tải và nguy cơ burnout', async ({ page }) => {
    const problems = watchForProblems(page);

    const row = page.locator('.ant-table-row').filter({ hasText: 'Trần Văn Nam' });
    await expect(row).toHaveCount(1, { timeout: 20_000 });
    // Giờ công phải cộng từ task thật, không phải số 0 mặc định
    await expect(row).toContainText(/\d+h \/ \d+h/);
    await expect(row).toContainText(/\d+ tasks/);
    await expect(row).toContainText(/Thấp|Trung bình|Cao/);

    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    expect(problems).toEqual([]);
  });

  test('chuyển qua lại giữa bốn tab báo cáo', async ({ page }) => {
    for (const tab of [
      /Phân bổ theo Phòng ban/,
      /Báo cáo Dự án/,
      /Xu hướng theo thời gian/,
      /Resource Histogram/,
    ]) {
      await page.getByRole('tab', { name: tab }).click();
      await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('xuất CSV tải được file thật', async ({ page }) => {
    const download = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByRole('button', { name: /Xuất CSV/ }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.(csv|xlsx?)$/i);
  });

  // Lỗi đã biết: trang Nhân sự đọc trường `currentWorkload` lưu sẵn trong
  // collection Resource, còn trang Báo cáo cộng lại `estimatedHours` của task
  // đang mở. `currentWorkload` chỉ đổi khi có người gọi
  // `POST /api/resources/recalculate-workload`, mà **không màn hình nào gọi** —
  // nên cùng một người hiện 0h ở /resources và 32h ở /reports.
  test.fail('giờ công của cùng một người khớp nhau giữa /resources và /reports', async ({ page }) => {
    const reportRow = page.locator('.ant-table-row').filter({ hasText: 'Trần Văn Nam' });
    await expect(reportRow).toHaveCount(1, { timeout: 20_000 });
    const fromReports = (await reportRow.textContent()).match(/(\d+)h \/ \d+h/)[1];

    await page.goto('/resources');
    const resourceRow = page.locator('.ant-table-row').filter({ hasText: 'Trần Văn Nam' });
    await expect(resourceRow).toHaveCount(1, { timeout: 20_000 });
    const fromResources = (await resourceRow.textContent()).match(/(\d+)h \/ \d+h/)[1];

    expect(fromResources).toBe(fromReports);
  });
});
