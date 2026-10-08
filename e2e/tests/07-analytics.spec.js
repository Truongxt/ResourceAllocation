/**
 * Ba màn hình chỉ đọc: Dashboard, Gantt và Báo cáo.
 *
 * Điểm chung của chúng là **không có nút nào để bấm** — giá trị nằm hết ở con
 * số hiển thị. Nên bài test ở đây chủ yếu đối chiếu số liệu với dữ liệu mẫu, và
 * bắt các trường hợp "vẽ được khung nhưng không có dữ liệu".
 */

const { test, expect } = require('@playwright/test');
const { login, watchForProblems } = require('../support/helpers');
const zlib = require('zlib');

/**
 * Các màu tô (`r g b rg`) xuất hiện trong một file PDF. Giải nén từng stream rồi gom
 * lệnh tô màu — đủ để biết một màu có thật sự được in ra không, không cần dựng ảnh.
 */
const pdfFillColors = (buf) => {
  const s = buf.toString('latin1');
  const fills = [];
  for (const m of s.matchAll(/stream\r?\n/g)) {
    const start = m.index + m[0].length;
    try {
      const ops = zlib.inflateSync(buf.subarray(start, s.indexOf('endstream', start))).toString('latin1');
      for (const f of ops.match(/[\d.]+ [\d.]+ [\d.]+ rg/g) || []) fills.push(f.split(' ').slice(0, 3).map(Number));
    } catch { /* stream không nén bằng Flate (ảnh, font) */ }
  }
  return fills;
};
const hasFill = (fills, hex) => {
  const want = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return fills.some((f) => f.every((v, i) => Math.abs(v - want[i]) < 0.01));
};

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

  test('bản in chứa trọn trục thời gian, co vừa bề ngang trang', async ({ page }, testInfo) => {
    // Thang Ngày là thang rộng nhất: trục thời gian dài hơn màn hình nhiều lần.
    await page.locator('.ant-layout-content .ant-segmented-item').filter({ hasText: 'Ngày' }).first().click();
    await expect(page.locator('.gantt-task-bar').first()).toBeVisible();

    // Bề ngang in được của A4 ngang, lề 10mm: 277mm ≈ 1047px. Trình duyệt dàn trang in
    // theo bề ngang này, nên đo trên viewport cùng cỡ dưới media print.
    const PRINTABLE = 1047;
    await page.setViewportSize({ width: PRINTABLE, height: 900 });
    await page.emulateMedia({ media: 'print' });

    const m = await page.evaluate(() => {
      const wrap = document.querySelector('.gantt-timeline-wrap');
      const cells = document.querySelectorAll('.gantt-header-cell');
      return {
        hiddenBehindScroll: wrap.scrollWidth - wrap.clientWidth,
        viewportRight: document.querySelector('.gantt-viewport').getBoundingClientRect().right,
        lastCellRight: cells[cells.length - 1].getBoundingClientRect().right,
      };
    });
    expect(m.hiddenBehindScroll, 'phần trục thời gian nằm khuất sau thanh cuộn').toBeLessThanOrEqual(1);
    expect(m.viewportRight, 'mép phải biểu đồ').toBeLessThanOrEqual(PRINTABLE + 1);
    expect(m.lastCellRight, 'mép phải ô ngày cuối cùng').toBeLessThanOrEqual(PRINTABLE + 1);

    // PDF thật, giữ lại để mở ra xem khi cần.
    // `printBackground: false` giống mặc định của hộp thoại in: thanh Gantt vẽ bằng màu nền,
    // nên phải tự giữ màu (`print-color-adjust`) chứ không trông vào ô "Đồ họa nền".
    const pdf = await page.pdf({ path: testInfo.outputPath('gantt.pdf'), preferCSSPageSize: true, printBackground: false });
    const fills = pdfFillColors(pdf);
    expect(hasFill(fills, '#3b82f6'), 'thanh "Đang làm" còn màu trong PDF').toBe(true);
    expect(hasFill(fills, '#10b981'), 'thanh "Hoàn thành" còn màu trong PDF').toBe(true);
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

  // Trang Nhân sự đọc trường `currentWorkload` lưu sẵn trong collection
  // Resource, còn trang Báo cáo cộng live `estimatedHours` của task đang mở.
  // Hai nguồn khác nhau nên phải có người giữ cho chúng khớp: mọi đường ghi task
  // qua API đều gọi `syncResourceWorkload`, và seeder cũng gọi một lần ở cuối.
  // Trước đây seeder bỏ sót, nên dữ liệu mẫu hiện 0h ở /resources và 32h ở
  // /reports cho cùng một người.
  test('giờ công của cùng một người khớp nhau giữa /resources và /reports', async ({ page }) => {
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
