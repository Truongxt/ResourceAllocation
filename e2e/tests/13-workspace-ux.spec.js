const { test, expect } = require('@playwright/test');
const { login, showTaskList, watchForProblems } = require('../support/helpers');

async function expectNoPageOverflow(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
}

test('desktop: điều hướng bàn phím, lọc ưu tiên và form nâng cao', async ({ page }, testInfo) => {
  const problems = watchForProblems(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await page.goto('/tasks');
  await showTaskList(page);
  await expect(page.locator('.task-title-link').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Tạo công việc$/ })).toHaveCount(1);
  const collapse = page.getByRole('button', { name: 'Thu gọn menu', exact: true });
  await collapse.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Mở rộng menu', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mở rộng menu', exact: true }).click();
  await page.getByRole('combobox', { name: 'Độ ưu tiên', exact: true }).click();
  await expect(page.locator('.ant-select-dropdown:visible .ant-select-item-option')).not.toHaveCount(0);
  await page.keyboard.press('Escape');
  await expectNoPageOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('tasks-desktop.png'), fullPage: true, animations: 'disabled' });
  for (const width of [768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoPageOverflow(page);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: /Tạo công việc$/ }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.locator('.task-form-advanced')).not.toHaveAttribute('open');
  await modal.getByText('Cấu hình nâng cao', { exact: true }).click();
  await modal.getByRole('button', { name: /Thêm kỹ năng/ }).click();
  await modal.getByRole('combobox', { name: 'Tên kỹ năng' }).fill('React');
  await modal.getByText('Cấu hình nâng cao', { exact: true }).click();
  await modal.getByText('Cấu hình nâng cao', { exact: true }).click();
  await expect(modal.getByRole('combobox', { name: 'Tên kỹ năng' })).toHaveValue('React');
  await modal.getByRole('button', { name: 'Hủy', exact: true }).click();
  expect(problems).toEqual([]);
});

test('điện thoại: menu ngăn kéo, danh sách gọn và form không tràn ngang', async ({ page }, testInfo) => {
  const problems = watchForProblems(page);
  await login(page);
  await page.goto('/tasks');
  await showTaskList(page);
  for (const width of [375, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole('button', { name: 'Mở menu điều hướng' })).toBeVisible();
    await expect(page.locator('.task-mobile-details').first()).toBeVisible();
    await expectNoPageOverflow(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`tasks-mobile-${width}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: 'Mở menu điều hướng' }).click();
  const nav = page.getByRole('dialog', { name: 'Điều hướng' });
  await expect(nav.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await expect(page.getByRole('button', { name: 'Mở menu điều hướng' })).toBeFocused();
  await page.getByRole('button', { name: /Tạo công việc$/ }).click();
  const modal = page.getByRole('dialog');
  await modal.getByText('Cấu hình nâng cao', { exact: true }).click();
  await modal.getByRole('button', { name: /Thêm kỹ năng/ }).click();
  await modal.getByRole('combobox', { name: 'Tên kỹ năng' }).fill('React');
  await expect.poll(() => modal.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('task-form-mobile.png'), fullPage: true });
  await modal.getByRole('button', { name: 'Hủy', exact: true }).click();
  await page.getByRole('button', { name: /Chuyển giao diện/ }).click();
  await expectNoPageOverflow(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('tasks-mobile-alternate-theme.png'), fullPage: true, animations: 'disabled' });
  expect(problems).toEqual([]);
});
