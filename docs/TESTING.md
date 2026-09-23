# 🧪 Chiến lược kiểm thử

Dự án có **bốn lớp kiểm thử**, mỗi lớp trả lời một câu hỏi khác nhau. Không lớp nào thay thế
được lớp nào.

| Lớp | Thư mục | Chạy bằng | Quy mô | Trả lời câu hỏi |
|-----|---------|-----------|--------|-----------------|
| Đơn vị + API | `server/tests/` | `npm test` trong `server/` | 20 bộ | Server trả đúng dữ liệu, đúng mã lỗi, thuật toán tính đúng không? |
| Component | `client/tests/` | `npm test` trong `client/` | 3 file logic + 8 file component | Component vẽ đúng, xử lý đúng sự kiện không? |
| Logic di động | `mobile/tests/` | `npm test` trong `mobile/` | 1 bộ logic thuần | Quy tắc quyền trên app có khớp với server không? |
| Giao diện end-to-end | `e2e/` | `npm run test:e2e` ở gốc | 85 bài / 11 file | Ghép tất cả lại thì người dùng **dùng được** không? |

Lớp di động mỏng nhất và cố tình như vậy: app Expo không chạy được trong môi trường kiểm
thử hiện tại, nên chỉ những quy tắc **thuần** — tách sẵn ra `mobile/src/utils/` — mới kiểm
được. Phần giao diện của app vẫn chưa có lưới nào che; xem [mục cuối](#phần-mobile-còn-hở).

Hai lớp đầu chạy trong vòng vài phút. Lớp e2e mất khoảng **10–15 phút** (đo trên máy phát
triển, 1 worker) vì nó khởi động thật, đăng nhập thật và chờ API thật ở từng bài.

Chi tiết từng lớp:

- [`server/tests/README.md`](../server/tests/README.md) — 19 bộ, gồm cả kiểm thử đơn vị cho GA/CSP/scoring
- [`client/tests/README.md`](../client/tests/README.md) — logic thuần chạy bằng `node`, component chạy bằng vitest
- [`e2e/README.md`](../e2e/README.md) — 10 bộ điều khiển Chromium trên hệ thống thật

## Chạy tất cả

```bash
# Lớp 1 — cần MongoDB đang chạy
cd server && npm test

# Lớp 2 — không cần gì
cd client && npm test

# Lớp 3 — không cần gì, cũng không cần cài node_modules của mobile
cd mobile && npm test

# Lớp 4 — cần MongoDB; tự khởi động client + server
npm run test:e2e                    # ở thư mục gốc
npm run test:e2e:install            # lần đầu: tải trình duyệt cho Playwright
```

Các lớp chạm database dùng **database và cổng riêng**, nên chạy lớp nào cũng không đụng tới
môi trường phát triển (lớp `client` và `mobile` không cần database):

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

## Lỗi tìm ra khi viết tài liệu

Bốn lỗi dưới đây lộ ra trong lúc mô tả 36 endpoint còn thiếu của `docs/API.md`, không phải
từ một bài test nào. Chúng khác hẳn bảy lỗi ở trên về **cách biểu hiện**: bảy lỗi kia làm
màn hình sai hoặc request đỏ, còn bốn lỗi này **để mọi request trả 200 với body hợp lệ**.
Cái mất đi nằm ngoài response.

Không lớp test nào đang có bắt được chúng, vì cả ba lớp đều kiểm *response*. Bộ mới
`server/tests/notify-session.test.mjs` kiểm *tác dụng phụ*: đếm bản ghi thực tế sau mỗi lời gọi.

### 8. Bốn loại thông báo không bao giờ được tạo

`Notification.type` là enum, nhưng thiếu `task_comment`, `task_follower_added`,
`task_subtask_added`, `task_review_requested`, `task_review_approved`,
`task_review_rejected` và `system_alert` — bảy giá trị mà controller vẫn gửi.
`entityType` cũng thiếu `'user'`.

`Notification.create` ném `ValidationError`, `sendNotification` bắt lỗi rồi `return null`.
Request tạo bình luận vẫn trả **201**. Người được giao việc không nhận được gì.

Đo trên database sạch: bình luận một lần, thêm một người theo dõi, tạo một việc con →
**0 thông báo** trong collection, và ba dòng `ValidationError` trong log server mà không ai
đọc. Sau khi bổ sung enum: 3 thông báo, 0 lỗi.

**Test giữ:** `notify-session.test.mjs` — ba bài đếm thông báo trước/sau qua
`GET /api/notifications`.

### 9. Thông báo App Admin gọi sai chữ ký hàm

`sendNotification` nhận **một** object có `recipient`. Chỗ này gọi kiểu hai tham số:

```js
sendNotification(user._id, { title, message, type, actor })   // sai
```

Destructure một ObjectId thì `recipient` là `undefined`, hàm dừng ở
`if (!recipient || !title || !message) return null;` — **không log gì cả**. Lỗi này im lặng
hơn lỗi trên: không có cả dòng nào trong log server để mà bỏ qua.

Cùng một hàm, 10 chỗ gọi đúng và 1 chỗ gọi sai. Đây là kiểu lỗi mà đọc riêng chỗ gọi không
thấy được — phải đối chiếu với định nghĩa hàm.

### 10. Danh sách phiên đăng nhập luôn trống

`getSessions` và `revokeSession` lọc `RefreshToken` theo `userId`, nhưng field trong model
tên là **`user`**. MongoDB không báo lỗi khi lọc theo field không tồn tại — chỉ khớp 0 bản ghi.

Hệ quả: màn hình "Phiên đăng nhập" luôn trống dù đang có phiên sống, và
`DELETE /api/auth/sessions/:id` luôn trả **404** nên không thể thu hồi thiết bị nào.

Kiểm bằng dữ liệu thật thay vì đọc code: đăng nhập, rồi đọc thẳng collection —

```js
{ keys: ['_id','user','tokenHash','family','expiresAt','revokedAt',...],
  user: '6ab1efd5...', userId: 'undefined', revokedAt: null }
```

Bản ghi có thật, đang sống, `userId` không tồn tại. Đó là lúc chắc chắn, không phải lúc đọc
xong controller.

**Test giữ:** `notify-session.test.mjs` — liệt kê, thu hồi, và 404 cho phiên không tồn tại.

### 11. `appPermissions` nhận cả mảng

Field khai báo `type: Object` nên Mongoose nhận mọi thứ. `PUT /users/:id/app-permissions`
với `{ appPermissions: ['optimize'] }` trả **200** và ghi đè object
`{ projects: 'manage', tasks: 'manage', ... }` thành một mảng.

Giao diện đọc `appPermissions.projects` ra `undefined` → người dùng mất quyền, không có lỗi
nào chỉ ra vì sao. Đã thêm guard ở controller (schema không diễn tả được ràng buộc này).

Mức độ thấp hơn ba lỗi trên vì chưa có màn hình nào gọi endpoint — chỉ có wrapper trong
`client/src/services/authService.js`. Sửa trước khi có người gọi thì rẻ hơn.

### Điều rút ra

Ba lớp test đều hỏi *"API trả về gì?"*. Không lớp nào hỏi *"API đã làm gì?"*. Với các thao
tác có tác dụng phụ — gửi thông báo, ghi log, đồng bộ khối lượng — hai câu này khác nhau, và
khoảng cách giữa chúng chính là chỗ bốn lỗi trên sống sót qua 82 bài e2e.

Cùng một bài học với chỗ chẩn đoán sai `currentWorkload` ở mục 3: đừng suy ra hành vi runtime
từ việc đọc xem hàm nào gọi hàm nào — chạy thử rồi đo.

## Ba bộ test hỏng mà vẫn báo xanh

Phát hiện khi viết `hardening.test.mjs`, và nó **vô hiệu hóa một phần lưới an toàn** chứ
không phải lỗi cosmetic.

Mỗi file test kết thúc bằng `process.exit(summary() ? 1 : 0)` để `run.mjs` biết bộ đó đỏ hay
xanh — nhưng `email`, `notify-session` và `sanitize` chỉ gọi `summary()` rồi kết thúc, nên
tiến trình luôn thoát mã 0. Hệ quả: assertion trong ba bộ đó **có đỏ cũng không ai biết**.

Kiểm chứng bằng cách chèn tạm một `ok(false, …)` vào `sanitize` rồi chạy `npm test sanitize`:

```
  PASS: 18    FAIL: 1    TỔNG: 19      ← bản thân bộ test biết là có lỗi
  Tất cả 1 bộ đều đạt                  ← nhưng runner kết luận ngược lại, và thoát mã 0
```

Đáng chú ý là `notify-session` chính là bộ giữ bốn lỗi "request vẫn trả 200" và các bài
`appPermissions` mới thêm — tức phần test được viết riêng để bắt loại lỗi âm thầm lại đang
âm thầm y như vậy. Đã bổ sung `process.exit` cho cả ba.

Bài học hợp với tinh thần chung của tài liệu này: **một bộ test chưa bao giờ thấy đỏ thì
chưa chứng minh được điều gì**. Thêm bài test mới xong nên thử làm nó hỏng một lần để biết
đường báo lỗi còn thông.

## Chọn lớp cho từng bản vá

Đợt sửa 11 hạng mục trong `FEATURES.md` cho một ví dụ rõ về việc **không phải bản vá nào
cũng thuộc về lớp e2e**. Chỉ một hạng mục được đưa lên e2e:

| Bản vá | Lớp | Vì sao |
|--------|-----|--------|
| `appPermissions` được thực thi thật | `server/tests` **và** `e2e` | Hai đầu dây (UI lưu, middleware chặn) đều đúng riêng lẻ vẫn có thể không khớp nhau. Đây đúng là loại "từng mảnh đúng, ghép lại sai" — xem `e2e/tests/11-app-permissions.spec.js` |
| Phân lập công ty ở `/auth/guests`, `special-grants`, `app-admin` | `server/tests` | Cần **hai công ty**, mà tạo công ty thứ hai phải đăng ký tài khoản mới — và hệ thống **không có endpoint xóa User**, nên bộ e2e sẽ để lại rác vĩnh viễn trong database dùng chung, trái quy ước "mỗi bài tự dọn". `server/tests` seed lại trước từng bộ nên không vướng |
| `deliverableLinks` sai dạng, `move` sang dự án không tồn tại | `server/tests` | Giao diện không bao giờ gửi được payload sai dạng như vậy. Test qua trình duyệt sẽ phải bịa ra thứ người dùng không làm được |
| Đánh lại `order` của checklist sau khi xóa | `server/tests` | Drawer render checklist **theo thứ tự mảng**, không theo `order`. Một bài e2e nhìn vào màn hình sẽ xanh cả trước lẫn sau khi sửa — xanh giả, tệ hơn là không có test |
| Không trả mật khẩu rõ trong response tạo User | `server/tests` | Kiểm được qua e2e (rình response trong trình duyệt) nhưng vướng đúng vấn đề rác dữ liệu như hàng thứ hai |

Nguyên tắc rút ra: **lớp e2e đắt (10–15 phút/lượt) và ghi vào database dùng chung**, nên chỉ
dành cho thứ chỉ nó mới thấy được — mối nối giữa các mảnh. Thứ gì một lớp rẻ hơn kiểm được
đầy đủ thì để ở lớp đó; và thứ gì lớp e2e *không chứng minh được* thì đừng viết bài e2e cho
nó, vì một bài xanh-bất-kể-code-đúng-hay-sai còn nguy hiểm hơn khoảng trống đã biết.

Bốn hàng cuối nằm ở bộ mới **`server/tests/hardening.test.mjs`** (35 assertion), và ngay lần
chạy đầu nó đã bắt được một lỗi thật — xem mục dưới.

### Lỗi `hardening` tìm ra: khách không thuộc công ty nào

Bản vá lọc `GET /auth/guests` theo công ty của người gọi *đúng về ý định* nhưng **sai trên
thực tế**, và chỉ lộ ra khi có bài test đi trọn đường "tạo khách rồi xem lại danh sách":

`createGuest` ghi `companyName` bằng **tên tổ chức đối tác** lấy từ form (nhãn "Công ty / Tổ
chức đối tác"), trong khi mọi chỗ khác trong hệ thống dùng `companyName` làm **khóa phân lập
tenant** (`isSameCompany`, bộ lọc của `GET /auth/users`). Hai nghĩa đụng nhau trên cùng một
field. Hệ quả sau khi thêm bộ lọc: khách tạo ra mang công ty "Công ty TNHH Đối Tác Alpha",
không khớp công ty của ai cả — nên **chính công ty vừa tạo ra nó cũng không nhìn thấy nó
nữa**.

Đã tách hai nghĩa: `companyName` của khách nay là công ty của người tạo (đúng vai trò khóa
phân lập), còn tên đối tác sang field mới `guestCompany` chỉ để hiển thị.

Lỗi này minh họa vì sao assertion "công ty A **nhìn thấy** khách của chính mình" phải đi kèm
assertion "công ty B không nhìn thấy": chỉ kiểm vế cấm thì một bộ lọc chặn nhầm tất cả mọi
người vẫn xanh.

### Lỗi thứ hai: một chữ thiếu trong enum làm chết cả một nhánh tính năng

`Project.members[].role` không có `'guest'` trong enum, trong khi `taskAccess.js` có hẳn một
nhánh xử lý `role === 'guest'` và `Project.permissions.allowGuestCreateTask` hiện thành một
switch thật trên màn hình Chi tiết dự án. Mongoose chặn mọi lần gán vai trò đó, nên nhánh kia
là mã chết và cái switch không điều khiển được gì — **không có lỗi nào nổ ra ở bất cứ đâu**.

Đây là loại lỗi không lớp test nào đang có nhìn thấy, vì cả ba lớp đều kiểm những đường người
ta *có* đi; còn đây là một đường **không ai đi được**, và sự im lặng đó trông y hệt như
"tính năng chạy tốt, chưa ai dùng tới".

Sau khi sửa, bộ `hardening` kiểm cả hai vế: tắt công tắc thì khách bị chặn bằng đúng câu dành
cho khách (không phải câu dành cho thành viên thường — phân biệt được hai câu này mới chứng
minh đi đúng nhánh), bật lên thì tạo được. Gỡ lại `'guest'` khỏi enum thì **4 assertion đỏ**;
đã chạy thử đúng một lần để chắc bộ test không xanh sẵn, theo đúng bài học ở mục trên.

## Vấn đề nhỏ khác

- **Ô mở tìm kiếm toàn cục từng là `div` bắt `onClick`** — không tab tới được, Enter không
  kích hoạt, trình đọc màn hình không đọc ra. Đã đổi thành `<button>` thật; bài test nay tìm
  nó bằng `getByRole` thay vì bám class, và có thêm một bài mở bằng bàn phím.
- **Thanh chuyển mục trong drawer chi tiết công việc không dùng `role="tab"`** — đã sửa.
  Dải tab nay là `role="tablist"`, từng mục là `<button role="tab">` có `aria-selected` và
  `aria-controls` trỏ tới `role="tabpanel"`, điều hướng bằng mũi tên / Home / End với một
  điểm dừng Tab duy nhất. Bài test trong `e2e/tests/04-tasks.spec.js` nay bám theo vai trò.
- **Thanh tab trang Cài đặt tràn ngang ở 1440px** — phát hiện khi dựng
  `11-app-permissions.spec.js`. Trang có 6 tab nhãn dài; ở viewport mặc định của bộ e2e
  (1440, trừ 240px sidebar) hai tab cuối bị đẩy vào nút `...`. Người dùng vẫn mở được qua
  `...` nên **không phải lỗi chặn đường**, nhưng bấm thẳng vào nhãn thì không ăn — bài test
  ban đầu đỏ vì đúng chuyện này chứ không phải vì phân quyền. Bộ `11` tự cấp viewport 1920
  cho màn hình admin và ghi rõ lý do; nếu sau này rút bớt hoặc rút gọn nhãn tab thì gỡ được.
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

## Phần mobile còn hở

App Expo (`mobile/`) là **client thứ hai** của cùng một API, nhưng ba lớp test cũ không chạm
tới nó một dòng nào — `e2e` chạy Chromium trên web client, còn `client/tests` chỉ nạp mã
trong `client/src`. Hệ quả: mobile im lặng lệch khỏi server suốt một thời gian dài.

Khi rà lại, bốn lỗi dưới đây đều thuộc loại **không có lớp test nào có thể bắt được**, vì
không lớp nào đọc mã mobile:

| Lỗi | Hậu quả |
|-----|---------|
| `AuthContext` đọc `data.accessToken`, server trả `data.token` | Đăng nhập luôn báo thất bại |
| Gọi `PUT /auth/change-password`, route thật là `/auth/password` | Nút đổi mật khẩu trả 404 |
| Nhánh 401 bỏ trống, không làm mới token | Phiên chết sau 15 phút, app không báo gì |
| Màn Báo cáo gán cả object `{resources, departments, summary}` vào state mảng | `.filter` ném lỗi, màn chết ngay khi mở |

Ba lỗi đầu nằm ở chỗ **tên trường và đường dẫn** — thứ mà TypeScript hoặc một bài test
chạm vào API thật sẽ bắt ngay, còn đọc mã bằng mắt thì rất dễ trượt.

Điều đáng nói hơn: lỗi thứ tư đứng **ngay cạnh** một lỗi bảo mật thật. Lúc nối chức năng
bình luận cho mobile, bài test dựng thêm một công ty thứ hai để kiểm hợp đồng dữ liệu, và
nó cho thấy `deleteComment` miễn trừ cho mọi `role === 'admin'` mà **không xét cùng công ty**
— admin công ty B xóa được bình luận trên công việc của công ty A. `addComment` còn không
kiểm gì cả. Cả hai nay đi qua `belongsToCompany`.

Bài học lặp lại đúng cái đã ghi ở trên: lớp test không chạm tới đâu thì chỗ đó tự do trôi.

### Những gì đã che được

- `mobile/tests/app-permissions.test.mjs` — 21 ca cho quy tắc quyền theo phân hệ. Quy tắc
  được tách khỏi `AuthContext` ra `mobile/src/utils/appPermissions.js` chính là để kiểm được
  bằng Node thuần, không cần Expo.
- Phía server, `hardening.test.mjs` thêm nhóm "Bình luận: hợp đồng dữ liệu mà màn chi tiết
  dựa vào" — khóa việc `comments.user` phải được populate, vì thiếu nó thì mobile hiện
  "Người dùng" cho mọi bình luận **mà không lỗi gì**.
- `refresh-token.test.mjs` thêm nhóm cho đường refresh qua body, gồm một ca khẳng định web
  **không** đi đường đó.

### Những gì vẫn chưa che

Giao diện mobile chưa có lớp nào: không dựng được component, không chạy được điều hướng.
Cách chắc chắn nhất để không lặp lại nhóm lỗi "sai tên trường" là cho mobile một bài test
gọi API thật rồi đối chiếu tên trường nó đọc — rẻ hơn nhiều so với dựng cả Detox.
