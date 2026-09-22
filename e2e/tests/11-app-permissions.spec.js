/**
 * Quyền theo phân hệ (`User.appPermissions`), nhìn từ hai trình duyệt.
 *
 * `server/tests/notify-session.test.mjs` đã kiểm **hai đầu dây riêng lẻ**: API
 * lưu đúng giá trị, và `requireAppPermission` trả 403 đúng lúc. Cái nó không
 * kiểm được là **mối nối** giữa hai đầu đó — màn hình Cài đặt có ghi đúng cái
 * khóa mà middleware đọc hay không.
 *
 * Mối nối này từng đứt hẳn theo một kiểu khác: trước đợt này `appPermissions`
 * được lưu vào DB nhưng **không route nào đọc**, nên mọi thao tác phân quyền
 * đều báo "thành công" mà không hạn chế được gì. Một bài test chỉ kiểm màn hình
 * lưu xong có hiện thông báo xanh không sẽ xanh cả trước lẫn sau khi sửa. Vì
 * vậy bài ở đây chốt trọn vòng: admin hạ quyền qua UI → người bị hạ **thật sự
 * không làm được nữa** → admin trả quyền lại → làm được như cũ.
 */

const { test, expect, request } = require('@playwright/test');
const { ACCOUNTS, login, uniqueName } = require('../support/helpers');
const { API_URL } = require('../support/env');

// Rộng hơn 1440 mặc định của cả bộ, vì trang Cài đặt có **6 tab nhãn dài**: ở
// 1440 (trừ 240px sidebar) thanh tab tràn và tab "Phân quyền Thao tác & Ứng
// dụng" bị đẩy vào nút `...`. Người dùng thật vẫn mở được qua `...`, nhưng bấm
// thẳng vào nhãn thì không ăn — và bài test sẽ đỏ vì chuyện bố cục chứ không
// phải vì phân quyền. Bộ này kiểm phân quyền, nên cho nó chỗ rộng để thao tác.
test.use({ viewport: { width: 1920, height: 1080 } });

/** Mức quyền mặc định của schema — dùng để trả lại hiện trạng sau khi chạy. */
const DEFAULT_PERMISSIONS = {
  projects: 'manage',
  tasks: 'manage',
  calendar: 'view',
  optimization: 'view',
  reports: 'view',
};

/** Cột trong bảng "Quyền theo Phân hệ": 0 = tài khoản, rồi tới ba phân hệ. */
const MODULE_COLUMN = { 'Dự án': 1, 'Công việc': 2, 'Báo cáo': 3 };

/** Mở Cài đặt → Phân quyền Thao tác & Ứng dụng → Quyền theo Phân hệ. */
async function openModulePermissions(page) {
  await page.goto('/settings');
  await page.getByRole('tab', { name: /Phân quyền Thao tác & Ứng dụng/ }).click();
  await page.getByRole('tab', { name: /Quyền theo Phân hệ/ }).click();
  await expect(page.getByRole('columnheader', { name: 'Tài khoản nhân sự' })).toBeVisible();
}

/**
 * Tìm dòng của một tài khoản, lật trang nếu cần.
 *
 * Bảng phân trang 8 dòng và `GET /auth/users` sắp theo `createdAt` giảm dần, nên
 * vị trí của tài khoản mẫu tụt dần mỗi khi bộ test khác tạo thêm người dùng.
 * Bám cứng vào trang 1 là cách để bài này đỏ vì lý do không liên quan gì tới
 * phân quyền.
 */
async function findUserRow(page, email) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = page.locator('.ant-table-row').filter({ hasText: email });
    if (await row.count()) return row;

    const next = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
    if (!(await next.count())) break;
    await next.click();
    await expect(page.locator('.ant-table-row').first()).toBeVisible();
  }
  throw new Error(`Không tìm thấy dòng của ${email} trong bảng Quyền theo Phân hệ`);
}

/** Đặt mức quyền của một phân hệ cho một tài khoản, qua đúng thao tác người dùng làm. */
async function setModuleLevel(page, email, moduleLabel, level) {
  const row = await findUserRow(page, email);
  await row.locator('td').nth(MODULE_COLUMN[moduleLabel]).locator('.ant-select').click();
  // Ba nhãn không nhãn nào là con của nhãn kia ("Quản lý" / "Chỉ xem" /
  // "Không truy cập") nên lọc theo chuỗi là đủ phân biệt.
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option')
    .filter({ hasText: level })
    .first()
    .click();
  await expect(page.getByText(/Đã đổi quyền/).first()).toBeVisible({ timeout: 20_000 });
}

/**
 * Mức quyền đang hiển thị trên bảng — đọc thẳng **chữ người dùng nhìn thấy**
 * trong ô, không bám vào class nội bộ của Ant Design.
 *
 * (antd v6 để nhãn đang chọn ở `.ant-select-content` chứ không phải
 * `.ant-select-selection-item` như v5; `innerText` của ô không quan tâm tới
 * chuyện đó, và cũng chính là thứ bài test muốn khẳng định.)
 */
async function readModuleLevel(page, email, moduleLabel) {
  const row = await findUserRow(page, email);
  return (await row.locator('td').nth(MODULE_COLUMN[moduleLabel]).innerText()).trim();
}

// Database e2e dùng chung cho cả 11 bộ và chỉ seed một lần ở `globalSetup`. Bài
// dưới đây hạ quyền của một tài khoản mẫu, nên để sót là mọi bộ chạy sau (và cả
// lần chạy sau của chính bộ này) đều hỏng vì một lý do chẳng liên quan gì. Trả
// lại bằng API chứ không qua UI: dọn dẹp phải chạy được cả khi bài test đã đỏ
// giữa chừng và trình duyệt đang ở trạng thái không xác định.
test.afterAll(async () => {
  // Dùng URL tuyệt đối chứ không `baseURL`: `API_URL` kết thúc bằng `/api`, mà
  // `new URL('/auth/login', '…/api')` cắt mất luôn phần `/api` đó.
  const api = await request.newContext();
  try {
    const pmLogin = await api.post(`${API_URL}/auth/login`, {
      data: { email: ACCOUNTS.pm.email, password: ACCOUNTS.pm.password },
    });
    const pmId = (await pmLogin.json()).data?.user?._id;

    const adminLogin = await api.post(`${API_URL}/auth/login`, {
      data: { email: ACCOUNTS.admin.email, password: ACCOUNTS.admin.password },
    });
    const adminToken = (await adminLogin.json()).data?.token;

    if (pmId && adminToken) {
      await api.put(`${API_URL}/auth/users/${pmId}/app-permissions`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { appPermissions: DEFAULT_PERMISSIONS },
      });
    }
  } finally {
    await api.dispose();
  }
});

test.describe('Quyền theo phân hệ', () => {
  test('admin đổi được mức quyền và giá trị sống qua lần tải lại', async ({ page }) => {
    await login(page, 'admin');
    await openModulePermissions(page);

    // Mặc định không ai bị hạn chế — đây là điều kiện để bật tính năng này lên
    // không làm hỏng tài khoản đang có.
    expect(await readModuleLevel(page, ACCOUNTS.pm.email, 'Dự án')).toBe('Quản lý');

    await setModuleLevel(page, ACCOUNTS.pm.email, 'Dự án', 'Chỉ xem');

    // Tải lại rồi đọc lại: nếu chỉ đổi state trong React mà request lưu hỏng,
    // màn hình vẫn hiện "Chỉ xem" cho tới khi rời trang.
    await openModulePermissions(page);
    expect(await readModuleLevel(page, ACCOUNTS.pm.email, 'Dự án')).toBe('Chỉ xem');

    // Hai phân hệ còn lại không bị đụng tới: lưu một khóa không được ghi đè cả object.
    expect(await readModuleLevel(page, ACCOUNTS.pm.email, 'Công việc')).toBe('Quản lý');

    // Trả lại hiện trạng ngay trong bài. Không phải chỉ để giữ sạch database:
    // bài sau cũng hạ đúng ô này xuống "Chỉ xem", mà chọn lại đúng giá trị đang
    // có thì antd không phát `onChange` — bài đó sẽ đỏ vì chờ một thông báo
    // không bao giờ tới, và lý do thật thì nằm ở tận bài này.
    await setModuleLevel(page, ACCOUNTS.pm.email, 'Dự án', 'Quản lý');
  });

  test('hạ xuống "Chỉ xem" thì PM hết tạo được dự án, trả lại thì tạo được ngay', async ({ browser }) => {
    // `test.use` ở trên **không** áp cho context tự tạo bằng `browser.newContext()`,
    // nên màn hình admin phải được cấp chỗ rộng ngay tại đây, nếu không thanh tab
    // Cài đặt lại tràn. Phía PM giữ nguyên 1440 như phần còn lại của bộ test:
    // luồng tạo dự án của PM không liên quan gì tới bố cục tab.
    const adminCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const pmCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    try {
      const adminPage = await adminCtx.newPage();
      const pmPage = await pmCtx.newPage();

      await login(adminPage, 'admin');
      await openModulePermissions(adminPage);
      await setModuleLevel(adminPage, ACCOUNTS.pm.email, 'Dự án', 'Chỉ xem');

      // --- Phía PM: xem thì được, ghi thì không ---
      await login(pmPage, 'pm');
      await pmPage.goto('/projects');
      await expect(pmPage.getByRole('heading', { name: 'Quản lý Dự án' }).first()).toBeVisible();
      // "Chỉ xem" phải còn xem được thật, không phải chặn sạch: danh sách vẫn có hàng.
      await expect(pmPage.locator('.ant-table-row').first()).toBeVisible({ timeout: 20_000 });

      // Mọi lối ghi phải biến mất hẳn. Lúc đầu bộ test này khóa hành vi cũ —
      // nút vẫn hiện, bấm vào thì nhận 403 — và chính nó làm lộ ra rằng giao
      // diện chưa đọc `appPermissions` bao giờ. Chặn ở server là hàng rào an
      // toàn; giấu nút là để người dùng không bấm vào một thứ chắc chắn hỏng.
      await expect(pmPage.getByRole('button', { name: 'Tạo dự án' })).toHaveCount(0);
      await expect(pmPage.locator('.ant-table-row').first().locator('.anticon-delete')).toHaveCount(0);

      // --- Trả quyền lại: chặn phải gỡ được, không phải khóa một chiều ---
      await setModuleLevel(adminPage, ACCOUNTS.pm.email, 'Dự án', 'Quản lý');

      const allowedName = uniqueName('E2E Quyền OK');
      await pmPage.goto('/projects');
      await fillNewProject(pmPage, allowedName);
      await pmPage.locator('.ant-modal').getByRole('button', { name: 'Tạo dự án' }).click();
      await expect(pmPage.locator('.ant-modal')).toBeHidden({ timeout: 20_000 });
      await expect(pmPage.getByText(allowedName).first()).toBeVisible({ timeout: 20_000 });

      // Dọn dự án vừa tạo
      const row = pmPage.locator('.ant-table-row').filter({ hasText: allowedName });
      await row.locator('.anticon-delete').first().click();
      await pmPage.getByRole('button', { name: /^(OK|Xóa|Đồng ý)/ }).last().click();
      await expect(pmPage.locator('.ant-table-row').filter({ hasText: allowedName }))
        .toHaveCount(0, { timeout: 20_000 });
    } finally {
      await adminCtx.close();
      await pmCtx.close();
    }
  });

  test('hạ "Công việc" xuống Không truy cập thì trang bị chặn tại chỗ, vẫn có lối ra', async ({ browser }) => {
    const adminCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const pmCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    try {
      const adminPage = await adminCtx.newPage();
      const pmPage = await pmCtx.newPage();

      await login(adminPage, 'admin');
      await openModulePermissions(adminPage);
      await setModuleLevel(adminPage, ACCOUNTS.pm.email, 'Công việc', 'Không truy cập');

      await login(pmPage, 'pm');
      await pmPage.goto('/tasks');

      // Chặn **tại chỗ** kèm câu giải thích, chứ không phải để trang dựng ra rồi
      // mọi request bên trong nhận 403 — người dùng sẽ thấy một màn hình trống
      // không hiểu vì sao. Và không đá về /login: kiểu đó trông như hết phiên,
      // người dùng đăng nhập lại rồi gặp đúng màn hình đó lần nữa.
      await expect(pmPage.getByRole('heading', { name: 'Phân hệ này đã bị hạn chế' }))
        .toBeVisible({ timeout: 20_000 });
      await expect(pmPage).not.toHaveURL(/\/login/);

      // Chặn tại chỗ thì phải có lối ra — cùng quy ước với hai màn hình từ chối cũ.
      await pmPage.getByRole('button', { name: /Quay lại Tổng quan Dashboard/ }).click();
      await expect(pmPage).toHaveURL(/\/dashboard/, { timeout: 20_000 });

      await setModuleLevel(adminPage, ACCOUNTS.pm.email, 'Công việc', 'Quản lý');
    } finally {
      await adminCtx.close();
      await pmCtx.close();
    }
  });
});

/**
 * Mở modal tạo dự án và điền những trường server thật sự đòi.
 *
 * Giữ bản sao ở đây thay vì import từ `03-projects.spec.js`: file spec không
 * export gì, và đây là chỗ duy nhất ngoài bộ đó cần tới nó.
 */
async function fillNewProject(page, name) {
  await page.getByRole('button', { name: 'Tạo dự án' }).click();
  const modal = page.locator('.ant-modal');
  await expect(modal).toBeVisible();

  await modal.locator('#name').fill(name);
  await modal.locator('#manager').click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
  await modal.locator('#dateRange').click();
  await page.locator('.ant-picker-dropdown:visible .ant-picker-cell-today').first().click();
  await page.locator('.ant-picker-dropdown:visible .ant-picker-cell-in-view').last().click();

  return modal;
}
