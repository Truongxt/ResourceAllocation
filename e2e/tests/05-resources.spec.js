/**
 * Nhân sự: danh sách, ma trận kỹ năng, bộ lọc theo tải, và tab Phòng ban.
 *
 * Trang này là đầu vào của thuật toán tối ưu hóa — sai ở đây thì phương án phân
 * bổ sai theo — nên bài test bám vào đúng những con số mà thuật toán đọc:
 * giờ đã phân bổ, định mức, và kỹ năng.
 */

const { test, expect } = require('@playwright/test');
const { SEED, login, watchForProblems } = require('../support/helpers');

test.describe('Quản lý nhân sự', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/resources');
    await expect(page.getByRole('heading', { name: 'Quản lý Nhân sự & Phòng ban' })).toBeVisible();
  });

  test('bảng hiện đủ nhân sự của dữ liệu mẫu kèm phòng ban và công suất', async ({ page }) => {
    await expect(page.locator('.ant-table-row')).toHaveCount(SEED.resourceCount, { timeout: 20_000 });

    const nam = page.locator('.ant-table-row').filter({ hasText: 'Trần Văn Nam' });
    await expect(nam).toHaveCount(1);
    await expect(nam).toContainText('Engineering');
    // Cột công suất phải ra dạng "Xh / Yh", không phải NaN hay rỗng
    await expect(nam).toContainText(/\d+h \/ \d+h/);

    // Và phải là giờ **thật** cộng từ task, không phải số 0 mặc định: seeder gán
    // cho Nam 32h việc đang mở. Trước đây seeder không gọi syncResourceWorkload
    // nên cột này đứng ở 0h trong khi trang Báo cáo nói 32h.
    await expect(nam).toContainText('32h / 40h');
  });

  test('bộ lọc theo tải chỉ giữ lại đúng nhóm được chọn', async ({ page }) => {
    await expect(page.locator('.ant-table-row')).toHaveCount(SEED.resourceCount, { timeout: 20_000 });

    // Dữ liệu mẫu có người 80% và 70% tải, nhưng không ai vượt 100% nên nhóm
    // "Quá tải" phải rỗng
    await page.getByRole('button', { name: 'Quá tải', exact: true }).click();
    await expect(page.locator('.ant-table-row')).toHaveCount(0);

    await page.getByRole('button', { name: 'Còn khả năng nhận việc' }).click();
    await expect(page.locator('.ant-table-row')).toHaveCount(SEED.resourceCount);

    await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
    await expect(page.locator('.ant-table-row')).toHaveCount(SEED.resourceCount);
  });

  test('ma trận kỹ năng mở ra và hiện kỹ năng thật của nhân sự', async ({ page }) => {
    const problems = watchForProblems(page);

    const nam = page.locator('.ant-table-row').filter({ hasText: 'Trần Văn Nam' });
    await nam.getByRole('button', { name: /Matrix/ }).click();

    const modal = page.locator('.ant-modal').filter({ hasText: 'Skill Matrix' }).first();
    await expect(modal).toBeVisible({ timeout: 20_000 });
    await expect(modal).toContainText('Trần Văn Nam');

    // Tên kỹ năng nằm trong ô nhập nên không đọc được qua textContent —
    // phải lấy từ `value` của từng input.
    const skills = await modal.getByPlaceholder('Tên kỹ năng (VD: React)')
      .evaluateAll((inputs) => inputs.map((i) => i.value));
    expect(skills).toEqual(expect.arrayContaining(['React', 'Node.js', 'MongoDB']));

    // Mỗi kỹ năng phải kèm mức thành thạo; thiếu mức thì thuật toán khớp kỹ năng
    // không có gì để chấm điểm.
    await expect(modal).toContainText(/Lv\.\d/);

    await modal.getByRole('button', { name: 'Hủy' }).click();
    await expect(modal).toBeHidden();
    expect(problems).toEqual([]);
  });

  test('tab Phòng ban liệt kê đủ department', async ({ page }) => {
    await page.getByRole('tab', { name: /Phòng ban/ }).click();

    const panel = page.getByRole('tabpanel', { name: /Phòng ban/ });
    await expect(panel.locator('.ant-table-row, .ant-card').first()).toBeVisible({ timeout: 20_000 });
    for (const dept of ['Engineering', 'Design', 'Quality']) {
      await expect(panel.getByText(dept, { exact: false }).first()).toBeVisible();
    }
  });

  test('dải chỉ số ở đầu trang khớp với số dòng trong bảng', async ({ page }) => {
    // Hai con số này đến từ hai nhánh tính khác nhau trong cùng một trang; lệch
    // nhau nghĩa là một bên đang đọc dữ liệu cũ.
    await expect(page.locator('.ant-table-row')).toHaveCount(SEED.resourceCount, { timeout: 20_000 });

    await expect(page.getByRole('heading', { name: 'Tải công việc của nhóm' })).toBeVisible();

    const strip = page.locator('.metric-strip, .section-heading').first();
    await expect(strip).toBeVisible();
    await expect(page.getByText(String(SEED.resourceCount)).first()).toBeVisible();
  });
});
