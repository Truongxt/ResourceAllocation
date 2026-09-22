/**
 * Dự án: danh sách, tạo mới, mở chi tiết, xóa — và tab Phòng ban.
 *
 * Bộ này **có ghi vào database dùng chung**, nên mọi bản ghi nó tạo đều mang tên
 * có hậu tố ngẫu nhiên và được xóa ở cuối bài. Không bài nào dựa vào số lượng
 * tuyệt đối của bảng, chỉ dựa vào "có/không có đúng cái tên mình vừa tạo".
 */

const { test, expect } = require('@playwright/test');
const { SEED, login, uniqueName, watchForProblems } = require('../support/helpers');

/** Mở modal tạo dự án và điền những gì server thật sự đòi. */
async function fillNewProject(page, name) {
  await page.getByRole('button', { name: 'Tạo dự án' }).click();
  const modal = page.locator('.ant-modal');
  await expect(modal).toBeVisible();

  await modal.locator('#name').fill(name);

  // PM là trường bắt buộc duy nhất ngoài tên ở phần hiện sẵn của form
  await modal.locator('#manager').click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();

  // Ngày bắt đầu/kết thúc nằm trong panel "Cài đặt nâng cao" đang thu gọn, nhưng
  // server bắt buộc phải có — nên luồng tạo dự án thật sự phải mở panel này ra.
  await modal.getByText('Cài đặt nâng cao', { exact: false }).click();
  await modal.locator('#dateRange').click();
  await page.locator('.ant-picker-dropdown:visible .ant-picker-cell-today').first().click();
  await page.locator('.ant-picker-dropdown:visible .ant-picker-cell-in-view').last().click();

  return modal;
}

test.describe('Quản lý dự án', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'Quản lý Dự án' }).first()).toBeVisible();
  });

  test('bảng hiện đúng các dự án của dữ liệu mẫu', async ({ page }) => {
    for (const name of SEED.projects) {
      await expect(page.getByText(name).first()).toBeVisible();
    }
    // Bảng phải có hàng thật, không phải cái khung rỗng vẽ sẵn
    await expect(page.locator('.ant-table-row').first()).toBeVisible();
  });

  test('tab Phòng ban liệt kê đủ department của dữ liệu mẫu', async ({ page }) => {
    await page.getByRole('tab', { name: /Phòng ban \(Departments\)/ }).click();

    await expect(page.getByRole('tab', { name: new RegExp(`\\(${SEED.departmentCount}\\)`) })).toBeVisible();
    for (const dept of ['Engineering', 'Design', 'Quality']) {
      await expect(page.getByText(dept, { exact: false }).first()).toBeVisible();
    }
  });

  test('tạo dự án mới rồi xóa đi', async ({ page }) => {
    const problems = watchForProblems(page);
    const name = uniqueName('E2E Dự án');

    const modal = await fillNewProject(page, name);
    await modal.getByRole('button', { name: 'Tạo dự án' }).click();

    await expect(modal).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 20_000 });

    // Dọn: xóa đúng dòng vừa tạo
    const row = page.locator('.ant-table-row').filter({ hasText: name });
    await expect(row).toHaveCount(1);
    await row.locator('.anticon-delete').first().click();
    await page.getByRole('button', { name: /^(OK|Xóa|Đồng ý)/ }).last().click();

    await expect(page.locator('.ant-table-row').filter({ hasText: name })).toHaveCount(0, { timeout: 20_000 });
    expect(problems).toEqual([]);
  });

  test('thiếu tên dự án thì form chặn tại chỗ, không gửi request', async ({ page }) => {
    const created = [];
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().endsWith('/api/projects')) created.push(r.url());
    });

    await page.getByRole('button', { name: 'Tạo dự án' }).click();
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible();

    // Tên là trường bắt buộc duy nhất còn trống khi vừa mở modal: PM đã được
    // điền sẵn bằng chính người đang đăng nhập.
    await modal.getByRole('button', { name: 'Tạo dự án' }).click();

    await expect(modal.getByText('Vui lòng nhập tên dự án')).toBeVisible();
    await expect(modal).toBeVisible();
    expect(created).toEqual([]);
  });

  // Lỗi đã biết: `startDate`/`endDate` là bắt buộc ở server
  // (`server/src/routes/project.routes.js`) nhưng ô nhập chúng nằm trong panel
  // "Cài đặt nâng cao" đang thu gọn và **không** được đánh dấu bắt buộc ở form.
  // Người dùng điền hết các trường thấy được rồi bấm Tạo sẽ nhận 400 chứ không
  // phải một dòng nhắc ngay tại ô còn thiếu.
  //
  // Bài này mô tả hành vi *đúng*; `test.fail()` khiến nó chuyển sang đỏ ngay khi
  // ai đó sửa xong, để cái chú thích này được gỡ đi cùng lúc.
  test.fail('chỉ điền các trường bắt buộc nhìn thấy được thì vẫn tạo được dự án', async ({ page }) => {
    const name = uniqueName('E2E Thiếu ngày');

    await page.getByRole('button', { name: 'Tạo dự án' }).click();
    const modal = page.locator('.ant-modal');
    await modal.locator('#name').fill(name);
    await modal.locator('#manager').click();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
    await modal.getByRole('button', { name: 'Tạo dự án' }).click();

    await expect(modal).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 });
  });

  test('mở chi tiết một dự án thì thấy đủ các tab và số liệu của nó', async ({ page }) => {
    const problems = watchForProblems(page);

    await page.getByRole('button', { name: SEED.projects[0] }).click();

    await expect(page).toHaveURL(/\/projects\/[a-f0-9]{24}/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: SEED.projects[0] })).toBeVisible({ timeout: 20_000 });

    for (const tab of ['Tổng quan', /Công việc \(\d+\)/, /Thành viên \(\d+\)/, 'Phân quyền thao tác']) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible();
    }

    // Nội dung của các tab chưa chọn vẫn nằm trong DOM nhưng bị ẩn, nên phải
    // thu hẹp vào đúng panel đang hiển thị.
    const memberTab = page.getByRole('tab', { name: /Thành viên \(\d+\)/ });
    const memberCount = Number((await memberTab.textContent()).match(/\((\d+)\)/)[1]);
    await memberTab.click();

    const activePanel = page.getByRole('tabpanel', { name: /Thành viên/ });
    await expect(activePanel.getByRole('heading', { name: 'Danh sách thành viên' })).toBeVisible();
    // Con số trên nhãn tab phải khớp số dòng thật — lệch nhau nghĩa là một trong
    // hai nguồn dữ liệu đã cũ.
    await expect(activePanel.locator('.ant-table-row')).toHaveCount(memberCount);

    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    expect(problems).toEqual([]);
  });

  test('nút quay lại của trang chi tiết đưa về đúng danh sách', async ({ page }) => {
    await page.getByRole('button', { name: SEED.projects[0] }).click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9]{24}/, { timeout: 20_000 });

    await page.getByRole('button', { name: 'Danh sách dự án' }).click();

    await expect(page).toHaveURL(/\/projects$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Quản lý Dự án' }).first()).toBeVisible();
  });

  test('id dự án không tồn tại thì báo lỗi chứ không để màn hình trắng', async ({ page }) => {
    // 24 ký tự hex hợp lệ về hình thức nhưng không có trong database
    await page.goto('/projects/000000000000000000000000');
    await expect(
      page.getByText(/không tìm thấy|not found|lỗi/i).first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
