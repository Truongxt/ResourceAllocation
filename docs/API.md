# 🔌 API Documentation

> Base URL: `http://localhost:5000/api`
>
> Mọi endpoint được mô tả ở đây đều đối chiếu trực tiếp với mã nguồn và **kiểm chứng bằng
> request thật** — không viết theo suy đoán từ tên hàm.

> ✅ **Đã phủ hết 118 endpoint trên 12 nhóm route.** Hai nhóm lớn nhất từng là phần thiếu
> lớn nhất của tài liệu này, nay đã mô tả đủ:
>
> | Nhóm | Endpoint | Trạng thái |
> |------|---------:|------------|
> | `/api/auth` | 27 | đầy đủ (mục 1.1 – 1.3) |
> | `/api/tasks` | 30 | đầy đủ (mục 3.1 – 3.4) |
> | 10 nhóm còn lại | 61 | đầy đủ |
>
> Đếm lại bất cứ lúc nào — con số phải khớp 118:
>
> ```bash
> grep -rcE "^\s*router\.(get|post|put|patch|delete)\(" server/src/routes/
> ```
>
> Viết tài liệu cho hai nhóm này làm lộ ra bốn lỗi mà không request nào báo đỏ (thông báo
> bị nuốt, danh sách phiên đăng nhập luôn trống). Xem [TESTING.md](./TESTING.md) mục
> "Lỗi tìm ra khi viết tài liệu".

## Chú thích

- 🔓 Public - Không cần authentication
- 🔒 Protected - Cần JWT token (bất kỳ user nào đã đăng nhập)
- 👑 Admin only - Chỉ role `admin`
- 📋 PM+ - `admin` hoặc `project_manager`

---

## Định dạng Response chung

Mọi response thành công đều bọc dữ liệu trong `data` **dưới một key có tên**, không trả mảng/object trần:

```json
// Chi tiết một bản ghi
{ "success": true, "data": { "project": { ... } }, "message": "..." }

// Danh sách (có phân trang)
{
  "success": true,
  "count": 20,              // số bản ghi trong trang hiện tại
  "total": 25,              // tổng số bản ghi khớp filter (NẰM NGOÀI pagination)
  "pagination": { "page": 1, "limit": 20, "pages": 2 },
  "data": { "projects": [ ... ] }
}
```

**Lưu ý:** `total` nằm ở cấp gốc, không nằm trong `pagination`. Key bên trong `data` thay đổi
theo tài nguyên: `projects`, `tasks`, `resources`, `departments`, `users`, `logs`,
`notifications`, `results`, `result`, `project`, `task`, `resource`, `notification`, `department`.

### Response lỗi

```json
{
  "success": false,
  "message": "Mô tả lỗi",
  "errors": [ { "field": "email", "message": "Email không hợp lệ" } ],
  "stack": "... (chỉ ở NODE_ENV=development)"
}
```

`errors[]` chỉ xuất hiện với lỗi validation (express-validator). `message` khi đó là thông báo lỗi **đầu tiên**.

### Tham số phân trang

Các endpoint danh sách nhận `?page=&limit=&sort=`:

| Endpoint | `limit` mặc định | `limit` tối đa |
|----------|------------------|----------------|
| `GET /projects` | 20 | 100 |
| `GET /tasks` | 50 | 100 |
| `GET /resources` | 50 | 100 |
| `GET /activity-logs` | 20 | 100 |
| `GET /notifications` | 20 | 100 |

`sort` mặc định `-createdAt`. `GET /optimization/history` **không phân trang** (cố định 50 bản ghi mới nhất).
Cũng không phân trang: `GET /departments`, `GET /auth/users`, `GET /auth/guests`,
`GET /tasks/reminders`, `GET /tasks/pending-review`, `GET /tasks/:id/subtasks`,
`GET /tasks/reassign-preview`. Các endpoint này trả toàn bộ tập khớp filter kèm `count` hoặc
`total`, nên `?page=` gửi vào bị bỏ qua chứ không báo lỗi.

---

## 1. Authentication (`/api/auth`)

Nhóm này có **27 endpoint**, chia làm ba mảng: cặp token, tài khoản của chính mình,
và quản trị nhân sự.

### 1.1. Token và đăng nhập

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/register` | Đăng ký tài khoản | 🔓 |
| POST | `/login` | Đăng nhập | 🔓 |
| POST | `/refresh` | Đổi refresh token lấy access token mới | 🔓¹ |
| POST | `/logout` | Đăng xuất thiết bị hiện tại | 🔓¹ |

¹ Không cần access token vì access token hết hạn chính là lý do gọi tới đây. Xác thực bằng
cookie `rao_refresh`.

### 1.2. Tài khoản của chính mình

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/me` | Thông tin user hiện tại | 🔒 |
| PUT | `/profile` | Cập nhật profile (name, department, avatar) | 🔒 |
| PUT | `/password` | Đổi mật khẩu (thu hồi mọi phiên khác) | 🔒 |
| POST | `/logout-all` | Đăng xuất khỏi mọi thiết bị | 🔒 |
| GET | `/sessions` | Các phiên đăng nhập đang hoạt động | 🔒 |
| DELETE | `/sessions/:id` | Thu hồi một phiên cụ thể | 🔒 |
| GET | `/company-managers` | Nhân sự cùng công ty (để chọn quản lý trực tiếp) | 🔒 |
| GET | `/permissions/matrix` | Ma trận phân quyền chuẩn + danh mục phân hệ | 🔒 |
| GET | `/guests` | Danh sách tài khoản khách | 🔒 |

### 1.3. Quản trị nhân sự

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/users` | Nhân sự trong công ty của người gọi | 👑 |
| POST | `/users` | Tạo tài khoản nhân sự | 👑 |
| PUT | `/users/:id/role` | Đổi vai trò | 👑 (Owner nếu đặt `admin`) |
| PUT | `/users/:id/status` | Bật/tắt tài khoản | 👑 |
| PUT | `/users/:id/reset-password` | Đặt lại mật khẩu | 👑 |
| PUT | `/users/:id/manager` | Gán quản lý trực tiếp | 👑 |
| PUT | `/users/:id/profile` | Sửa name/department/phone/jobTitle | 👑 |
| PUT | `/users/:id/app-permissions` | Quyền theo phân hệ | 👑 |
| PUT | `/users/:id/special-grants` | Quyền đặc biệt (🔑) | 👑 |
| PUT | `/users/:id/app-admin` | Chỉ định App Admin | 👑 + Owner |
| PUT | `/users/:id/owner` | Cấp/hủy quyền Owner | 👑 + Owner |
| PUT | `/users/:id/email` | Đổi email tài khoản | 👑 + Owner **hoặc** 🔑 `can_change_email` |
| PUT | `/users/:id/disable-2fa` | Tắt 2FA của người khác | 👑 + Owner |
| POST | `/guests` | Tạo tài khoản khách | 📋 PM+ |

### Cặp token

| | Access token | Refresh token |
|---|---|---|
| Đi bằng | Header `Authorization: Bearer` | Cookie `rao_refresh` (`httpOnly`, `Path=/api/auth`) |
| Client giữ ở | **Bộ nhớ** (biến module), không phải `localStorage` | Trình duyệt tự giữ |
| Sống | 15 phút (`ACCESS_TOKEN_EXPIRE`) | 7 ngày (`REFRESH_TOKEN_DAYS`) |
| Thu hồi được | **Không** | **Có** |
| Lưu ở server | Không lưu (JWT) | Chỉ lưu bản băm SHA-256 |

Client phải gửi kèm cookie (`withCredentials: true`) khi gọi nhóm `/api/auth`.

### POST `/api/auth/refresh`
Không có request body — token nằm trong cookie.

```json
// Response 200 — cookie rao_refresh được thay bằng giá trị MỚI (xoay vòng)
{ "success": true, "data": { "user": { ... }, "token": "eyJhbGciOi..." } }

// Response 401
{ "success": false, "message": "...", "reason": "unknown|expired|revoked|reused" }
```

`reason` phân biệt bốn tình huống, trong đó **`reused`** là nghiêm trọng: có người trình lại
một refresh token đã bị xoay vòng, tức là token đã lọt ra ngoài. Server thu hồi **cả chuỗi**
token của lần đăng nhập đó — kể cả token đang nằm trong tay chủ thật — vì tại thời điểm ấy
không phân biệt được ai là ai. Cả hai bên phải đăng nhập lại.

Ngoại lệ: trong `REFRESH_GRACE_SECONDS` giây đầu sau khi xoay vòng, phát lại được coi là
**đua giữa các tab** chứ không phải tấn công, và vẫn trả 200. Không có ngoại lệ này thì mở
hai tab là đủ để tự đăng xuất chính mình.

### POST `/api/auth/register`
```json
// Request Body
{
  "name": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "password": "password123",
  "role": "member"            // optional: 'admin' | 'project_manager' | 'member'
}

// Response 201
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "...", "email": "...", "role": "member" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### POST `/api/auth/login`
```json
// Request Body
{ "email": "nguyenvana@example.com", "password": "password123" }

// Response 200
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "...", "email": "...", "role": "member" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### PUT `/api/auth/password`
Trả về **access token mới** và cookie refresh mới cho chính thiết bị đang thao tác:
`{ "success": true, "data": { "token": "..." } }`

**Mọi phiên khác bị đăng xuất.** Đổi mật khẩu thường là phản ứng với nghi ngờ bị lộ tài khoản;
để phiên cũ sống tiếp thì thao tác đó gần như vô nghĩa.

### GET `/api/auth/sessions`
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "_id": "...",                       // dùng làm :id cho DELETE
        "ipAddress": "::1",
        "userAgent": "Mozilla/5.0 ...",
        "createdAt": "2026-09-22T03:09:15.462Z",
        "expiresAt": "2026-09-29T03:09:15.447Z"
      }
    ]
  }
}
```

Chỉ liệt kê phiên **chưa thu hồi và chưa hết hạn**, mới nhất trước. Một phiên = một
refresh token gốc của lần đăng nhập đó; xoay vòng token không sinh thêm dòng mới.

`DELETE /api/auth/sessions/:id` đặt `revokedAt` với `revokedReason: 'user_revoked'` và trả
`{ success: true, message: "Đã đăng xuất khỏi thiết bị thành công" }`. Phiên của người khác
hoặc id không tồn tại đều trả **404** — cùng một thông báo, để không tiết lộ phiên đó có thật.

### GET `/api/auth/users`
**Không phân trang.** Trả toàn bộ nhân sự cùng `companyName` với người gọi:

```json
{ "success": true, "count": 5, "data": { "users": [ { ..., "manager": { "name": "...", "jobTitle": "..." } } ] } }
```

Query filter: `role`, `department`, `isActive` (`'true'`/`'false'` dạng chuỗi), `search`
(quét `name`, `email`, `phone`, `jobTitle`).

**Phân lập theo công ty áp cho toàn nhóm quản trị**: mọi endpoint `/users/:id/*` trả **403**
nếu tài khoản đích thuộc công ty khác, gồm cả `PUT /users/:id/special-grants` và
`PUT /users/:id/app-admin`. Tài khoản không có `companyName` được coi là thuộc
`Công ty Công nghệ RAO`. `GET /guests` cũng chỉ trả tài khoản khách cùng công ty với người
gọi.

### POST `/api/auth/users`
```json
// Request Body — chỉ `name` và `email` là thực sự cần
{ "name": "Nhân sự mới", "email": "moi@rao.com",
  "password": "...", "role": "member", "department": "Kỹ thuật",
  "jobTitle": "Developer", "phone": "", "manager": "user_id" }
```

Ba tác dụng phụ đáng biết trước khi gọi:

1. **Mật khẩu mặc định là `123456`** nếu không gửi `password`.
2. **Tự tạo kèm một `Resource`** (`employeeId` sinh tự động, `maxCapacity: 40`, `fte: 1.0`).
   Lỗi ở bước này chỉ ghi console, không làm request thất bại — nên có thể có User mà không
   có Resource.
3. **Gửi email chứa mật khẩu** cho người mới. Kết quả nằm ở `data.emailStatus`.

Khi email đang tắt (mặc định, hoặc `NODE_ENV=test`), `emailStatus` trả
`{ sent: false, simulated: true, preview: { email } }` — **đã lọc `plainPassword` khỏi
response**. Mật khẩu khởi tạo chỉ còn hiện ở console log phía server (phục vụ đọc thủ công
khi email đang mô phỏng), không còn trả về client.

### Thang phân quyền: Admin không phải cấp cao nhất

Ba mức, không phải hai: `member` → `project_manager` → `admin`, và **`isOwner`** là một cờ
cộng thêm bên trên `admin`. Bốn thao tác dưới đây admin thường **không** làm được:

| Thao tác | Điều kiện | Mã lỗi nếu thiếu |
|----------|-----------|------------------|
| Đặt ai đó thành `admin` | `req.user.isOwner` | 403 |
| `PUT /users/:id/owner` | `req.user.isOwner` | 403 |
| `PUT /users/:id/app-admin` | `req.user.isOwner` | 403 |
| `PUT /users/:id/disable-2fa` | `req.user.isOwner` | 403 |
| `PUT /users/:id/email` | `isOwner` **hoặc** `specialGrants` chứa `can_change_email` | 403 |

Thêm hai ràng buộc nữa trên `role`: chỉ Owner đổi được vai trò của một Owner khác, và hạ một
Owner xuống dưới `admin` sẽ **tự gỡ cờ `isOwner`**. Ngược lại, cấp `isOwner: true` **tự nâng
`role` lên `admin`** — hai trường này không bao giờ lệch nhau.

Owner cuối cùng của công ty không tự hủy quyền của mình được (**400**). Ràng buộc này chỉ
kiểm khi người gọi tự hủy quyền chính mình.

`role` ngoài ba giá trị hợp lệ trả **400** `Vai trò không hợp lệ`.

### PUT `/api/auth/users/:id/manager`
```json
{ "managerId": "user_id" }   // null hoặc bỏ trống = xóa quản lý trực tiếp
```

Năm ràng buộc, tất cả trả **400** trừ khi ghi khác:

| Trường hợp | Kết quả |
|-----------|---------|
| `managerId` trùng chính người đó | `Không thể chỉ định người dùng làm người quản lý trực tiếp của chính mình` |
| `managerId` không tồn tại | **404** `Không tìm thấy người quản lý được chọn` |
| Quản lý thuộc công ty khác | `Người quản lý trực tiếp phải thuộc cùng công ty` |
| Owner mà quản lý không phải Owner | `... là vị trí quản trị cao nhất ...` |
| `admin` hoặc `project_manager` bị gán quản lý là `member` | `Không thể chỉ định thành viên ... ` |
| Tạo vòng lặp quản lý (kể cả gián tiếp) | `... sẽ tạo thành vòng lặp quản lý ...` |

Chống vòng lặp đi ngược chuỗi `manager` từ người được chọn lên trên, nên bắt được cả trường
hợp A→B→C→A. Không có nó thì cây tổ chức trên giao diện sẽ lặp vô hạn.

### PUT `/api/auth/users/:id/app-permissions`
```json
{ "appPermissions": { "projects": "manage", "tasks": "manage", "calendar": "view" } }
```

Phải là **object** dạng `{ phân_hệ: quyền }`. Mảng, `null` hay chuỗi đều trả **400**. Field
này khai báo `type: Object` nên Mongoose sẵn sàng nhận một mảng — lưu được thì giao diện đọc
`appPermissions.projects` ra `undefined` và người dùng mất quyền mà không có lỗi nào chỉ ra
vì sao. Ràng buộc nằm ở controller chứ không ở schema.

### PUT `/api/auth/users/:id/status`
```json
{ "isActive": false }
```
Vô hiệu hóa tài khoản **thu hồi toàn bộ refresh token** của người đó — họ bị đẩy ra trong
vòng một lần làm mới token, không phải chờ hết 7 ngày.

### PUT `/api/auth/users/:id/reset-password`
```json
{ "newPassword": "..." }     // dưới 6 ký tự → 400
```
Cũng thu hồi mọi phiên và gửi email chứa mật khẩu mới. Response **không** trả `user`, chỉ
`{ success, message }`.

### GET `/api/auth/permissions/matrix`
Dữ liệu tĩnh, không đọc DB — trả bảng đối chiếu để giao diện dựng màn hình phân quyền:

```json
{
  "success": true,
  "data": {
    "matrix": [
      { "id": "acc_create_direct", "module": "account", "moduleName": "Tài khoản",
        "action": "Tạo TK trực tiếp", "description": "...",
        "owner": "yes", "appAdmin": "yes", "admin": "yes", "member": "no" }
    ],
    "catalog": [ ... ]
  }
}
```

Bảng này **mô tả** quyền, không **thi hành** quyền. Nơi thi hành là `middleware/auth.js` và
`middleware/taskAccess.js`. Sửa ở đây không đổi hành vi thật của API.

### POST `/api/auth/guests`
```json
{ "name": "Khách A", "email": "khach.a@doitac.com", "password": "...", "companyName": "..." }
```
Thiếu bất kỳ trong ba field đầu → **400**. Email đã dùng → **400**. Tài khoản khách được đặt
cứng `role: 'member'`, `isGuest: true`, `department: 'Đối tác / Khách mời'`,
`jobTitle: 'Khách mời dự án (Guest)'`, `companyName` mặc định `Khách hàng đối tác`.
Response trả `data.guest` (không phải `data.user`).

---

## 2. Projects (`/api/projects`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/stats/summary` | Thống kê dự án (theo status, priority, tổng ngân sách) | 🔒 |
| GET | `/` | Danh sách dự án | 🔒 |
| GET | `/:id` | Chi tiết dự án (kèm tasks + members, tự tính lại progress) | 🔒 |
| POST | `/` | Tạo dự án | 📋 PM+ |
| PUT | `/:id` | Cập nhật dự án | 📋 PM+ |
| DELETE | `/:id` | Xóa dự án | 📋 PM+ |
| POST | `/:id/members` | Thêm thành viên | 📋 PM+ |
| PUT | `/:id/members/:userId` | Cập nhật vai trò / allocation của thành viên | 📋 PM+ |
| DELETE | `/:id/members/:userId` | Xóa thành viên | 📋 PM+ |

**Query filter cho `GET /`**: `status`, `priority`, `manager`, `search` (tìm trong name/code/description),
`startDate`, `endDate` (lọc theo `startDate` của dự án), `page`, `limit`, `sort`.

### POST `/api/projects`
```json
// Request Body — startDate & endDate BẮT BUỘC
{
  "name": "Website Redesign",
  "description": "Thiết kế lại giao diện website",
  "code": "WRD",                    // optional, tối đa 10 ký tự, tự uppercase, unique
  "priority": "high",
  "startDate": "2026-08-01",
  "endDate": "2026-12-31",
  "budget": 50000,
  "manager": "user_id"              // optional — mặc định là user đang đăng nhập
}

// Response 201
{ "success": true, "data": { "project": { ... } }, "message": "Tạo dự án thành công" }
```

### DELETE `/api/projects/:id`
Nếu dự án còn task, API trả **400** kèm hướng dẫn. Thêm `?force=true` để xóa dự án **và toàn bộ task** của nó.

### Danh sách dự án có thêm `taskStats`
Mỗi phần tử trong `GET /` được bổ sung `taskStats: { totalTasks, completedTasks }`.

---

## 3. Tasks (`/api/tasks`)

Nhóm lớn nhất — **30 endpoint**. Mọi endpoint đều 🔒; cột Auth dưới đây chỉ ghi phần
**chặt hơn** mức đăng nhập.

### 3.1. CRUD và trạng thái

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/` | Danh sách tasks | — |
| GET | `/:id` | Chi tiết task | — |
| POST | `/` | Tạo task | 📋 PM+ |
| PUT | `/:id` | Cập nhật task (bao gồm gán `assignee`) | 📋 PM+ hoặc người được giao¹ |
| PATCH | `/:id/status` | Đổi nhanh status (Kanban drag & drop) | 📋 PM+ hoặc người được giao |
| DELETE | `/:id` | Xóa task | 📋 PM+ |
| GET | `/stats/summary` | Thống kê task | — |
| GET | `/summary/stats` | Bí danh của endpoint trên² | — |

² Hai đường dẫn khác nhau trỏ cùng một handler. Giữ cả hai vì phiên bản giao diện cũ gọi
đường còn lại; dùng `/stats/summary` cho code mới.

### 3.2. Vòng đời công việc (Base Wework)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| PATCH | `/:id/complete` | Người thực hiện báo hoàn thành | người được giao |
| POST | `/:id/review` | Người đánh giá duyệt / trả lại | người đánh giá |
| GET | `/pending-review` | Việc đang chờ chính mình đánh giá | — |
| POST | `/:id/report-result` | Nộp báo cáo kết quả | người được giao |
| PATCH | `/:id/deadline` | Đổi thời hạn kèm lý do | — |
| POST | `/:id/duplicate` | Nhân bản công việc | — |
| POST | `/:id/move` | Chuyển sang dự án / nhóm khác | — |
| GET | `/reminders` | Nhắc việc của chính mình | — |

### 3.3. Bình luận, checklist, người theo dõi, việc con

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/:id/comments` | Thêm bình luận | — |
| DELETE | `/:id/comments/:commentId` | Xóa bình luận | tác giả hoặc 👑 |
| POST | `/:id/checklist` | Thêm mục checklist | — |
| PUT | `/:id/checklist/:itemId/toggle` | Đổi trạng thái mục | — |
| DELETE | `/:id/checklist/:itemId` | Xóa mục | — |
| POST | `/:id/followers` | Thêm người theo dõi | — |
| DELETE | `/:id/followers/:userId` | Gỡ người theo dõi | — |
| GET | `/:id/subtasks` | Danh sách việc con | — |
| POST | `/:id/subtasks` | Tạo việc con | — |

### 3.4. Excel và bàn giao hàng loạt

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/excel/template` | Tải file mẫu `.xlsx` | — |
| POST | `/excel/preview` | Xem trước dữ liệu từ file | — |
| POST | `/excel/import` | Nhập hàng loạt vào một dự án | — |
| GET | `/reassign-preview` | Xem trước tập việc sẽ bàn giao | 📋 PM+ |
| POST | `/bulk-reassign` | Bàn giao hàng loạt | 📋 PM+ |

Ba endpoint Excel nhận `multipart/form-data`, field file tên **`file`**. Chú thích JSDoc
trong controller ghi `/template-excel`, `/preview-excel`, `/import-excel` — **sai**; đường
dẫn thật là `/excel/*` như bảng trên.

¹ **Người được giao việc** (`assignee`) sửa được task của chính mình, nhưng chỉ ba trường
`status`, `progress`, `actualHours`. Gửi kèm bất kỳ trường nào khác → **403** kèm danh sách
trường bị từ chối. Việc này để họ không tự chuyển việc sang người khác hay đổi phạm vi công việc.
Sửa task của người khác cũng trả 403; task không tồn tại vẫn trả 404.

Quy tắc nằm ở [`middleware/taskAccess.js`](../server/src/middleware/taskAccess.js).

**Query filter cho `GET /`**: `project`, `status`, `priority`, `assignee`, `search` (title/description), `page`, `limit`, `sort`.

### POST `/api/tasks`
```json
// Request Body
{
  "title": "Thiết kế UI Dashboard",
  "description": "Thiết kế giao diện trang Dashboard",
  "project": "project_id_here",       // BẮT BUỘC
  "priority": "high",
  "status": "todo",                   // 'todo'|'in_progress'|'review'|'done'|'blocked'
  "startDate": "2026-08-05",
  "endDate": "2026-08-15",
  "estimatedHours": 40,
  "assignee": "user_id",              // ObjectId của User (KHÔNG phải Resource)
  "dependencies": ["task_id_1"],      // mảng ObjectId phẳng
  "requiredSkills": [
    { "name": "Figma", "level": 3, "weight": 1 },
    { "name": "React", "level": 2, "weight": 0.5 }
  ]
}
```

**Lưu ý quan trọng về `requiredSkills`**: field tên là `name` (không phải `skill`), kèm `level`
(1-4, mặc định 3) và `weight` (0-1, mặc định 1). Gửi sai tên field sẽ bị Mongoose loại bỏ âm thầm.

Kiểm tra từng phần tử — mọi trường hợp trả **400**:

| Trường hợp | Thông báo |
|-----------|-----------|
| Thiếu `name` | `Tên kỹ năng yêu cầu không được để trống` |
| `level` ngoài 1-4 | `Level kỹ năng yêu cầu phải từ 1 đến 4` |
| `weight` ngoài 0-1 | `Trọng số kỹ năng phải từ 0 đến 1` |

`name` so khớp với `Resource.skills[].name` **không phân biệt hoa thường**, nên tên lệch
một chữ sẽ cho điểm khớp 0 mà không có lỗi nào. `level` dùng chung thang 1-4 với
`Resource.skills[].level` — xem [ALGORITHMS.md](./ALGORITHMS.md) mục 1.3.

**Kiểm tra `dependencies`** (áp dụng cho cả `POST /` và `PUT /:id`) — mọi trường hợp dưới đây
đều trả **400** kèm thông báo tiếng Việt:

| Trường hợp | Thông báo |
|-----------|-----------|
| Phần tử không phải ObjectId hợp lệ | `ID công việc tiền nhiệm không hợp lệ` |
| Task phụ thuộc chính nó | `Công việc không thể phụ thuộc vào chính nó` |
| ID không tồn tại | `Có công việc tiền nhiệm không tồn tại` |
| Tiền nhiệm thuộc dự án khác | `Công việc "..." thuộc dự án khác, không thể làm tiền nhiệm` |
| Tạo thành vòng lặp (trực tiếp hoặc gián tiếp) | `Phụ thuộc này tạo thành vòng lặp giữa các công việc` |

ID trùng trong danh sách được gộp lại trước khi lưu. Ràng buộc vòng lặp là bắt buộc vì
CPM trên sơ đồ Gantt và ràng buộc H4 của CSP đều giả định đồ thị không có chu trình.

**Gửi vào phẳng, đọc ra có cấu trúc.** Request nhận mảng ObjectId, nhưng response trả:

```json
"dependencies": [ { "task": { "_id": "...", "title": "...", "status": "todo" },
                    "type": "finish_to_start" } ]
```

Schema có setter tự bọc mỗi ObjectId thành `{ task, type }` với `type` mặc định
`finish_to_start`. Client đọc `dependencies[i]` như một id sẽ nhận về object.

### Hành vi tự động
- Tạo/sửa/xóa task đều **tính lại `progress` của dự án** (trung bình progress các task, task `done` tính 100).
- `PUT /:id` khi đổi status sang `done` → `progress` tự set 100.
- `PATCH /:id/status`: `done` → progress 100; `todo` → progress 0.
- Không cho phép đổi `project` của task qua `PUT`.
- Xóa task sẽ gỡ nó khỏi `dependencies` của mọi task khác.
- Gán `assignee` cho người khác sẽ tạo **notification real-time** qua Socket.IO.

### PATCH `/api/tasks/:id/complete` và POST `/api/tasks/:id/review`

Hai endpoint này là một luồng, và **luồng nào chạy phụ thuộc vào dự án**:

| `project.reviewConfig.enabled` | `PATCH /:id/complete` đưa việc tới |
|--------------------------------|-------------------------------------|
| `false` (hoặc không có) | `done`, `progress: 100` |
| `true` | `review`, `reviewDecision: 'pending'` |

`completedAt` được ghi ở **cả hai** nhánh, ngay tại lúc người làm báo xong — đúng/trễ hạn
tính theo lúc việc thực sự hoàn thành, không theo lúc người đánh giá rảnh tay bấm duyệt.

Gọi `complete` trên việc đã `done` → **400** `Công việc đã hoàn thành`.

```json
// POST /:id/review — request
{ "decision": "approve", "comment": "..." }    // 'approve' | 'reject'
```

| Trường hợp | Kết quả |
|-----------|---------|
| `decision` khác `approve`/`reject` | **400** `Quyết định đánh giá không hợp lệ` |
| Task không ở trạng thái `review` | **400** `Công việc không ở trạng thái Chờ đánh giá` |
| Người gọi không có quyền đánh giá | **403** |
| `reject` mà `comment` trống | **400** `Cần nhập lý do khi trả lại công việc` |

`approve` → `status: 'done'`, `progress: 100`, và nếu đã có báo cáo kết quả thì đóng luôn
`resultReport.approvedBy/approvedAt`. `reject` → `status: 'in_progress'` (không phải `todo`:
việc đã làm dở, không quay về vạch xuất phát).

Bắt buộc có lý do khi trả lại là có chủ ý — trả về mà không nói vì sao thì vòng sau rất dễ
hỏng lại đúng chỗ cũ.

**Ai được đánh giá**: `admin`, `project_manager`, quản lý của dự án, hoặc người có tên trong
`task.reviewers` (thiếu thì lấy `project.reviewConfig.reviewers`).

`GET /pending-review` chỉ trả những việc mà **chính người gọi** được quyền kết luận, kèm ba
field tính thêm:

```json
{ "tasks": [ { ..., "slaHours": 24, "isOverdueReview": false, "waitingHours": 3.5 } ],
  "total": 1, "overdue": 0 }
```

### POST `/api/tasks/:id/report-result`
```json
{
  "summary": "Đã xong phần API",
  "deliverableLinks": [ { "title": "Pull request", "url": "https://..." } ],
  "attachments": [ { "name": "bao-cao.pdf", "url": "https://..." } ],
  "actualHours": 12,
  "markAsDone": true
}
```

`deliverableLinks` và `attachments` là mảng **object**, không phải mảng chuỗi. Gửi
`["https://..."]` trả **400** kèm nguyên văn lỗi Mongoose
(`Cast to embedded failed ... ObjectParameterError`) — thông báo không dịch, vì đây là lỗi
cast của schema chứ không phải một ca validate được viết tay.

`markAsDone: true` đi qua đúng luồng đánh giá của dự án như `PATCH /:id/complete`: dự án bật
đánh giá thì việc chỉ tới `review`, không tự nhảy sang `done`. Để nguyên đường vòng cũ thì ai
nộp báo cáo cũng tự tuyên bố việc mình xong và bước duyệt thành hình thức.

### PATCH `/api/tasks/:id/deadline`
```json
{ "newEndDate": "2026-12-01", "reason": "Chờ dữ liệu từ đối tác" }
```

Nhận cả `newEndDate`, `dueDate` hay `endDate` — lấy field nào có trước. Không có field nào →
**400** `Thời hạn mới là bắt buộc`. `reason` để trống thì ghi
`Gia hạn theo yêu cầu công việc`.

Mỗi lần đổi **ghi thêm một dòng** vào `task.deadlineHistory` (`oldEndDate`, `newEndDate`,
`changedBy`, `reason`, `changedAt`), không ghi đè dòng cũ. Response populate `changedBy`.

### POST `/api/tasks/:id/duplicate` và `/:id/move`
```json
// duplicate
{ "newTitle": "...", "targetProjectId": "...", "targetTaskGroupId": "..." }
```

Bản sao **luôn về vạch xuất phát**: `status: 'todo'`, `progress: 0`, `startDate` là hôm nay,
mọi mục checklist `isCompleted: false`. Giữ nguyên `assignee`, `followers`, `priority`,
`estimatedHours`, `endDate`, `requiredSkills`. Không sao chép `comments`, `dependencies`,
`resultReport` hay `deadlineHistory`. Tiêu đề mặc định là `"<tiêu đề gốc> (Bản sao)"`.

**Việc con được nhân bản theo** và trỏ vào bản sao mới, mỗi cái cũng thêm hậu tố `(Bản sao)`.

`POST /:id/move` chỉ đổi `project` và/hoặc `taskGroup`, rồi **kéo việc con theo cùng**. Gửi
`targetTaskGroupId: null` để bỏ task ra khỏi nhóm. Endpoint này **không** kiểm tra dự án đích
có tồn tại hay `dependencies` có còn hợp lệ sau khi chuyển.

### GET `/api/tasks/reminders`
Chỉ lấy việc **giao cho chính người gọi**, có `endDate`, và chưa `done`. Trả bốn tập
cùng lúc — cùng một tập việc, cắt theo bốn mốc thời gian:

| Khóa | Nội dung |
|------|----------|
| `important` | Hạn trong khoảng ±7 ngày so với hôm nay |
| `today` | Hạn trong hôm nay |
| `overdue` | Hạn đã qua, chưa hoàn thành |
| `schedule` | Toàn bộ, kể cả xa hơn 7 ngày |

```json
"counts": { "important": 3, "today": 1, "overdue": 2, "total": 9, "badgeCount": 3 }
```

`badgeCount` bằng `important`, **không** bằng `total` — con số trên chuông là số việc cần để
ý tuần này, không phải tổng số việc còn mở.

### Bình luận và checklist

```json
// POST /:id/comments
{ "content": "Nhờ bạn cập nhật tiến độ" }     // trống hoặc chỉ khoảng trắng → 400

// Response 201 — chỉ trả bình luận vừa thêm, đã populate user
{ "success": true, "data": { "comment": { "_id": "...", "content": "...",
    "user": { "name": "...", "avatar": null }, "createdAt": "..." } } }
```

Bình luận **gửi thông báo** cho `assignee` và toàn bộ `followers`, trừ chính người viết.

`DELETE /:id/comments/:commentId` chỉ cho tác giả hoặc `admin` — người khác nhận **403**
`Bạn chỉ được xóa bình luận của mình`. PM **không** xóa được bình luận của người khác.

```json
// POST /:id/checklist
{ "title": "Viết unit test", "assignee": "user_id" }   // title trống → 400

// PUT /:id/checklist/:itemId/toggle — response kèm tiến độ đã tính sẵn
{ "success": true, "data": { "item": { ..., "isCompleted": true },
    "checklistProgress": { "total": 4, "completed": 3, "percent": 75 } } }
```

`toggle` **đảo** trạng thái, không nhận giá trị mong muốn — gọi hai lần là về như cũ.
`order` của mục mới bằng số mục đang có; xóa mục **không** đánh lại `order` của các mục sau.

### Người theo dõi

```json
// POST /:id/followers — nhận cả hai dạng
{ "userIds": ["id1", "id2"] }
{ "userId": "id1" }              // dạng đơn, giao diện cũ còn dùng
```

| Trường hợp | Kết quả |
|-----------|---------|
| Không có id nào | **400** `Chưa chọn người theo dõi nào` |
| Không id nào hợp lệ về hình thức | **400** `Danh sách người theo dõi không hợp lệ` |
| Có id không trỏ tới tài khoản nào | **400** `Danh sách có người dùng không tồn tại` |
| Trong danh sách có `assignee` | **400** `Người thực hiện đã nhận thông báo ...` |
| Tất cả đã theo dõi rồi | **400** `Những người này đã theo dõi công việc` |
| Vượt 50 người | **400** `Tối đa 50 người theo dõi trên một công việc` |

Chặn `assignee` làm follower là có chủ ý: họ vốn đã nhận mọi thông báo của công việc, thêm
vào chỉ nhân đôi thông báo và thêm một dòng thừa trong danh sách.

`DELETE /:id/followers/:userId` trả **404** nếu người đó chưa từng theo dõi. Trước đây luôn
trả 200, nên giao diện không phân biệt được "đã gỡ xong" với "gỡ nhầm người".

Người theo dõi **không** sinh khối lượng công việc — họ không vào `currentWorkload` của
Resource. Chỉ `assignee` mới tính.

### Việc con

`POST /:id/subtasks` kế thừa từ việc cha: `project`, `taskGroup`, `companyName`, và
`priority` nếu không gửi. Mặc định `estimatedHours: 2`, `status: 'todo'`. `title` trống →
**400**. Việc cha không tồn tại → **404**.

Việc con là **Task đầy đủ** với `parentTask` trỏ về cha, nên nó cũng vào danh sách
`GET /tasks` và cũng được tính vào `progress` của dự án.

Tạo việc con **gửi thông báo** cho người phụ trách việc cha, trừ khi đó chính là người tạo.

### GET `/api/tasks/reassign-preview` và POST `/api/tasks/bulk-reassign`

```
GET /api/tasks/reassign-preview?fromUserId=<id>&projectId=<id>
```

`fromUserId` thiếu hoặc sai định dạng → **400**. Response:

```json
{
  "tasks": [ { "_id": "...", "title": "...", "status": "in_progress", "estimatedHours": 32,
               "project": { "name": "...", "code": "ECOM-01" } } ],
  "total": 1,
  "totalEstimatedHours": 32,
  "byStatus": { "in_progress": 1 },
  "excludedNote": "Công việc đã Hoàn thành hoặc Thất bại không được bàn giao"
}
```

Việc đã `done` hoặc `failed` **không bao giờ** nằm trong tập bàn giao — đổi người thực hiện
của một việc đã ngã ngũ là viết lại lịch sử ai đã thực sự làm nó. `excludedNote` nói thẳng
điều đó thay vì để người dùng tự đoán vì sao con số nhỏ hơn họ tưởng.

```json
// POST /bulk-reassign
{ "fromUserId": "...", "toUserId": "...", "projectId": "...", "taskIds": [...], "reason": "..." }
```

| Trường hợp | Kết quả |
|-----------|---------|
| `fromUserId` / `toUserId` thiếu hoặc sai | **400** |
| Hai id trùng nhau | **400** `Người bàn giao và người nhận phải khác nhau` |
| Người nhận không tồn tại | **404** |
| Người nhận `isActive: false` | **400** `Không bàn giao được cho tài khoản đã bị vô hiệu hóa` |
| Không việc nào khớp bộ lọc | **400** `Không có công việc nào phù hợp để bàn giao` |

Chỉ đổi `assignee`. **`reviewers` giữ nguyên** kể cả với việc đang chờ đánh giá: người nộp và
người duyệt là hai vai khác nhau, gộp lại thì người mới có thể tự duyệt việc vừa nhận.

Sau khi bàn giao: tính lại `progress` của mọi dự án liên quan, đồng bộ `currentWorkload` của
**cả hai** người, gửi một thông báo cho người nhận, và ghi **một** dòng ActivityLog cho cả lô
— thao tác này là một quyết định duy nhất, tách thành 40 dòng sẽ chôn vùi nhật ký của mọi thứ khác.

```json
"suggestion": { "message": "Nên kiểm tra tải của người nhận sau khi bàn giao",
                "endpoint": "/api/optimization/readiness?projectId=..." }
```

Chỉ là gợi ý, server **không** tự chạy lại tối ưu hóa: đây là thao tác bàn giao, không phải
lệnh phân bổ lại cả dự án.

### GET `/api/tasks/stats/summary`
```json
{
  "totals": { "totalTasks": 5, "averageProgress": 50,
              "totalEstimatedHours": 140, "totalActualHours": 38 },
  "byStatus":   [ { "_id": "done", "count": 2 }, { "_id": "todo", "count": 2 } ],
  "byPriority": [ { "_id": "high", "count": 4 }, { "_id": "critical", "count": 1 } ]
}
```

`byStatus` và `byPriority` là kết quả `$group` thô — **chỉ có** những giá trị thực sự xuất
hiện. Status không có task nào sẽ vắng mặt hoàn toàn chứ không trả `count: 0`, nên giao diện
phải tự điền 0 cho các cột còn lại.

---

## 4. Resources (`/api/resources`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/stats/summary` | Thống kê nhân sự (availability, department, utilization) | 🔒 |
| POST | `/recalculate-workload` | Tính lại workload + availability cho toàn bộ nhân sự | 👑 |
| GET | `/` | Danh sách nhân sự | 🔒 |
| GET | `/:id` | Chi tiết nhân sự + danh sách task đang được gán | 🔒 |
| POST | `/` | Thêm nhân sự | 📋 PM+ |
| PUT | `/:id` | Cập nhật nhân sự | 📋 PM+ |
| PUT | `/:id/skills` | Cập nhật skill matrix | 📋 PM+ |
| DELETE | `/:id` | Xóa nhân sự | 👑 |

**Query filter cho `GET /`**: `department`, `availability`, `skill` (regex theo tên kỹ năng),
`skillLevel` (1-4, lọc `>=`), `isActive`, `search` (position/department/employeeId), `page`, `limit`, `sort`.

### POST `/api/resources`
Cho phép **liên kết tài khoản có sẵn** hoặc **tạo tài khoản mới cùng lúc**:

```json
// Cách 1 — liên kết User đã tồn tại
{ "user": "user_id", "position": "Backend Developer", "department": "Engineering" }

// Cách 2 — tạo User mới kèm theo
{
  "newUser": { "name": "Trần B", "email": "b@rao.com", "password": "123456", "role": "member" },
  "position": "Backend Developer",
  "department": "Engineering",
  "maxCapacity": 40,
  "fte": 1,
  "hourlyRate": 25,
  "skills": [{ "name": "Node.js", "level": 3, "yearsOfExperience": 2 }]
}
```

- `position` và `department` **bắt buộc**. `department` phải trùng tên một Department đang `isActive`,
  nếu không API trả 400 `"Phòng ban không hợp lệ hoặc chưa được tạo"`.
- `employeeId` **do hệ thống tự sinh** (`NV0001`, `NV0002`...). Giá trị client gửi lên bị bỏ qua.
- Nếu tạo User mới thất bại ở bước tạo Resource, User vừa tạo sẽ được rollback.

### Lịch nghỉ — `unavailablePeriods`

Gửi kèm trong `POST /` hoặc `PUT /:id` (giao diện dùng `PUT /:id`, thay toàn bộ danh sách):

```json
{
  "unavailablePeriods": [
    { "startDate": "2026-10-01T00:00:00.000Z", "endDate": "2026-10-05T23:59:59.000Z", "reason": "Nghỉ phép năm" }
  ]
}
```

CSP Solver dùng danh sách này cho ràng buộc **H3**: nhân sự có kỳ nghỉ giao với thời gian
task sẽ bị loại khỏi miền giá trị của task đó. Vì vậy dữ liệu lệch sẽ làm sai kết quả phân
bổ một cách âm thầm, và các trường hợp sau bị chặn ngay với **400**:

| Trường hợp | Thông báo |
|-----------|-----------|
| Không phải mảng | `Lịch nghỉ phải là mảng` |
| Thiếu / sai định dạng ngày | `Kỳ nghỉ thứ N: thiếu hoặc sai định dạng ngày` |
| `endDate` trước `startDate` | `Kỳ nghỉ thứ N: ngày kết thúc trước ngày bắt đầu` |
| `reason` quá 200 ký tự | `Kỳ nghỉ thứ N: lý do không vượt quá 200 ký tự` |
| Hai kỳ nghỉ giao nhau | `Các kỳ nghỉ không được chồng lên nhau` |

Hai kỳ nghỉ liền kề nhưng không giao nhau là hợp lệ.

### GET `/api/resources/:id`
```json
{ "success": true, "data": { "resource": { ... }, "assignments": [ /* task todo/in_progress/review */ ] } }
```

---

## 5. Departments (`/api/departments`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/` | Danh sách phòng ban (kèm `resourceCount`) | 🔒 |
| POST | `/` | Tạo phòng ban | 📋 PM+ |
| PUT | `/:id` | Cập nhật phòng ban | 📋 PM+ |
| DELETE | `/:id` | Xóa phòng ban | 👑 |

**Query filter**: `isActive` (boolean), `search` (theo `name`).

```json
// POST body
{ "name": "Engineering", "code": "ENG", "description": "...", "managerName": "...", "isActive": true }
```

`name` unique & bắt buộc; `code` unique (sparse), tối đa 12 ký tự, tự uppercase.
**Không xóa được** phòng ban đang có nhân sự `isActive` → trả 400.

---

## 6. Optimization (`/api/optimization`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/run/genetic` | Chạy Genetic Algorithm | 🔒 |
| POST | `/run/csp` | Chạy CSP Solver | 🔒 |
| POST | `/run/hybrid` | Chạy Hybrid (CSP + GA) | 🔒 |
| GET | `/history` | Lịch sử tối ưu hóa (50 bản ghi mới nhất) | 🔒 |
| GET | `/compare?ids=` | So sánh song song 2–4 phương án | 🔒 |
| GET | `/:id` | Chi tiết một kết quả | 🔒 |
| POST | `/:id/apply` | Áp dụng kết quả vào hệ thống | 📋 PM+ |

> Không có endpoint `POST /run` gộp — mỗi thuật toán một đường dẫn riêng.
> Chi tiết kết quả là `GET /:id`, **không phải** `GET /:id/result`.
> `/compare` khai báo **trước** `/:id` trong router, nếu không Express khớp chuỗi
> `"compare"` vào `:id` và request chết ở tầng validate.

### POST `/api/optimization/run/genetic`
Body **phẳng** (không lồng `parameters`/`weights`), và chỉ nhận **một** `projectId`:

```json
{
  "projectId": "project_id",     // optional — bỏ trống = tối ưu toàn hệ thống
  "populationSize": 100,
  "maxGenerations": 500,
  "crossoverRate": 0.8,
  "mutationRate": 0.1,
  "workloadWeight": 0.30,
  "skillWeight": 0.35,
  "costWeight": 0.15,
  "overallocationWeight": 0.20
}
```

Chỉ những task ở trạng thái `todo` / `in_progress` / `review` được đưa vào tối ưu hóa.
Nếu không có task hoặc không có nhân sự → **400**.

### POST `/api/optimization/run/csp`
```json
{ "projectId": "...", "maxIterations": 10000, "timeout": 30000, "minSkillMatchThreshold": 0.5 }
```

### POST `/api/optimization/run/hybrid`
Nhận cùng bộ tham số như GA (`projectId` + các tham số GA).
Response có thêm `cspFeasible` ở cấp `data`.

Pha CSP lọc miền giá trị rồi GA tối ưu **trên miền đã thu hẹp** đó. Kết quả có thêm
`domainReduction` để biết pha CSP đã cắt được bao nhiêu:

```json
"domainReduction": {
  "restricted": true,      // GA có chạy trên miền đã lọc không
  "totalPairs": 240,       // số cặp (công việc × nhân sự) trước khi lọc
  "feasiblePairs": 48,     // còn lại sau khi lọc H2/H3 + capacity
  "tasksReopened": 0       // task có miền rỗng, buộc mở lại toàn bộ nhân sự
}
```

`tasksReopened > 0` nghĩa là có công việc **không nhân sự nào đủ điều kiện**; ràng buộc
được nới riêng cho những công việc đó, nếu không thuật toán sẽ không gán được ai. Giao
diện hiện cảnh báo tương ứng. Chỉ endpoint hybrid mới có trường này.

### Response của cả 3 endpoint run

Trả về **nguyên document `OptimizationResult`**, không phải object rút gọn:

```json
{
  "success": true,
  "data": {
    "result": {
      "_id": "...",
      "algorithm": "genetic",
      "status": "completed",              // 'running' | 'completed' | 'failed'
      "fitness": 0.8734,                  // ở CẤP GỐC, không phải metrics.totalFitness
      "executionTime": 1500,              // ms — không phải executionTimeMs
      "generations": 120,
      "taskCount": 12,
      "resourceCount": 3,
      "assignments": [
        { "task": "...", "taskTitle": "...", "resource": "...",
          "resourceName": "...", "skillMatch": 100, "estimatedHours": 40 }
      ],
      "metrics": {
        "workloadVariance": 2.3,
        "averageSkillMatch": 92,          // THANG 0-100 (%), không phải 0-1
        "totalCost": 12500,
        "overallocatedResources": 0,      // không phải overallocatedCount
        "averageUtilization": 78,
        "resourceUtilization": [
          { "resource": "...", "name": "...", "workload": 32,
            "capacity": 40, "utilization": 80, "isOverloaded": false }
        ]
      },
      "convergenceHistory": [ { "generation": 0, "fitness": 0.74 } ],  // mảng OBJECT
      "constraintReport": {
        "satisfied": 3,
        "violated": 1,
        "details": {
          "satisfied": [
            { "type": "capacity", "subject": "Trần Văn Nam", "detail": "32/40h" }
          ],
          "violated": [
            { "type": "dependency",
              "subject": "Xây dựng REST APIs → Phát triển Giao diện",
              "detail": "công việc sau bắt đầu sớm hơn 6 ngày so với lúc công việc trước kết thúc" }
          ]
        }
      },
      "isApplied": false, "appliedAt": null, "appliedBy": null
    }
  }
}
```

> Cả ba thuật toán đều trả `fitness` và `metrics` theo **cùng một thang đo** (module dùng chung
> `src/algorithms/scoring.js`), nên so sánh trực tiếp được trong lịch sử. Riêng CSP không có
> `convergenceHistory`/`generations` mà có `iterations`.
>
> `constraintReport` chỉ do CSP (và pha CSP của Hybrid) sinh ra. Mục `type: 'dependency'` trong
> `violated` là **lỗi dữ liệu lịch**, không phải lỗi phân công: thuật toán chỉ chọn người chứ
> không đổi được ngày. Xem [ALGORITHMS.md](./ALGORITHMS.md) mục 2.2.
>
> Các bản ghi CSP tạo **trước** thay đổi này vẫn còn `fitness: 0` và `metrics` rỗng trong DB.

### GET `/api/optimization/compare?ids=id1,id2,id3`

Đặt 2–4 phương án cạnh nhau. Nhận danh sách ID ngăn bằng dấu phẩy; ID trùng bị khử
trước khi đếm, nên `?ids=X,X` là **400** chứ không phải "hai phương án".

| Trường hợp | Mã |
|---|---|
| Dưới 2 ID khác nhau | 400 |
| Quá 4 ID | 400 |
| ID sai định dạng ObjectId | 400 |
| Có ID không tồn tại | 404 |

```json
{
  "success": true,
  "data": {
    "comparison": {
      "results": [ /* bản rút gọn của từng phương án, GIỮ ĐÚNG THỨ TỰ trong ?ids */ ],
      "metrics": [
        { "key": "fitness", "digits": 4,
          "higherIsBetter": true, "values": [0.8734, 0.8102, 0.8734], "bestIndex": null }
      ],
      "assignments": {
        "total": 12, "comparable": 12, "agreed": 8, "agreementRate": 67,
        "rows": [
          { "task": "...", "taskTitle": "...", "comparable": true, "agreed": false,
            "cells": [ { "resource": "...", "resourceName": "...", "skillMatch": 100 }, null ] }
        ]
      },
      "warnings": [{ "code": "mixedTaskCount", "counts": [12, 8] }]
    }
  }
}
```

9 chỉ số: `fitness`, `assignedCount`, `averageSkillMatch`, `workloadVariance`,
`overallocatedResources`, `totalCost`, `averageUtilization`, `violatedConstraints`,
`executionTime`.

`metrics[].key` và `warnings[].code` là **mã, không phải câu chữ** — client tra nhãn và
đơn vị theo ngôn ngữ đang chọn. Ba mã cảnh báo: `mixedScope`, `mixedTaskCount` (kèm
`counts`), `unfinished` (kèm `count`).

**Quy ước quan trọng khi đọc kết quả:**

- `bestIndex` là `null` khi **không có bên thắng rõ ràng**: chỉ số vô hướng
  (`higherIsBetter: null`, ví dụ `averageUtilization` — 40% là để phí người, 100% là vắt
  kiệt), dưới hai phương án có số liệu, hoặc **nhiều phương án cùng đạt giá trị tốt nhất**.
  Không trao giải cho phương án đứng trước chỉ vì nó đứng trước.
- Giá trị `null` trong `values` nghĩa là **phương án đó không sinh ra chỉ số này**, khác hẳn
  0. GA không kiểm tra ràng buộc nên `violatedConstraints` của nó là `null`, không phải
  "0 vi phạm"; `constraintReport` của nó cũng là `null`.
- `workloadVariance` giữ nguyên tên field vì dữ liệu cũ đã lưu vậy, nhưng giá trị thực tế là
  **độ lệch chuẩn** (`scoring.js` lấy căn bậc hai của phương sai) — client gọi đúng tên đó.
- Một công việc chỉ tính vào `agreed`/`comparable` khi **mọi** phương án đều phân công nó.
  Công việc có phương án bỏ trống bị loại khỏi mẫu số thay vì bị tính là bất đồng, nên
  `agreementRate` có thể là `null` nếu không công việc nào so được.
- `rows` sắp xếp **chỗ khác nhau lên trước**.
- `warnings` cảnh báo khi các phương án không thực sự so được: khác phạm vi dự án, khác số
  công việc đầu vào (chỉ số cộng dồn như `totalCost` sẽ lệch theo quy mô chứ không theo chất
  lượng lời giải), hoặc có phương án chưa `completed`.

Response cố tình **không kèm** `metrics.resourceUtilization` và `constraintReport.details` —
bảng so sánh không dùng tới, mà 4 phương án kèm đủ hai mảng đó là payload rất nặng.

### POST `/api/optimization/:id/apply`
Ghi `assignee` cho từng task theo `assignments`, dùng `resource.user` (User ID) làm giá trị.
Chỉ áp dụng được kết quả `status === 'completed'` và chưa từng `isApplied`.
Gửi notification real-time cho toàn hệ thống và ghi ActivityLog.

```json
{ "success": true, "data": { "result": {...}, "appliedCount": 12 }, "message": "..." }
```

---

## 7. Analytics (`/api/analytics`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/dashboard` | Tổng quan dashboard (projects/tasks/resources + hoạt động gần đây) | 🔒 |
| GET | `/utilization` | Utilization từng nhân sự + theo phòng ban + burnout risk | 🔒 |
| GET | `/tasks` | Phân bố task theo status/priority/project + tỉ lệ giờ | 🔒 |
| GET | `/workload-trend` | Chuỗi thời gian khối lượng vs năng lực | 🔒 |
| GET | `/optimization-comparison/:id` | So sánh trạng thái hiện tại vs kết quả tối ưu hóa | 🔒 |

### GET `/api/analytics/utilization`
```json
{
  "success": true,
  "data": {
    "resources": [
      { "_id": "...", "name": "...", "department": "...", "position": "...",
        "capacity": 40, "workload": 32, "utilization": 80, "taskCount": 3,
        "availability": "available", "isOverloaded": false,
        "burnoutRisk": "low",        // >120% = 'high', >90% = 'medium', còn lại 'low'
        "skillCount": 5 }
    ],
    "departments": [ { "name": "...", "totalCapacity": 120, "totalWorkload": 90, "count": 3, "utilization": 75 } ],
    "summary": { "totalResources": 3, "overloaded": 0, "highBurnout": 0, "avgUtilization": 62 }
  }
}
```
> Field là `summary.highBurnout` (không phải `highBurnoutRisk`).

### GET `/api/analytics/workload-trend`

| Query | Mặc định | Ghi chú |
|---|---|---|
| `from`, `to` | trọn khoảng các công việc chiếm | ISO date; sai định dạng → **400** |
| `granularity` | `day` | `day` \| `week`; tuần bắt đầu từ thứ Hai |
| `projectId` | tất cả | sai định dạng ObjectId → **400** |

```json
{
  "success": true,
  "data": {
    "trend": {
      "granularity": "week",          // có thể KHÁC tham số gửi lên, xem bên dưới
      "from": "2026-03-02T00:00:00.000Z",
      "to": "2026-03-13T00:00:00.000Z",
      "truncated": false,
      "buckets": [ { "key": "2026-03-02", "start": "...", "end": "..." } ],
      "totals": [ { "load": 40, "capacity": 40, "utilization": 100, "overloaded": 0 } ],
      "resources": [
        { "_id": "...", "name": "...", "position": "...",
          "load": [40, 32], "capacity": [40, 40],
          "peakUtilization": 100, "worksWhileUnavailable": false }
      ],
      "excluded": { "unscheduledTasks": 2, "unscheduledHours": 17,
                    "unassignedTasks": 1, "unassignedHours": 8 }
    }
  }
}
```

**Đây là dữ liệu suy ra, không phải dữ liệu ghi nhận.** Hệ thống không lưu ảnh chụp workload
theo ngày. Endpoint trải `estimatedHours` của mỗi công việc đều lên các **ngày làm việc**
trong khoảng `startDate`–`endDate` của nó rồi cộng theo từng người. Nó trả lời "khối lượng đã
cam kết rơi vào lúc nào", **không** trả lời "tháng trước ai đã thực sự làm bao nhiêu".

Các quy ước cần biết để không đọc sai:

- `load` và `capacity` là hai mảng **song song với `buckets`**, cùng độ dài, index khớp nhau.
- Mốc chỉ mang `key`, `start`, `end` — **không có nhãn dựng sẵn**. "Tuần 02/03" hay
  "Week 02/03" là chuyện hiển thị, client dựng từ `start` và `granularity`.
- Capacity ngày = `maxCapacity × fte / 5` (`maxCapacity` là giờ mỗi **tuần**). Bằng **0** vào
  cuối tuần và trong `unavailablePeriods`.
- `Resource.availability` **cố tình không được dùng**: đó là trạng thái hiện tại, không gắn
  với ngày nào, nên áp nó lên cả trục thời gian sẽ bóp méo cả quá khứ lẫn tương lai.
- `utilization` là `null` khi capacity bằng 0 — không có mẫu số thì không có tỉ lệ, và 0%
  sẽ là một lời nói dối. Cùng lý do, `peakUtilization` chỉ tính trên các mốc có capacity;
  trường hợp "có việc nhưng không có ngày làm việc nào" được báo bằng cờ
  `worksWhileUnavailable` chứ không quy thành một con số phần trăm.
- Công việc nằm **trọn trong cuối tuần** không có ngày làm việc nào để chia; khi đó giờ được
  chia đều cho ngày lịch, để số giờ không bốc hơi khỏi biểu đồ.
- Capacity được cộng cho **mọi** nhân sự đang hoạt động, kể cả người chưa được giao việc gì.
  Thiếu họ thì đường capacity tổng bị hụt và cả đội trông như đang quá tải.
- `excluded` đếm số giờ **không đặt được lên trục thời gian** (thiếu ngày, ngày kết thúc
  trước ngày bắt đầu, chưa giao người, hoặc người được giao không còn là nhân sự hoạt động).
  Chúng không nằm trong biểu đồ, nên phải được báo lại thay vì im lặng biến mất.
- Khoảng quá dài mà vẽ theo ngày sẽ tự **hạ xuống tuần** — vì vậy `granularity` trong response
  mới là nguồn đúng, không phải tham số đã gửi. Vượt trần số mốc thì cắt bớt và bật `truncated`.

### GET `/api/analytics/optimization-comparison/:id`
```json
{
  "success": true,
  "data": {
    "metrics": {
      "before": { "stdDev": 28.28, "overloadedCount": 1, "avgUtilization": 50 },
      "after":  { "stdDev": 14.24, "overloadedCount": 0, "avgUtilization": 50, "avgSkillMatch": 100 }
    },
    "resources": [
      { "resourceId": "...", "resourceName": "Trần Văn Nam", "position": "Senior Fullstack Developer",
        "capacity": 40,
        "beforeWorkload": 60, "beforeUtilization": 150,
        "afterWorkload": 32,  "afterUtilization": 80 }
    ],
    "current":   [ { "name": "...", "workload": 60, "capacity": 40, "utilization": 150 } ],
    "optimized": [ { "name": "...", "workload": 32, "capacity": 40, "utilization": 80 } ],
    "improvement": { "fitness": 0.87, "skillMatch": 100, "workloadVariance": 14.24 }
  }
}
```

- Chỉ nhận `id` của kết quả `status === 'completed'`, ngược lại trả 404.
- **`before`** được tính từ **task đang mở** (`todo`/`in_progress`/`review`) gộp theo `assignee`,
  cùng cách với `GET /analytics/utilization` — không đọc `Resource.currentWorkload` (field đó chỉ
  làm mới khi admin gọi `recalculate-workload` nên thường đã cũ). Nếu một nhân sự không có task
  nào đang mở thì mới lấy `currentWorkload` làm giá trị dự phòng.
- **`after`** lấy từ `metrics.resourceUtilization` của kết quả tối ưu hóa, ghép theo **resource ID**
  (không ghép theo tên để tránh sai khi trùng tên).
- `metrics.after.stdDev` chính là `metrics.workloadVariance` của kết quả — giá trị này vốn đã là
  độ lệch chuẩn σ.
- `current` / `optimized` giữ lại từ phiên bản trước để tương thích ngược.

---

## 8. Notifications (`/api/notifications`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/` | Thông báo của user hiện tại | 🔒 |
| PATCH | `/read-all` | Đánh dấu tất cả đã đọc | 🔒 |
| PATCH | `/:id/read` | Đánh dấu một thông báo đã đọc | 🔒 |

**Query**: `unread=true` để chỉ lấy chưa đọc, `page`, `limit`.
Response `GET /` có thêm `unreadCount` ở cấp gốc.

### Sự kiện Socket.IO
Client kết nối tới `http://localhost:5000` với `auth: { token }`. Server đưa socket vào room `user:<userId>`.

| Event | Hướng | Payload |
|-------|-------|---------|
| `notification:new` | Server → Client | Document Notification đã populate `actor` |
| `notification:read` | Server → Client | `{ id }` |
| `notification:read-all` | Server → Client | `{}` |

---

## 9. Activity Logs (`/api/activity-logs`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/` | Danh sách nhật ký hoạt động | 🔒 |
| GET | `/stats` | Thống kê (tổng, hôm nay, theo entityType, top 5 user) | 🔒 |
| DELETE | `/` | Xóa toàn bộ nhật ký | 👑 |

**Query filter cho `GET /`**: `entityType`, `action`, `user`, `search` (description/entityTitle/userName),
`startDate` + `endDate` (phải có cả hai), `page`, `limit`.

Các `action` đang được ghi: `CREATE_PROJECT`, `UPDATE_PROJECT`, `DELETE_PROJECT`,
`CREATE_TASK`, `UPDATE_TASK`, `UPDATE_TASK_STATUS`, `DELETE_TASK`, `APPLY_OPTIMIZATION`.

---

## 10. Health Check

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/health` | Kiểm tra server status | 🔓 |

```json
{ "status": "ok", "message": "Resource Allocation Optimization API is running", "timestamp": "2026-08-18T12:20:38.360Z" }
```

---

## 11. Task Groups (`/api/task-groups`)

Nhóm công việc trong một dự án — các cột của bảng Kanban.

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/:projectId` | Nhóm của một dự án, sắp theo `order` | 🔒 |
| POST | `/` | Tạo nhóm | 🔒 |
| PUT | `/reorder` | Đổi thứ tự nhiều nhóm một lượt | 🔒 |
| PUT | `/:id` | Sửa nhóm | 🔒 |
| DELETE | `/:id` | Xóa nhóm | 🔒 |

`PUT /reorder` khai báo **trước** `PUT /:id` trong router — đảo lại thì `/reorder` bị hiểu là
một `:id` và không bao giờ chạy tới.

**POST /** — body: `{ name, project, color?, order? }`. Trả `201`:

```json
{
  "success": true,
  "data": { "group": { "_id": "…", "name": "Backlog", "project": "…", "color": "#64748b",
                        "order": 0, "isOpen": true, "companyName": "Công ty Công nghệ RAO",
                        "createdBy": "…", "createdAt": "…", "updatedAt": "…" } },
  "message": "Đã tạo nhóm công việc"
}
```

**PUT /reorder** — body `{ orderedIds: [id1, id2, …] }`; `order` được gán bằng **chỉ số trong
mảng**, nên chỉ cần gửi đúng thứ tự mong muốn, không cần tự tính số. Sai kiểu thì trả `400`
`"orderedIds phải là mảng"`. Response chỉ có `message`, không kèm dữ liệu:

```json
{ "success": true, "message": "Đã cập nhật thứ tự nhóm" }
```

**GET /:projectId** trả `{ data: { groups: [...] } }` với `createdBy` đã populate
(`_id`, `name`, `avatar`). **PUT /:id** nhận `{ name?, color?, order?, isOpen? }`.
`isOpen: false` là nhóm đã đóng, không nhận việc mới.

---

## 12. Recurring Tasks (`/api/recurring-tasks`)

**Khuôn mẫu** sinh ra `Task`, không phải bản thân công việc. Xem
[DATABASE.md](./DATABASE.md#10-recurringtasks-collection) cho ý nghĩa từng field chu kỳ.

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/` | Danh sách khuôn | 🔒 |
| POST | `/preview` | Xem trước các mốc ngày sẽ sinh — **không** ghi gì | 🔒 |
| POST | `/` | Tạo khuôn | 🔑 admin, PM |
| PUT | `/:id` | Sửa khuôn | 🔑 admin, PM |
| DELETE | `/:id` | Xóa khuôn | 🔑 admin, PM |
| POST | `/:id/run-now` | Sinh ngay một Task từ khuôn, không chờ tới hạn | 🔑 admin, PM |

**POST /preview** — body `{ frequency, interval?, daysOfWeek?, dayOfMonth?, startDate, durationHours? }`.
Trả về 10 mốc kế tiếp. Đây là endpoint **chỉ đọc**, dùng để người dùng kiểm lại cấu hình
trước khi lưu:

```json
{
  "success": true,
  "data": { "dates": ["2026-10-01T00:00:00.000Z", "2026-10-05T00:00:00.000Z", "…"] }
}
```

Ví dụ trên là `frequency: 'weekly'`, `daysOfWeek: [1, 4]` (thứ Hai và thứ Năm) từ 01/10/2026.

**POST /** — body tối thiểu `{ title, project, startDate, frequency }`. Trả `201` với
`recurringTask` đã populate `project` (`_id`, `name`, `code`) và `assignee`
(`_id`, `name`, `email`, `avatar`).

**POST /:id/run-now** trả `201` kèm `{ data: { task } }` — một document `Task` mới, đã sao
`priority`, `estimatedHours`, `checklist`, `subtasks` từ khuôn. `endDate` tính bằng
`startDate + durationHours`. Task sinh ra là bản ghi **độc lập**, không giữ ref về khuôn.

**GET /** trả `{ success, count, data: { recurringTasks } }`.

---

## 13. Company Settings (`/api/company-settings`)

Cấu hình cấp công ty. Một bản ghi cho mỗi `companyName`; bản ghi được tạo tự động lúc seed.

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/` | Cấu hình của công ty người dùng đang thuộc | 🔒 |
| PUT | `/` | Cập nhật | 🔒 |

**PUT /** — body `{ createProjectPermission?, createDepartmentPermission? }`, mỗi field nhận
`'only_admin'` hoặc `'all_members'`.

```json
{
  "success": true,
  "data": { "settings": { "companyName": "Công ty Công nghệ RAO",
                          "createProjectPermission": "all_members",
                          "createDepartmentPermission": "only_admin" } },
  "message": "Cập nhật phân quyền tạo phòng ban / dự án thành công"
}
```

Hai cờ này quyết định **giao diện có hiện nút "Tạo dự án" / "Tạo Department"** hay không.
Chúng không thay thế kiểm tra ở server: route tạo dự án vẫn tự kiểm quyền, nên đặt
`all_members` rồi gọi API bằng tài khoản không đủ quyền vẫn bị chặn.

---

## Phụ lục: các endpoint KHÔNG tồn tại

Những đường dẫn sau từng xuất hiện ở bản tài liệu cũ nhưng **không có trong code** (đã kiểm chứng: trả 404):

| Đường dẫn cũ (sai) | Thay bằng |
|--------------------|-----------|
| `PUT /api/tasks/:id/assign` | `PUT /api/tasks/:id` với field `assignee` |
| `PUT /api/tasks/:id/status` | `PATCH /api/tasks/:id/status` |
| `GET /api/resources/:id/skills` | `GET /api/resources/:id` (skills nằm trong resource) |
| `GET /api/resources/:id/workload` | `GET /api/analytics/utilization` |
| `POST /api/optimization/run` | `POST /api/optimization/run/genetic\|csp\|hybrid` |
| `GET /api/optimization/:id/result` | `GET /api/optimization/:id` |
