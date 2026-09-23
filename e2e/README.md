# Kiểm thử giao diện end-to-end (Playwright)

Bộ này điều khiển **trình duyệt thật** trên **hệ thống thật**: Chromium → client Vite →
server Express → MongoDB. Không có mock nào cả.

## Chỗ đứng của nó so với hai bộ kia

| Bộ | Chạy cái gì | Trả lời được câu hỏi gì |
|----|-------------|--------------------------|
| `server/tests` | Gọi thẳng REST API + Socket.IO | Server trả đúng dữ liệu và đúng mã lỗi không? |
| `client/tests` | Render component trong jsdom | Component vẽ đúng và xử lý đúng sự kiện không? |
| `e2e` (thư mục này) | Trình duyệt thật, cả chuỗi | Ghép lại thì người dùng **dùng được** không? |

Ba lớp không thay thế nhau. Hai lớp dưới chạy nhanh và chỉ ra chính xác chỗ hỏng; lớp này
chậm hơn nhiều nhưng là lớp duy nhất bắt được loại lỗi mà **từng phần đều đúng, ghép lại
thì sai**. Ví dụ có thật trong dự án này:

- `VITE_SOCKET_URL` không được đặt → client mở socket tới `localhost:5000` trong khi server
  nằm ở cổng khác. Mọi API vẫn chạy, mọi test của hai lớp kia vẫn xanh, chỉ có realtime âm
  thầm không bao giờ kết nối.
- Ô nhập ngày bắt đầu dự án nằm trong panel "Cài đặt nâng cao" đang thu gọn và không được
  đánh dấu bắt buộc, trong khi server bắt buộc phải có. Test API gửi kèm ngày nên luôn đạt;
  người dùng thật điền hết các ô nhìn thấy được thì nhận 400.

## Chạy

```bash
npx playwright test                       # cả bộ
npx playwright test e2e/tests/04-tasks.spec.js   # một file
npx playwright test -g "đăng nhập"        # lọc theo tên bài
npx playwright test --headed              # xem trình duyệt chạy
npx playwright test --ui                  # chế độ gỡ lỗi tương tác
npx playwright show-report e2e/.report    # mở báo cáo HTML của lần chạy gần nhất
```

Lần đầu cần tải trình duyệt: `npx playwright install chromium`.

Yêu cầu **MongoDB đang chạy**. Không cần khởi động client/server trước — Playwright tự lo.

## Trình chạy làm gì

Mỗi lần chạy, Playwright:

1. Khởi động **server** trên cổng riêng `5098`, trỏ vào database riêng `resource_allocation_e2e`
2. Khởi động **client** trên cổng riêng `5174`, với `VITE_API_URL` và `VITE_SOCKET_URL` trỏ về server đó
3. `globalSetup` nạp lại dữ liệu mẫu **một lần** cho cả bộ
4. Chạy lần lượt các file test bằng Chromium
5. Tắt cả hai server

| | Môi trường phát triển | `server/tests` | Bộ này |
|-|-----------------------|----------------|--------|
| Server | 5000 | 5099 | **5098** |
| Client | 5173 | — | **5174** |
| Database | `resource_allocation` | `resource_allocation_test` | **`resource_allocation_e2e`** |

Nhờ vậy chạy test không đụng tới dữ liệu đang làm việc dở.

Cổng, URL và biến môi trường khai báo ở một chỗ duy nhất — `support/env.js` — rồi cả
`playwright.config.js`, `support/global-setup.js` và bài test realtime cùng đọc từ đó. Ghi
đè bằng biến môi trường: `E2E_SERVER_PORT`, `E2E_CLIENT_PORT`, `E2E_MONGODB_URI`.

### Vì sao chỉ seed một lần

`server/tests/run.mjs` nạp lại dữ liệu mẫu **trước từng bộ**. Ở đây thì không: seeder xóa
sạch mọi collection, mà lúc `globalSetup` chạy thì server đã lên rồi và các test khác có thể
đang mở trình duyệt — seed giữa chừng sẽ kéo cái nền dữ liệu ra khỏi chân chúng.

Đổi lại, **mỗi bài test tự lo phần dữ liệu nó tạo ra**: đặt tên bằng `uniqueName()` (có hậu
tố ngẫu nhiên) và xóa sau khi dùng. Không bài nào được phép dựa vào số lượng tuyệt đối của
một bảng, chỉ dựa vào "có đúng cái tên mình vừa tạo hay không".

### Dev server hay bản build?

Mặc định dùng Vite dev server: không phải chờ build, sửa test xong chạy lại ngay.

```bash
E2E_CLIENT_MODE=preview npx playwright test
```

chạy `vite build` rồi phục vụ bản tĩnh. Chậm hơn khoảng 90 giây ở đầu, đổi lại:

- test đi qua **đúng bundle sẽ đem đi deploy**, bắt được lỗi chỉ xuất hiện sau khi minify;
- nhẹ RAM hơn nhiều. Dev server giữ cả đồ thị module trong bộ nhớ và biên dịch theo yêu cầu;
  trên máy còn ít RAM trống, Chromium hay bị hệ điều hành giết giữa chừng (`Target crashed`).

Dùng chế độ này khi chạy trên CI, hoặc khi thấy lỗi treo/crash không giải thích được.

## Các bộ

| Bộ | File | Phạm vi |
|----|------|---------|
| Xác thực | `01-auth.spec.js` | Đăng nhập đúng/sai, validate phía client, giữ phiên qua F5 bằng cookie refresh, đăng xuất có thu hồi cookie không, và ranh giới `ProtectedRoute` khi gõ thẳng URL |
| Điều hướng | `02-navigation.spec.js` | 11 trang trong workspace: mỗi trang phải dựng xong nội dung riêng, **không** có ngoại lệ JS và **không** có response 5xx. Kèm sidebar, đánh dấu trang đang mở, URL lạ, thu gọn menu |
| Dự án | `03-projects.spec.js` | Danh sách, tab Phòng ban, tạo → xuất hiện → xóa, chặn form thiếu trường, mở trang chi tiết và đối chiếu số trên nhãn tab với số dòng thật, id không tồn tại |
| Công việc | `04-tasks.spec.js` | Danh sách ↔ Kanban, tìm kiếm, tab không gian làm việc, drawer chi tiết, tạo → xóa, lọc nhanh `?status=blocked` mà Dashboard dẫn sang |
| Nhân sự | `05-resources.spec.js` | Danh sách kèm phòng ban/công suất, lọc theo tải, Skill Matrix (đọc giá trị trong ô nhập), tab Phòng ban |
| Tối ưu hóa | `06-optimization.spec.js` | **Chạy thuật toán thật**: GA và CSP đều phải ra phương án gán người thật cho việc thật; preset đổi được trọng số; lần chạy được ghi vào lịch sử |
| Dashboard / Gantt / Báo cáo | `07-analytics.spec.js` | Thẻ KPI có số thật, khối "Cần xử lý", Gantt vẽ đủ thanh và báo được phụ thuộc bị vi phạm, Resource Histogram, xuất CSV tải được file |
| Phân quyền | `08-permissions.spec.js` | Sidebar giấu đúng mục theo vai trò, **và** gõ thẳng URL vào trang cấm thì bị chặn tại chỗ chứ không bị đá về `/login` |
| Tùy chọn hiển thị | `09-preferences.spec.js` | Đổi ngôn ngữ và giao diện sáng/tối có **sống sót qua F5** không; tìm kiếm toàn cục |
| Realtime | `10-realtime.spec.js` | Hai trình duyệt cùng lúc: admin giao việc → member thấy chuông nhảy số mà không tải lại trang |
| Quyền theo phân hệ | `11-app-permissions.spec.js` | Hai trình duyệt cùng lúc: admin hạ quyền "Dự án" của PM xuống **Chỉ xem** trong Cài đặt → PM xem được nhưng tạo dự án thì bị chặn → trả quyền lại thì tạo được ngay |

Đánh số ở tên file là **thứ tự chạy**, không phải thứ tự phụ thuộc. Bộ `01` đứng đầu vì mọi
bộ khác đều bắt đầu bằng `login()`: đường vào hỏng thì phải thấy nó hỏng ở đúng một chỗ, chứ
không phải dưới dạng 10 bộ cùng timeout vì chờ một cái heading không bao giờ hiện.

## Quy ước viết bài test

### Chọn phần tử

Ưu tiên **vai trò (role) và nhãn người dùng nhìn thấy** — đó chính là thứ bài test đang bảo
vệ. Chỉ rơi xuống class của Ant Design (`.ant-table-row`, `.ant-modal`…) khi phần tử không có
vai trò ARIA nào đọc được, và khi đó luôn kèm điều kiện về nội dung để test không "xanh" chỉ
vì cái khung rỗng vẫn được vẽ ra.

Vài cái bẫy đã gặp, ghi lại để khỏi mất thời gian lần nữa:

- **Tên khả dụng của mục sidebar gồm cả tên icon**: `menuitem "project Dự án"`. Dùng
  `new RegExp(label + '$')` chứ đừng `exact: true`. Mà neo là cần thiết thật — so khớp lỏng
  thì `'Công việc'` trúng luôn cả `'Lịch công việc'`.
- **`{ name: 'VI' }` trúng cả nút `'Nhắc nhở công việc'`** (khớp không phân biệt hoa thường,
  `việc` chứa `vi`). Nút một hai chữ cái luôn cần `exact: true`.
- **Ant Design v6 không còn `.ant-drawer-content`** — dùng `.ant-drawer` hoặc `role="dialog"`.
- **Panel của tab chưa chọn vẫn nằm trong DOM nhưng bị ẩn.** Thu hẹp vào
  `getByRole('tabpanel', …)`, nếu không sẽ khớp trúng phần tử ẩn rồi báo "hidden".
- **Nhãn viết hoa bằng CSS `text-transform`** thì chuỗi trong DOM vẫn là chữ thường. So khớp
  theo đúng cái DOM chứ không theo cái mắt nhìn thấy.
- **Thanh mục của drawer chi tiết công việc và ô mở tìm kiếm toàn cục không có role nào** —
  phải so theo chữ, hoặc bám vào `.header-search-trigger`.

### Đừng chỉ kiểm "trang mở được"

Một trang lỗi API vẫn vẽ ra được cái khung rỗng. `watchForProblems(page)` thu ngoại lệ
JavaScript và response 5xx trong suốt bài test; kết thúc thì `expect(problems).toEqual([])`.
Cố ý bỏ qua 4xx — nhiều bài test chủ động gây ra 401/403 để kiểm ranh giới phân quyền, và
`/auth/refresh` trả 401 khi chưa có cookie là chuyện bình thường.

Tương tự, khi kiểm form validate, hãy nghe luôn `page.on('request', …)`: chặn đúng là
**không gửi request nào** lên server, chứ không phải gửi rồi hứng lỗi về.

### Chờ dữ liệu trước khi đếm

`await page.locator('.ant-table-row').count()` trên bảng chưa tải xong trả `0`, và bài test
"lọc xong còn 1 dòng" biến thành "lọc từ 0 xuống 0" — vẫn xanh mà không kiểm gì cả. Luôn
`await expect(rows.first()).toBeVisible()` trước khi đếm.

### Đăng nhập qua form, không nhét token

Access token của hệ thống nằm trong biến module chứ không ở `localStorage`
(`client/src/services/tokenStore.js`), nên không có cách nào dựng sẵn phiên từ bên ngoài.
Đi qua form cũng đúng tinh thần e2e hơn.

### `test.fail()` khi gặp lỗi chưa sửa được ngay

Tìm ra lỗi mà chưa sửa được ngay thì **viết bài test mô tả hành vi đúng** rồi đánh dấu
`test.fail()`, kèm chú thích chỉ rõ chỗ sai. Lượt chạy sẽ báo *expected failure* — không làm
đỏ CI — nhưng ngày ai đó sửa xong thì chính bài đó chuyển sang **đỏ**, nhắc gỡ dấu đi cùng
lúc. Nhờ vậy lỗi không bị quên mà cũng không làm nhiễu.

Bảy lỗi đợt đầu đều đã sửa nên hiện **không còn `test.fail()` nào**; các bài đó giờ là bài
chống tái phát bình thường. Lược sử từng lỗi và cách nó lọt qua hai lớp test kia:
[docs/TESTING.md](../docs/TESTING.md).

## Viết thêm bộ mới

Dùng chung `support/helpers.js`:

Ba thứ nó cung cấp: `login(page, role)`, `uniqueName(prefix)`, `watchForProblems(page)` —
cùng hằng số `ACCOUNTS` và `SEED`. Cổng/URL thì lấy từ `support/env.js`.

```js
const { test, expect } = require('@playwright/test');
const { login, uniqueName, watchForProblems } = require('../support/helpers');

test.describe('Tên nhóm', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');          // 'admin' | 'pm' | 'member'
    await page.goto('/duong-dan');
  });

  test('mô tả bằng câu người đọc hiểu được', async ({ page }) => {
    const problems = watchForProblems(page);
    // ...
    expect(problems).toEqual([]);
  });
});
```

Một bộ test chỉ có giá trị nếu nó **fail khi thứ nó bảo vệ bị phá**. Trước khi tin vào một
bộ mới, hãy sửa hỏng code có chủ đích rồi chạy lại: không đỏ lên thì bộ đó chưa kiểm cái gì
cả. Quy ước này lấy nguyên từ `client/tests/README.md` và áp dụng như nhau ở đây.
