/**
 * Tối ưu hóa phân bổ: chạy thuật toán thật từ giao diện và đọc kết quả.
 *
 * Đây là tính năng lõi của hệ thống, và cũng là chỗ duy nhất mà một lần bấm nút
 * kéo theo cả chuỗi: đọc dữ liệu → chạy GA/CSP trên server → lưu lịch sử → vẽ
 * kết quả. Bài test đi hết chuỗi đó chứ không dừng ở chỗ "nút bấm được".
 */

const { test, expect } = require('@playwright/test');
const { login, watchForProblems } = require('../support/helpers');

/** Bấm chạy và chờ tới khi khối kết quả có số liệu thật. */
async function runOptimization(page) {
  await page.getByRole('button', { name: 'Bắt đầu Tối ưu hóa' }).click();
  await expect(page.getByText('Fitness Score')).toBeVisible({ timeout: 60_000 });
}

test.describe('Tối ưu hóa phân bổ', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/optimization');
    await expect(page.getByRole('heading', { name: 'Tối ưu hóa Phân bổ Nguồn lực' })).toBeVisible();
  });

  test('bảng tổng quan dữ liệu đầu vào khớp với dữ liệu mẫu', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Tổng quan Dữ liệu & Mức độ Sẵn sàng' }))
      .toBeVisible();

    const content = page.locator('.ant-layout-content');
    // Phải đọc được số thật, không phải dấu gạch ngang vì chưa tải xong
    await expect(content).toContainText(/\d+ việc chưa gán/);
    // Nhãn được viết hoa bằng CSS `text-transform`, nên chuỗi trong DOM vẫn là
    // chữ thường — so khớp theo đúng cái DOM chứ không theo cái mắt nhìn thấy.
    await expect(content).toContainText('Nhân sự khả dụng');
    await expect(content).toContainText(/\d+h \/ \d+h/);
    await expect(content).toContainText('Sẵn sàng chạy');
  });

  test('chạy Genetic Algorithm ra phương án phân công thật', async ({ page }) => {
    const problems = watchForProblems(page);

    await runOptimization(page);

    // Bốn chỉ số KPI phải có giá trị
    for (const kpi of ['Fitness Score', 'Tổng chi phí', 'Khớp kỹ năng TB', 'Độ lệch tải (StdDev)']) {
      await expect(page.getByText(kpi).first()).toBeVisible();
    }

    // Và quan trọng nhất: bảng phân công phải gán người thật cho việc thật
    await expect(page.getByText('Chi tiết Phân công')).toBeVisible();
    const rows = page.locator('.ant-table-row');
    await expect(rows.first()).toBeVisible();
    await expect(page.getByText(/Đã tìm thấy gán việc cho \d+ công việc/)).toBeVisible();
    await expect(rows.first()).toContainText(/Trần Văn Nam|Lê Thị Hoa|Phạm Minh Tuấn/);

    expect(problems).toEqual([]);
  });

  test('đổi sang CSP Solver cũng cho ra kết quả', async ({ page }) => {
    // Hai thuật toán đi qua hai nhánh code khác hẳn nhau ở server; chỉ chạy GA
    // thì nhánh CSP có hỏng cũng không ai biết.
    await page.locator('#algorithm, .ant-select').first().click();
    const cspOption = page.locator('.ant-select-dropdown:visible .ant-select-item-option')
      .filter({ hasText: /CSP/ }).first();
    await cspOption.click();

    await runOptimization(page);
    await expect(page.getByText(/Đã tìm thấy gán việc cho \d+ công việc/)).toBeVisible();
  });

  test('chọn preset thì bộ trọng số đổi theo và tổng vẫn bằng 1', async ({ page }) => {
    const content = page.locator('.ant-layout-content');

    // Trọng số mặc định: khớp kỹ năng 0.35
    await expect(content).toContainText('Tổng: 1');
    await expect(content).toContainText('● Skill 35%');

    // Tên khả dụng của nút preset gồm cả tên icon ("aim Khớp kỹ năng")
    await page.getByRole('button', { name: /Khớp kỹ năng$/ }).click();
    await expect(content).toContainText('Tổng: 1');
    // Preset phải thật sự đổi được trọng số, không chỉ đổi màu nút
    await expect(content).not.toContainText('● Skill 35%');

    await page.getByRole('button', { name: /Tiết kiệm chi phí$/ }).click();
    await expect(content).toContainText('Tổng: 1');
  });

  test('lần chạy được ghi vào tab Lịch sử', async ({ page }) => {
    await runOptimization(page);

    await page.getByRole('tab', { name: /Lịch sử chạy/ }).click();

    const panel = page.getByRole('tabpanel', { name: /Lịch sử chạy/ });
    await expect(panel.locator('.ant-table-row, .ant-list-item').first())
      .toBeVisible({ timeout: 20_000 });
  });

  // Lỗi đã biết: server trả `averageSkillMatch` và `assignment.skillMatch` ở
  // thang 0–100 (`server/src/algorithms/scoring.js:162`,
  // `server/src/algorithms/genetic/GeneticAlgorithm.js:289`), nhưng
  // `OptimizationResultView.jsx` nhân thêm 100 lần nữa nên màn hình hiện "10000%".
  // `OptimizationCompareView.jsx` không nhân — hai chỗ đang hiểu khác nhau về
  // cùng một con số.
  test.fail('phần trăm khớp kỹ năng nằm trong khoảng 0–100', async ({ page }) => {
    await runOptimization(page);

    const percents = await page.getByText(/^\d+%$/).allTextContents();
    expect(percents.length).toBeGreaterThan(0);
    for (const text of percents) {
      expect(Number(text.replace('%', ''))).toBeLessThanOrEqual(100);
    }
  });
});
