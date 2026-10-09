/**
 * Trường dữ liệu tùy chỉnh: khai ở chi tiết dự án → điền khi tạo việc → thấy trong chi tiết việc
 * → lọc ra đúng việc. Đi qua cả bốn chỗ trường tùy chỉnh chạm tới trên web, bằng trình duyệt thật.
 *
 * Trường tạo ra không bắt buộc, để không chặn các bài tạo việc khác trên cùng dự án mẫu. Database
 * e2e được seed lại mỗi lượt chạy nên không cần dọn định nghĩa trường.
 */

const { test, expect } = require('@playwright/test');
const { login, uniqueName, watchForProblems, showTaskList, SEED } = require('../support/helpers');

const PROJECT = SEED.projects[1]; // Nâng cấp Nền tảng E-Commerce

test('khai trường chọn một, điền khi tạo việc, xem trong chi tiết, lọc theo nó', async ({ page }) => {
  const problems = watchForProblems(page);
  const fieldName = uniqueName('Kênh');
  const title = uniqueName('E2E Việc có trường');
  await login(page, 'admin');

  // 1. Khai trường ở chi tiết dự án
  await page.goto('/projects');
  await page.getByRole('button', { name: PROJECT }).click();
  await expect(page.getByRole('heading', { name: PROJECT })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('tab', { name: 'Trường tùy chỉnh' }).click();
  const panel = page.getByRole('tabpanel', { name: 'Trường tùy chỉnh' });
  await panel.getByRole('button', { name: /Thêm trường/ }).click();
  const row = panel.getByTestId('custom-field-row').last();
  await row.getByPlaceholder('Tên trường').fill(fieldName);
  await row.getByTestId('custom-field-type').click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'Chọn một' }).click();
  const options = row.getByRole('combobox').last();
  await options.fill('Facebook');
  await options.press('Enter');
  await options.fill('TikTok');
  await options.press('Enter');
  await panel.getByRole('button', { name: /Lưu trường/ }).click();
  await expect(page.getByText('Đã lưu trường tùy chỉnh')).toBeVisible();

  // 2. Tạo việc trong dự án đó, điền trường vừa khai
  await page.goto('/tasks');
  await showTaskList(page);
  await page.getByRole('button', { name: 'Tạo công việc' }).click();
  const modal = page.locator('.ant-modal');
  await modal.locator('#title').fill(title);
  await modal.locator('#project').click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: PROJECT }).click();
  await modal.getByLabel(fieldName).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'TikTok' }).click();
  await modal.getByRole('button', { name: 'Tạo công việc' }).click();
  await expect(modal).toBeHidden({ timeout: 20_000 });

  // 3. Chi tiết việc hiện giá trị
  const taskRow = page.locator('.ant-table-row').filter({ hasText: title });
  await expect(taskRow).toHaveCount(1, { timeout: 20_000 });
  await taskRow.locator('.task-title-link').click();
  const values = page.locator('.ant-drawer').getByTestId('task-custom-values');
  await expect(values).toContainText(fieldName);
  await expect(values).toContainText('TikTok');
  await page.keyboard.press('Escape');

  // 4. Lọc theo trường: chọn dự án rồi chọn giá trị
  const filterProject = page.locator('.ant-select').filter({ hasText: 'Tất cả dự án' }).first();
  await filterProject.click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: PROJECT }).click();
  const filterField = page.locator('.ant-select').filter({ hasText: fieldName }).first();
  await filterField.click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: `${fieldName}: Facebook` }).click();
  await expect(page.locator('.ant-table-row').filter({ hasText: title })).toHaveCount(0, { timeout: 20_000 });
  await filterField.click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: `${fieldName}: TikTok` }).click();
  await expect(page.locator('.ant-table-row').filter({ hasText: title })).toHaveCount(1, { timeout: 20_000 });

  // Dọn việc vừa tạo
  await page.locator('.ant-table-row').filter({ hasText: title }).locator('.anticon-delete').first().click();
  await page.getByRole('button', { name: /^(OK|Xóa|Đồng ý)/ }).last().click();
  await expect(page.locator('.ant-table-row').filter({ hasText: title })).toHaveCount(0, { timeout: 20_000 });
  expect(problems).toEqual([]);
});
