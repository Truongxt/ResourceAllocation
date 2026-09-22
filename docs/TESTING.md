# 🧪 Chiến lược kiểm thử

Dự án có **ba lớp kiểm thử**, mỗi lớp trả lời một câu hỏi khác nhau. Không lớp nào thay thế
được lớp nào.

| Lớp | Thư mục | Chạy bằng | Quy mô | Trả lời câu hỏi |
|-----|---------|-----------|--------|-----------------|
| Đơn vị + API | `server/tests/` | `npm test` trong `server/` | 18 bộ | Server trả đúng dữ liệu, đúng mã lỗi, thuật toán tính đúng không? |
| Component | `client/tests/` | `npm test` trong `client/` | 3 file logic + 8 file component | Component vẽ đúng, xử lý đúng sự kiện không? |
| Giao diện end-to-end | `e2e/` | `npm run test:e2e` ở gốc | 82 bài / 10 file | Ghép tất cả lại thì người dùng **dùng được** không? |

Hai lớp đầu chạy trong vòng vài phút. Lớp e2e mất khoảng **10–15 phút** (đo trên máy phát
triển, 1 worker) vì nó khởi động thật, đăng nhập thật và chờ API thật ở từng bài.

Chi tiết từng lớp:

- [`server/tests/README.md`](../server/tests/README.md) — 18 bộ, gồm cả kiểm thử đơn vị cho GA/CSP/scoring
- [`client/tests/README.md`](../client/tests/README.md) — logic thuần chạy bằng `node`, component chạy bằng vitest
- [`e2e/README.md`](../e2e/README.md) — 10 bộ điều khiển Chromium trên hệ thống thật

## Chạy tất cả

```bash
# Lớp 1 — cần MongoDB đang chạy
cd server && npm test

# Lớp 2 — không cần gì
cd client && npm test

# Lớp 3 — cần MongoDB; tự khởi động client + server
npm run test:e2e                    # ở thư mục gốc
npm run test:e2e:install            # lần đầu: tải trình duyệt cho Playwright
```

Ba lớp dùng **ba database và ba cặp cổng khác nhau**, nên chạy lớp nào cũng không đụng tới
môi trường phát triển:

| | Môi trường phát triển | `server/tests` | `e2e` |
|-|-----------------------|----------------|-------|
| Server | 5000 | 5099 | 5098 |
| Client | 5173 | — | 5174 |
| Database | `resource_allocation` | `resource_allocation_test` | `resource_allocation_e2e` |

## Vì sao cần lớp thứ ba

Hai lớp đầu chạy nhanh và chỉ thẳng ra chỗ hỏng. Nhưng cả hai đều kiểm **từng mảnh riêng**,
nên có một loại lỗi chúng không bao giờ bắt được: từng mảnh đều đúng, ghép lại thì sai.

Đợt dựng bộ e2e này tìm ra **bảy** lỗi thuộc đúng loại đó. Không lỗi nào trong số đó làm đỏ
`server/tests` hay `client/tests` — và tất cả đều đã được sửa, kèm bài test chống tái phát.

## Những lỗi bộ e2e đã tìm ra và đã sửa

Giữ lại đây vì mỗi lỗi kèm một bài học về **cách nó lọt qua hai lớp test kia**, và vì mỗi
mục chỉ ra đúng bài test đang giữ cho nó không quay lại.

### 1. Không tạo được dự án nếu chỉ điền các trường nhìn thấy được

`startDate`/`endDate` bắt buộc ở server (`server/src/routes/project.routes.js`) nhưng ô nhập
chúng nằm trong panel *"Cài đặt nâng cao"* đang thu gọn và **không** đánh dấu bắt buộc ở
form. Người dùng điền tên + PM (hai trường duy nhất có dấu bắt buộc), bấm Tạo → nhận 400 dưới
dạng toast, không có dòng nhắc nào tại ô còn thiếu, mà ô đó thì đang bị gấp lại.

**Lọt qua thế nào:** test API luôn gửi kèm `startDate`, nên nhánh này chưa bao giờ được đi
qua theo đúng cách người dùng đi.

**Đã sửa:** đưa ô thời gian ra ngoài panel và đánh dấu bắt buộc. Trường bắt buộc không được
nằm trong phần gấp lại.
**Test giữ:** `e2e/tests/03-projects.spec.js` — hai bài, một kiểm chặn tại form, một khóa vị
trí của ô.

### 2. Phần trăm khớp kỹ năng hiện thành `10000%`

Server trả thang **0–100** (`server/src/algorithms/scoring.js:162`,
`server/src/algorithms/genetic/GeneticAlgorithm.js:289`) nhưng `OptimizationResultView.jsx`
nhân thêm 100 lần nữa. Đáng chú ý: `OptimizationCompareView.jsx` **không** nhân — hai
component đang hiểu khác nhau về cùng một con số, và cái đúng là cái không nhân.

**Lọt qua thế nào:** không lớp nào kiểm con số *hiển thị*. API trả đúng, component render ra
sai, và không có assertion nào nhìn vào chuỗi cuối cùng trên màn hình.

**Đã sửa:** bỏ `* 100` ở cả hai chỗ.
**Test giữ:** `e2e/tests/06-optimization.spec.js` — một bài quét mọi chuỗi `\d+%` trên màn
hình kết quả và bắt buộc ≤ 100.

### 3. Giờ công của cùng một người lệch nhau giữa hai trang

Với dữ liệu mẫu, Trần Văn Nam hiện **0h / 40h** ở `/resources` nhưng **32h / 40h** ở
`/reports`. Hai trang đọc hai nguồn: trang Nhân sự đọc trường `currentWorkload` lưu sẵn,
trang Báo cáo cộng live `estimatedHours` của task đang mở.

**Chẩn đoán đầu tiên là sai, ghi lại vì nó là cái bẫy đáng nhớ:** nhìn thấy
`resourceService.recalculateWorkload()` không màn hình nào gọi, rất dễ kết luận rằng
`currentWorkload` không bao giờ được cập nhật. Thực tế **mọi đường ghi task qua API đều gọi
`syncResourceWorkload`** — tạo một task qua `POST /api/tasks` rồi đọc lại `/api/resources`
thì thấy con số nhảy đúng. Thủ phạm hẹp hơn nhiều: seeder ghi task thẳng qua model, không đi
qua controller, nên riêng dữ liệu mẫu không bao giờ được đồng bộ.

Bài học: đừng suy ra hành vi runtime từ việc đọc xem hàm nào gọi hàm nào — chạy thử rồi đo.

**Đã sửa:** thêm `syncResourceWorkload()` ở cuối seeder.
**Test giữ:** `e2e/tests/07-analytics.spec.js` đối chiếu hai trang; `05-resources.spec.js`
khóa con số `32h / 40h`.

### 4. Seeder bỏ sót 3 collection

`TaskGroup`, `RecurringTask`, `CompanySetting` không bị xóa khi seed, nên bản ghi cũ tồn đọng
qua mọi lần seed và trỏ vào những `_id` đã biến mất — đúng cái vấn đề mà comment trong chính
hàm đó nói là đã chữa cho `notifications`/`activitylogs` trước đây. Dòng log cũng in `8`
trong khi xóa `9`.

**Đã sửa:** xóa theo **một mảng model duy nhất** và in ra `collections.length`. Thêm model mới
mà quên cập nhật thì con số tự lệch và lộ ra ngay — không còn chỗ cho việc bỏ sót lần thứ ba.

### 5. Màn hình chặn theo vai trò là ngõ cụt

Member gõ nhầm URL vào trang bị cấm gặp màn hình "Không có quyền truy cập" **không sidebar,
không nút nào** — chỉ còn nút Back của trình duyệt. Trong khi màn hình chặn theo quyền ứng
dụng (`/optimization`, `/benchmark`) đã có nút quay về Dashboard.

**Điểm làm đúng, cần giữ:** cả hai đều chặn **tại chỗ** chứ không đá về `/login`. Đá ra sẽ
trông như phiên hết hạn, người dùng đăng nhập lại rồi gặp đúng màn hình đó lần nữa.
`client/tests/protected-route.test.jsx` đã khóa hành vi này ở tầng component.

**Đã sửa:** thêm nút quay về cho màn hình theo vai trò, và đổi nút của màn hình theo app từ
`window.location.href` sang `navigate` — gán location trong SPA bắt trình duyệt tải lại toàn
bộ bundle và dựng lại phiên.
**Test giữ:** `e2e/tests/08-permissions.spec.js`, kèm một assertion rằng không có `load` event
nào xảy ra khi bấm nút.

### 6. `VITE_SOCKET_URL` không có trong `.env.example`

`client/src/context/SocketContext.jsx:8` đọc biến này, mặc định `http://localhost:5000`.
Triển khai server ở cổng/host khác mà quên đặt thì **mọi thứ vẫn chạy bình thường**, chỉ có
realtime âm thầm không kết nối — không một lỗi nào hiện ra trên giao diện.

**Lọt qua thế nào:** đây là loại lỗi *chỉ* lớp e2e bắt được. `server/tests` không có client;
`client/tests` mock hết tầng mạng.

**Đã sửa:** bổ sung vào `.env.example` kèm giải thích tại sao nó khác `VITE_API_URL`.
**Test giữ:** `e2e/tests/10-realtime.spec.js` kiểm địa chỉ WebSocket thật mà trình duyệt mở.

### 7. Trang Đăng ký viết cứng toàn bộ tiếng Việt

10 nhãn, 12 thông báo validate, 9 placeholder và 4 danh sách Select đều là chuỗi cố định. Bật
tiếng Anh thì phần còn lại của ứng dụng dịch, riêng trang này đứng nguyên.

**Lọt qua thế nào:** `client/tests/locales.test.mjs` so hai file locale **với nhau**, không
kiểm xem component có thật sự dùng chúng hay không. Hai file khớp nhau hoàn hảo trong khi
trang Đăng ký không đọc khóa nào cả.

**Đã sửa:** thêm nhóm `auth.register.*` (30 khóa + 4 danh sách) và nối vào. `value` của các
Select giữ nguyên tiếng Việt vì đó là **dữ liệu** gửi lên server — dịch cả value thì cùng một
người chọn cùng một mục sẽ ra hai giá trị khác nhau tùy ngôn ngữ.
**Test giữ:** `e2e/tests/09-preferences.spec.js` bật tiếng Anh rồi kiểm cả ba loại chữ.

Nhân đây cũng sửa `locales.test.mjs`: `flatten` dừng ở array nên mảng bị kiểm như một chuỗi,
và **lệch độ dài giữa vi/en thì không ai bắt** — en có 3 mục, vi có 4 thì mục thứ 4 âm thầm
rơi về tiếng Việt. Nay đi vào từng phần tử nên lệch độ dài hiện ra dưới dạng thiếu khóa.

## Vấn đề nhỏ khác

- **Ô mở tìm kiếm toàn cục từng là `div` bắt `onClick`** — không tab tới được, Enter không
  kích hoạt, trình đọc màn hình không đọc ra. Đã đổi thành `<button>` thật; bài test nay tìm
  nó bằng `getByRole` thay vì bám class, và có thêm một bài mở bằng bàn phím.
- **Thanh chuyển mục trong drawer chi tiết công việc không dùng `role="tab"`** — vẫn còn.
  Hệ quả: bài test phải so theo chữ thay vì theo vai trò. Xem
  `client/src/components/tasks/TaskDetailDrawer.jsx`.
- **Cảnh báo deprecated của Ant Design v6** đã gỡ hết (`destroyOnClose`, `trailColor`,
  `dropdownRender`, `bodyStyle`, `strokeWidth`, Drawer `width`, `Avatar.Group maxCount`,
  Space `direction`). Kiểm lại bằng cách mở 11 trang và đếm cảnh báo trong console: 0.
  Lưu ý `Modal width` và `Radio.Group direction` **không** deprecated — đừng đổi theo.

## Ghi chú vận hành

### Biên thời gian của lớp component

`client/vite.config.js` đặt `testTimeout: 15_000` và `maxWorkers: 2`.

Lý do: render một modal/portal của Ant Design trong jsdom tốn 2–3 giây ngay cả lúc máy rảnh,
và đo lúc máy bận thì bài chậm nhất mất **4,5 giây** — trong khi `testTimeout` mặc định của
vitest đúng **5 giây**. Gần như không còn dư, nên bộ test đỏ ngẫu nhiên: mỗi lần một file
khác, mà chạy riêng file đó thì luôn đạt. Nâng ngưỡng cho gấp ba ca chậm nhất, và chặn worker
để chúng thôi giành CPU của nhau.

Quy tắc chẩn đoán: **đỏ vì timeout thì chạy riêng file đó trước khi đi tìm lỗi trong code.**
Đạt khi chạy riêng nghĩa là chuyện tài nguyên, không phải chuyện logic.

### Dung lượng đĩa và RAM

Bộ e2e chạy Chromium + Vite dev server + Node server + MongoDB cùng lúc. Trên máy còn ít
RAM trống, Chromium hay bị hệ điều hành giết giữa chừng và Playwright báo `Target crashed`.
Hai cách xử lý:

```bash
E2E_CLIENT_MODE=preview npx playwright test   # dùng bản build tĩnh, nhẹ hơn nhiều
```

Cấu hình cũng đặt `retries: 1` cho lượt chạy cục bộ — không phải để giấu test chập chờn
(báo cáo vẫn đánh dấu `flaky` cho bài nào chỉ đạt ở lượt thứ hai) mà để một lần trình duyệt
bị giết vì hết RAM không làm đỏ cả lượt chạy.

MongoDB cũng cần chỗ trống trên ổ chứa `dbPath`. Hết đĩa thì service **tự dừng** và mọi bộ
test cần database đều hỏng với `ECONNREFUSED` — trông giống hệt lỗi cấu hình, nên rất dễ đi
tìm nhầm chỗ. Gặp `ECONNREFUSED ::1:27017` thì kiểm ba thứ theo thứ tự này:

```bash
Get-Service MongoDB                       # service còn chạy không
Get-PSDrive C | Select-Object Free        # ổ chứa dbPath còn trống không
Start-Service MongoDB                     # cần PowerShell quyền admin
```

Chạy `server/tests` **ngay sau** bộ e2e cũng dễ vướng: server cần lâu hơn bình thường để lên
vì cache đĩa còn nguội. Trình chạy chờ tới 60 giây nên thường không sao, nhưng nếu vẫn hết
thời gian chờ thì đợi một lát rồi chạy lại trước khi nghi ngờ code.

### Kết quả lần chạy gần nhất

```bash
npx playwright show-report e2e/.report
```

Báo cáo HTML kèm ảnh chụp màn hình và trace của mọi bài hỏng. Xem trace bằng
`npx playwright show-trace <đường-dẫn>.zip` — nó tua lại từng bước, kèm DOM và network tại
mỗi thời điểm.
