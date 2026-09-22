# 🔍 Sổ tay đọc lại hệ thống — từng chức năng và đường đi thật của nó

> Tài liệu này viết để **tự rà lại hệ thống**: mỗi chức năng đi từ màn hình nào, gọi hàm nào,
> chạm bảng nào, và **để lại dấu vết gì** ngoài cái response trả về.
>
> Nó khác các tài liệu còn lại trong `docs/`:
>
> | Tài liệu | Trả lời câu hỏi |
> |---|---|
> | [`FEATURES.md`](./FEATURES.md) | Có những tính năng gì, xong tới đâu |
> | [`API.md`](./API.md) | Gọi endpoint nào, gửi gì, nhận gì |
> | [`DATABASE.md`](./DATABASE.md) | Dữ liệu trông ra sao |
> | [`ALGORITHMS.md`](./ALGORITHMS.md) | GA/CSP/Hybrid tính toán thế nào |
> | [`TESTING.md`](./TESTING.md) | Kiểm thử ở đâu, đã bắt được lỗi gì |
> | **Tài liệu này** | **Bấm một nút thì chuyện gì xảy ra, theo thứ tự nào** |
>
> [`FEATURE_FLOWS.md`](./FEATURE_FLOWS.md) là tài liệu đồ án của Trần Xuân Trường, có sơ đồ
> mermaid trực quan. Nó sửa lần cuối **03/09/2026** nên chưa có các cơ chế phân quyền thêm
> sau đó — khi hai bên lệch nhau, tin tài liệu này.

---

## 1. Bản đồ 30 giây

```
client/          React 18 + Vite + Ant Design 6   (dev :5173)
server/          Express + Mongoose               (dev :5000)
mobile/          React Native + Expo
  └── MongoDB
```

Trong `server/src/`:

| Thư mục | Vai trò |
|---|---|
| `routes/` | Khai báo đường dẫn + **xâu chuỗi middleware** cho từng endpoint |
| `controllers/` | Xử lý nghiệp vụ, 12 file theo 12 nhóm chức năng |
| `services/` | Việc dùng chung nhiều nơi: workload, thông báo, email, nhật ký, phụ thuộc |
| `middleware/` | Xác thực, phân quyền, cắt toán tử Mongo, giới hạn tần suất, bắt lỗi |
| `algorithms/` | GA, CSP, Hybrid, benchmark, thang điểm dùng chung |
| `models/` | 12 schema Mongoose |

Trong `client/src/`:

| Thư mục | Vai trò |
|---|---|
| `pages/` | 13 nhóm màn hình, mỗi nhóm một thư mục |
| `services/` | Lớp bọc axios, **mọi request đều đi qua `api.js`** |
| `context/` | `AuthContext` (phiên + quyền), `ThemeContext`, `SocketContext` |
| `components/common/` | `ProtectedRoute` — cửa vào của mọi trang |
| `utils/` | Logic thuần chạy được bằng node: `gantt.js` (CPM), `taskPermissions.js` |

---

## 2. Đường đi của một request — xương sống chung

Mọi request đều đi qua đúng chuỗi này, thứ tự khai trong [`server/app.js`](../server/app.js):

```
1. helmet              đặt header bảo mật (CSP tắt vì API không trả HTML)
2. cors                chỉ nhận origin khai trong CLIENT_URL
3. morgan              ghi log
4. cookieParser        để đọc cookie refresh (httpOnly) — chỗ duy nhất dùng cookie
5. express.json        giới hạn body 1 MB
6. sanitizeRequest     ⚠️ CẮT toán tử Mongo khỏi body/query/params
7. apiLimiter          1000 request / 15 phút
8. <router của module>
9. notFound → errorHandler
```

**Bước 6 đáng nhớ**: từ đó trở đi *không controller nào còn nhìn thấy* khóa bắt đầu bằng `$`,
khóa chứa `.`, hay ba khóa gây ô nhiễm prototype. Nên khi đọc controller, đừng đi tìm chỗ
chống NoSQL injection — nó đã bị cắt từ trước.

Trong từng router, sau `protect` còn có thêm các lớp phân quyền — xem mục 4.

### Phía client: mọi request đi qua một cửa

[`client/src/services/api.js`](../client/src/services/api.js) gắn hai interceptor:

- **Request**: đính `Authorization: Bearer <token>` lấy từ `tokenStore` (biến trong bộ nhớ,
  **không phải localStorage** — đóng tab là mất, mở lại thì khôi phục bằng cookie refresh).
- **Response**: gặp **401** thì tự đổi token mới bằng cookie rồi **chạy lại request cũ**.
  Hai cái bẫy đã xử lý sẵn ở đây:
  - *Bão refresh*: nhiều request cùng hết hạn chỉ kích hoạt **một** lượt làm mới (biến
    `refreshing` giữ chung một promise), vì server xoay vòng token — gọi song song sẽ tự
    tố nhau là token bị đánh cắp.
  - *Vòng lặp vô hạn*: chính `/auth/refresh` cũng trả 401 được, nên nó bị loại trừ và mỗi
    request chỉ thử lại một lần (`_retried`).

---

## 3. Bốn tác dụng phụ chạy ngầm — đọc mục này trước khi đọc controller

Đây là phần khó thấy nhất khi đọc code, vì chúng nằm **sau** lúc response đã hình thành.

| Hàm | File | Khi nào chạy | Nó làm gì |
|---|---|---|---|
| `recalculateProjectProgress` | `task.controller.js:28` | Mỗi lần tạo/sửa/xóa task (8 chỗ) | Tính lại `Project.progress` = trung bình `progress` của task, **loại task `failed` khỏi mẫu số** |
| `syncResourceWorkload` | `services/workload.service.js` | Mỗi lần task đổi người/giờ (8 chỗ ở task, 2 ở optimization, 1 ở resource) | Trải giờ của task **chưa xong** lên ngày làm việc, lấy phần rơi vào **tuần hiện tại** → `currentWorkload`; giờ của task chưa xếp lịch vào `unscheduledWorkload`; rồi suy ra `availability` |
| `logActivity` | `services/activityLog.service.js` | 9 chỗ ở task, 4 ở project, 4 ở department, 3 ở resource/optimization… | Ghi `ActivityLog` |
| `sendNotification` | `services/socket.service.js` | 9 chỗ ở task, 1 ở optimization, 1 ở auth | Tạo `Notification` → bắn socket vào room `user:<id>` → gửi mail (nếu bật) |

Ba điều cần nhớ:

1. **`availability` là giá trị suy ra, không phải người dùng chọn.** Ngưỡng trong
   `workload.service.js`: quá `capacity` → `unavailable`; từ 70% → `partially_available`;
   dưới nữa → `available`. `capacity = maxCapacity × fte` (**giờ mỗi tuần**), và thứ đem so
   với nó là tải **tuần hiện tại** — hai vế cùng đơn vị. Phép trải giờ dùng lại
   `spreadTaskHours`/`dailyCapacity` của [`analytics/workloadTrend.js`](../server/src/analytics/workloadTrend.js)
   nên trang Nhân sự và biểu đồ Xu hướng nói cùng một ngôn ngữ.
2. **Ghi thẳng qua model thì không có tác dụng phụ nào chạy.** Đây đúng là lỗi seeder từng
   mắc: nó tạo task bằng model nên `currentWorkload` không được đồng bộ, khiến trang Nhân sự
   hiện 0h còn trang Báo cáo hiện 32h cho cùng một người.
3. **`sendNotification` nuốt lỗi.** Nó bọc try/catch và trả `null` khi hỏng, nên
   request cha vẫn thành công. Nay guard thiếu tham số có `console.error`, nhưng vẫn **không**
   làm request đỏ — cố ý, để mất một thông báo không kéo sập luồng giao việc.

---

## 4. Phân quyền — **bốn lớp** độc lập, đọc kỹ chỗ này

Đây là phần dễ nhầm nhất trong hệ thống, vì bốn cơ chế cùng tên gọi "quyền" nhưng dựa trên
bốn field khác nhau và **cộng dồn** (phải qua hết mới vào được).

| # | Cơ chế | Dựa trên field | Khai ở đâu | Chặn cái gì |
|---|---|---|---|---|
| 1 | `authorize('admin', …)` | `User.role`, `User.isOwner` | Từng route | Theo vai trò: `member` < `project_manager` < `admin`, `isOwner` là cờ cộng thêm trên `admin` |
| 2 | `authorizeApp('optimize')` | `User.appAdmins[]` | `router.use` của optimization | Quyền **Quản trị ứng dụng** cho từng app (Base Optimize+…) |
| 3 | `requireAppPermission('tasks')` | `User.appPermissions{}` | `router.use` của projects/tasks/analytics | Mức **xem/quản lý** theo phân hệ nghiệp vụ |
| 4 | `taskAccess.js` | Vai trò **trong dự án** + `Project.permissions` | Từng route task | Ai được sửa/xóa/duyệt **một task cụ thể** |

### 4.1 Thang vai trò — Admin không phải cao nhất

`member` → `project_manager` → `admin`, và **`isOwner`** là cờ nằm trên `admin`. Bốn thao tác
chỉ Owner làm được: đổi vai trò người khác, phong App Admin, đổi email tài khoản (cần "chìa
khóa" `specialGrants`), và vài thao tác quản trị khác — xem `API.md`.

### 4.2 `appPermissions` — mức xem/quản lý theo phân hệ

Giá trị: `none` < `view` < `manage`. Quy ước quan trọng:

- **Chưa đặt giá trị = `manage`.** Tài khoản tạo trước khi có tính năng này không bị mất quyền.
- **`isOwner` luôn đi qua**, bất kể field ghi gì.
- `GET`/`HEAD` cần tối thiểu `view`; mọi method ghi cần `manage`.

Thực thi ở [`middleware/auth.js`](../server/src/middleware/auth.js), gắn vào 3 router:

| Router | Khóa phân hệ |
|---|---|
| `project.routes.js` | `projects` |
| `task.routes.js` | `tasks` |
| `analytics.routes.js` | `reports` |

Hai khóa `calendar` và `optimization` **có trong dữ liệu nhưng không được thực thi**:
`calendar` không có route riêng (màn hình Lịch vẽ từ `/api/tasks`), còn `optimization` đã bị
lớp #2 khóa từ trước — chồng thêm sẽ mâu thuẫn ngữ nghĩa.

Phía client dùng `canViewModule`/`canManageModule` trong `AuthContext`, **cố ý viết trùng
khít quy ước trên**. Lệch một trong ba điều kia là giao diện và server nói hai chuyện khác
nhau: hoặc hiện nút bấm vào chỉ để nhận 403, hoặc giấu mất thứ người dùng thật ra làm được.

Chỉnh ở: **Cài đặt → Phân quyền Thao tác & Ứng dụng → Quyền theo Phân hệ**.

### 4.3 Phân lập theo công ty (multi-tenant)

`companyName` có mặt ở **8 model** và là khóa tách dữ liệu giữa các doanh nghiệp. Một công ty
mới ra đời khi ai đó **đăng ký có điền tên công ty** — người đó thành `admin` + `isOwner` của
công ty đó (`auth.controller.js:103`).

Hàm `isSameCompany` gác mọi endpoint `/users/:id/*`. Tài khoản không có `companyName` được
coi là thuộc `Công ty Công nghệ RAO`.

### 4.4 Quyền trong phạm vi một dự án

[`middleware/taskAccess.js`](../server/src/middleware/taskAccess.js) tính ra tư cách của
người gọi với **task đang đụng tới**: là quản lý dự án, người tạo, người được giao, người theo
dõi, hay khách. Rồi đối chiếu với `Project.permissions` — một nhóm công tắc bật theo **từng
dự án**:

`allowMembersCreateTasks`, `allowGuestCreateTask`, `allowAssigneeEditDeadline`,
`allowAssigneeReassign`, `allowCreatorDeleteTask`, `allowFollowerMarkDone`…

Chỉnh ở: **Chi tiết dự án → tab Phân quyền**.

---

## 5. Từng chức năng và luồng của nó

### 5.1 Đăng nhập, giữ phiên, đăng xuất

**Đăng nhập** — `Login.jsx` → `authService.login` → `POST /auth/login`:

1. Tìm user kèm `+password` (schema `select: false`), so mật khẩu bằng bcrypt.
2. Phát **access token 15 phút** (giữ trong biến bộ nhớ ở client).
3. Phát **refresh token** → đặt cookie `httpOnly`, `Path=/api/auth`; DB chỉ lưu **bản băm
   SHA-256**.

**Giữ phiên qua F5**: client không có token trong localStorage, nên lúc tải trang nó gọi
`/auth/refresh` bằng cookie để dựng lại phiên.

**Xoay vòng + phát hiện trộm**: mỗi lần refresh là token cũ bị thu hồi và phát cái mới. Trình
lại token đã xoay vòng → **thu hồi cả chuỗi**. Có ân hạn `REFRESH_GRACE_SECONDS` (mặc định
10s) để nhiều tab cùng làm mới không bị xử oan.

**Đăng xuất** phải gọi `POST /auth/logout` — xóa phía client là chưa đủ, cookie vẫn đổi được
access token mới.

Liên quan: `POST /auth/logout-all`, `GET /auth/sessions`, `DELETE /auth/sessions/:id`. Đổi mật
khẩu sẽ **đuổi mọi phiên khác**.

### 5.2 Dự án

**Danh sách** — `GET /projects` → `buildProjectQuery` ([`project.controller.js:8`](../server/src/controllers/project.controller.js#L8)):

- Lọc theo `companyName` của người gọi.
- **Không phải admin** thì chỉ thấy dự án mình là manager / thành viên / người tạo / **có task
  được giao hoặc tự tạo trong đó**. Vế cuối hay bị quên khi đọc code.

Sau khi lấy danh sách, controller chạy một `Task.aggregate` gom `totalTasks`/`completedTasks`
theo dự án rồi ghép vào từng bản ghi — số trên thẻ dự án đến từ đây, không phải từ `Project`.

**Tạo** — bắt buộc `startDate`, `endDate` (từng là lỗi: hai ô này nằm trong panel thu gọn nên
điền hết trường thấy được vẫn nhận 400). **Xóa** bị chặn nếu còn task, phải `?force=true`.

**Thành viên** — 6 vai trò: `lead`, `developer`, `designer`, `tester`, `devops`, `guest`.
Vai trò `guest` dành cho đối tác ngoài, quyền tạo việc của họ đi theo `allowGuestCreateTask`
(mặc định tắt) chứ không theo `allowMembersCreateTasks`.

### 5.3 Công việc

Đây là module nặng nhất: `task.controller.js` ~2100 dòng, và là nơi cả bốn tác dụng phụ đều
chạy dày nhất.

**Tạo task** — `POST /tasks`, thứ tự kiểm:

1. Dự án tồn tại? → 404.
2. Dự án cùng công ty? → 403.
3. `validateDependencies` ([`task.controller.js:294`](../server/src/controllers/task.controller.js#L294)):
   tự phụ thuộc → tiền nhiệm không tồn tại → **tiền nhiệm khác dự án** → **vòng lặp** (duyệt
   BFS ngược chuỗi tiền nhiệm). Tất cả trả 400.
4. Chuẩn hóa `dependencies` về dạng `{task, type}` — dữ liệu tồn tại ở **hai dạng** cùng lúc
   (mảng id phẳng của bản cũ và dạng mới), mọi chỗ đọc/ghi đều đi qua
   `services/taskDependency.service.js` để không nơi nào phải tự đoán.
5. Ghi task → `recalculateProjectProgress` → `syncResourceWorkload` → `sendNotification`
   (`task_assigned`) → `logActivity`.

**Kanban** — kéo thả gọi `PATCH /tasks/:id/status`, cập nhật lạc quan ở client rồi hoàn tác
nếu server từ chối. Server tự đặt `progress` 0/100 theo status.

**Chuyển dự án** — `POST /tasks/:id/move`: kiểm dự án đích tồn tại (404) và **tiền nhiệm có
còn hợp lệ sau khi chuyển không** (400, dùng chung `validateDependencies`). Chưa kiểm chiều
ngược lại: task khác đang phụ thuộc *vào* nó.

**Checklist** — thêm mục lấy `order = checklist.length`; xóa mục thì **đánh lại `order`** cho
toàn bộ mục còn lại, nếu không sẽ có `order` trùng nhau.

**Báo cáo kết quả** — `POST /tasks/:id/report-result`. `deliverableLinks`/`attachments` là
mảng **object**; gửi mảng chuỗi trả 400 kèm câu tiếng Việt (trước đây lọt xuống tận lớp cast
của Mongoose và lộ đường dẫn schema). `markAsDone` đi qua luồng đánh giá: dự án bật
`reviewConfig.enabled` thì task vào trạng thái `review` chứ không nhảy thẳng `done`.

### 5.4 Nhân sự

- **Thêm nhân sự** — liên kết User có sẵn hoặc tạo mới; `employeeId` tự sinh `NV0001`.
- **Ma trận kỹ năng** — `Resource.skills[].level` thang **1–4**, cùng thang với
  `Task.requiredSkills[].level`. Bản ghi cũ còn mức 5 dọn bằng `npm run migrate:skill-level`.
- **Lịch nghỉ** — server chặn ngày đảo ngược và kỳ nghỉ chồng nhau.
- **Workload** — `currentWorkload` **không nhập tay**, xem mục 3.

Trang này chỉ Admin/PM vào được (`ProtectedRoute roles={['admin','project_manager']}`).

### 5.5 Tối ưu hóa phân bổ

**Nạp dữ liệu** — `loadOptimizationData` ([`optimization.controller.js:17`](../server/src/controllers/optimization.controller.js#L17)):

- Task: chỉ lấy `todo`/`in_progress`/`review`.
- Resource: `isActive`, cùng công ty; **có chỉ định dự án thì chỉ lấy người trong dự án đó**
  (manager + members). Không chỉ định dự án mà không phải admin/owner/appAdmin thì giới hạn
  theo các dự án của chính người gọi.

**Ba chế độ** (`POST /optimization/run/genetic | csp | hybrid`):

| Chế độ | Cách làm |
|---|---|
| GA | Tournament k=5, uniform crossover, random mutation, elitism 5% |
| CSP | Backtracking + AC-3 + MRV + LCV; node consistency (capacity) và AC-3 là hai bước tách bạch |
| Hybrid | CSP `buildFeasibleDomains()` thu hẹp miền → GA chỉ sinh/đột biến trong miền đó; mức thu hẹp ghi vào `domainReduction`, miền rỗng được mở lại kèm cảnh báo |

Cả ba dùng chung thang điểm `algorithms/scoring.js` nên `fitness`/`metrics` so sánh được với
nhau. *Bản ghi CSP tạo trước thay đổi này vẫn còn `fitness: 0` trong DB.*

> ⚠️ **Ràng buộc H1 vẫn dùng đơn vị cũ.** `computeWorkloads` trong `scoring.js` cộng
> `estimatedHours` của **toàn bộ** task được gán rồi so với `capacityOf` = năng lực **tuần**.
> Nghĩa là một người không bao giờ được giao quá ~40 giờ cho **cả dự án**, dù dự án dài 6
> tháng. Với backlog thật, mọi nhân sự đều vượt ngưỡng nên `fOveralloc` bão hòa và thôi phân
> biệt được phương án tốt/xấu. H4 (`_overlaps`) thì **có** ý thức về thời gian — hai ràng
> buộc cạnh nhau đang dùng hai mô hình thời gian khác nhau.
>
> `currentWorkload` ở tầng hiển thị đã sửa (mục 3); phần thuật toán là **giai đoạn 2, chưa
> làm**, vì nó sẽ đổi kết quả tối ưu nên cần chạy lại benchmark để đánh giá.

Mỗi lần chạy ghi một `OptimizationResult` (giữ 50 bản mới nhất).

**Áp dụng** — `POST /optimization/:id/apply`: chặn nếu chưa `completed` hoặc đã áp dụng. Trước
khi ghi, nó **chụp lại phân công cũ** vào `previousAssignments` → đó là thứ cho phép
`rollback`. Sau khi ghi `assignee`: `syncResourceWorkload` cho **cả người cũ lẫn người mới**,
gửi thông báo, ghi nhật ký.

Toàn bộ router optimization bị `authorizeApp('optimize')` khóa — `member` không vào được dù
`appPermissions` ghi gì.

### 5.6 Gantt & đường găng

Logic thuần nằm ở [`client/src/utils/gantt.js`](../client/src/utils/gantt.js) — **chạy được
bằng node** nên có bộ test riêng (`node tests/gantt.test.mjs`, 44 assertion). CPM đầy đủ: lượt
xuôi, lượt ngược, `slack = 0` là đường găng, có phát hiện chu trình.

⚠️ **Giới hạn cố hữu**: CPM chỉ tính trên tập task **đang tải** (tối đa 100, có thể đang lọc
theo dự án). Dependency trỏ ra ngoài tập đó bị bỏ qua chứ không báo lỗi.

Kéo thả thanh để dời lịch gọi `taskService.update` → tức là vẫn đi qua `requireAppPermission('tasks')`.

### 5.7 Báo cáo & phân tích

`analytics.routes.js` toàn `GET`, gác bởi `requireAppPermission('reports')`.

Điều quan trọng nhất về **Xu hướng theo thời gian** (7.7): hệ thống **không lưu ảnh chụp
workload theo ngày**. Biểu đồ được **suy ra** từ lịch — giờ ước tính của mỗi task trải đều lên
các ngày làm việc trong khoảng của nó rồi cộng theo người. Nó trả lời *"khối lượng đã cam kết
rơi vào lúc nào"*, **không** trả lời *"tháng trước ai thực sự làm bao nhiêu giờ"*. Giờ công
không đặt được lên trục thời gian (thiếu ngày, chưa giao người) được đếm riêng và hiện thành
cảnh báo thay vì lặng lẽ biến mất.

### 5.8 Thông báo realtime & nhật ký

**Socket** — `server.js:28` xác thực JWT ngay ở `io.use()`; kết nối không token hoặc token rác
bị từ chối. Mỗi người vào room `user:<id>` → đó là cách thông báo không lọt sang người khác.

Client đọc địa chỉ từ `VITE_SOCKET_URL`; **thiếu biến này thì mọi thứ vẫn chạy, chỉ realtime
âm thầm không kết nối** — đã từng là lỗi thật, nay có bài e2e kiểm địa chỉ WebSocket thật.

**Email** — mặc định **tắt**, chỉ bật khi khai đủ `SMTP_HOST` + `MAIL_FROM`. Chỉ loại
`task_assigned` được gửi mail. Lỗi SMTP không làm hỏng luồng giao việc.

**Nhật ký** — `ActivityLog` lọc theo entity/action/user/thời gian. Thao tác **xóa nhật ký**
được ghi log **sau** lệnh xóa nên vết của chính nó sống sót.

### 5.9 Các module phụ

| Module | Endpoint gốc | Ghi chú |
|---|---|---|
| Phòng ban | `/api/departments` | Xóa bị chặn nếu còn nhân sự; nhân sự bắt buộc thuộc phòng ban hợp lệ |
| Nhóm công việc | `/api/task-groups` | Có `PUT /reorder` |
| Việc lặp lại | `/api/recurring-tasks` | `POST /preview` xem trước 10 mốc ngày **không ghi gì**; `POST /:id/run-now` sinh ngay |
| Cấu hình công ty | `/api/company-settings` | Chứa `createProjectPermission`, `createDepartmentPermission` — ảnh hưởng nút "Tạo dự án" hiện hay ẩn |

---

## 6. Những chỗ dễ hiểu nhầm

| Tưởng là | Thực tế |
|---|---|
| Token nằm trong `localStorage` | Không. Access token ở biến bộ nhớ; phiên khôi phục bằng cookie refresh |
| `currentWorkload` do người dùng nhập | Suy ra từ task chưa xong, qua `syncResourceWorkload` |
| `currentWorkload` là tổng giờ còn phải làm | Là tải của **tuần hiện tại**. Việc chưa có ngày nằm ở `unscheduledWorkload` |
| `availability` do người dùng chọn | Suy ra từ tỉ lệ tải / capacity |
| Xu hướng tải là số liệu lịch sử | Là khối lượng **đã cam kết** suy ra từ lịch |
| Quyền chỉ có vai trò admin/PM/member | Có **bốn lớp** độc lập, xem mục 4 |
| `appPermissions` trống nghĩa là không có quyền | Trống = **`manage`** (đầy đủ) |
| Hai chữ "guest" là một | `User.isGuest` (tài khoản đối tác) và `members[].role === 'guest'` (vai trò trong dự án) là **hai thứ khác nhau**, chưa nối với nhau |
| `companyName` của khách là tên đối tác | Không — đó là công ty **chủ quản**. Tên đối tác ở `guestCompany` |
| Ghi thẳng qua model cũng có tác dụng phụ | Không. Chỉ đường đi qua controller mới kích hoạt |
| Task `failed` kéo tiến độ dự án xuống | Bị loại khỏi mẫu số, đếm riêng |

---

## 7. Chạy và kiểm thử

```bash
npm run dev          # client :5173 + server :5000 song song
cd server && npm test        # 20 bộ, vài phút
cd client && npm test        # logic thuần + 8 file component
npm run test:e2e             # 85 bài, 11 file, ~10 phút, Chromium thật
```

Ba lớp dùng **ba database và ba cặp cổng khác nhau** nên chạy lớp nào cũng không đụng dữ liệu
đang làm dở:

| | Phát triển | `server/tests` | `e2e` |
|---|---|---|---|
| Server | 5000 | 5099 | 5098 |
| Client | 5173 | — | 5174 |
| Database | `resource_allocation` | `..._test` | `..._e2e` |

Chi tiết và danh sách lỗi từng lớp đã bắt được: [`TESTING.md`](./TESTING.md).

---

## 8. Việc còn dang dở

Danh sách đầy đủ và lý do ở cuối [`FEATURES.md`](./FEATURES.md). Tóm tắt những chỗ **đang có
thật trong code**:

- **Ràng buộc H1 của thuật toán vẫn so tổng giờ với năng lực tuần** — xem cảnh báo ở mục 5.5.
  Đây là phần còn lại của bản vá đơn vị; tầng hiển thị đã xong, tầng thuật toán chưa.
- **Chưa có migration cho tài khoản khách cũ** — khách tạo trước lúc tách `guestCompany` vẫn
  mang tên đối tác trong `companyName`, nên không admin nào nhìn thấy họ nữa (họ **vẫn đăng
  nhập được**).
- `register()` vẫn có thể tạo User không kèm Resource (lỗi chỉ ghi console).
- `move` task không kiểm các task đang phụ thuộc *vào* nó.
- `User.isGuest` vẫn chỉ là nhãn, chưa tự nối với vai trò `guest` trong dự án.
- Chưa có bộ test nào **đếm bản ghi thật** cho `ActivityLog` và email sau lời gọi.
- Backlog thiết kế: ảnh chụp workload định kỳ, bảng mã lỗi phía server để dịch được, ràng
  buộc all-different (Régin) cho CSP.
