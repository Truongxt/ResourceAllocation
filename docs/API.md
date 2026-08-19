# 🔌 API Documentation

> Tài liệu mô tả tất cả API endpoints của hệ thống RAO.
> Base URL: `http://localhost:5000/api`
>
> Tài liệu này đã được đối chiếu trực tiếp với mã nguồn (`server/src/routes/`, `server/src/controllers/`)
> và kiểm chứng bằng request thật. Tổng cộng **51 endpoints**.

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
`GET /departments` không phân trang.

---

## 1. Authentication (`/api/auth`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/register` | Đăng ký tài khoản | 🔓 |
| POST | `/login` | Đăng nhập | 🔓 |
| GET | `/me` | Lấy thông tin user hiện tại | 🔒 |
| PUT | `/profile` | Cập nhật profile (name, department, avatar) | 🔒 |
| PUT | `/password` | Đổi mật khẩu | 🔒 |
| GET | `/users` | Danh sách tất cả tài khoản | 👑 |

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
Trả về **token mới** sau khi đổi mật khẩu: `{ "success": true, "data": { "token": "..." } }`

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

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/stats/summary` | Thống kê task (status, priority, tổng giờ) | 🔒 |
| GET | `/` | Danh sách tasks | 🔒 |
| GET | `/:id` | Chi tiết task | 🔒 |
| POST | `/` | Tạo task | 📋 PM+ |
| PUT | `/:id` | Cập nhật task (bao gồm gán `assignee`) | 📋 PM+ hoặc người được giao¹ |
| PATCH | `/:id/status` | Đổi nhanh status (dùng cho Kanban drag & drop) | 📋 PM+ hoặc người được giao |
| DELETE | `/:id` | Xóa task | 📋 PM+ |

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
(1-5, mặc định 3) và `weight` (0-1, mặc định 1). Gửi sai tên field sẽ bị Mongoose loại bỏ âm thầm.

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

### Hành vi tự động
- Tạo/sửa/xóa task đều **tính lại `progress` của dự án** (trung bình progress các task, task `done` tính 100).
- `PUT /:id` khi đổi status sang `done` → `progress` tự set 100.
- `PATCH /:id/status`: `done` → progress 100; `todo` → progress 0.
- Không cho phép đổi `project` của task qua `PUT`.
- Xóa task sẽ gỡ nó khỏi `dependencies` của mọi task khác.
- Gán `assignee` cho người khác sẽ tạo **notification real-time** qua Socket.IO.

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
| GET | `/:id` | Chi tiết một kết quả | 🔒 |
| POST | `/:id/apply` | Áp dụng kết quả vào hệ thống | 📋 PM+ |

> Không có endpoint `POST /run` gộp — mỗi thuật toán một đường dẫn riêng.
> Chi tiết kết quả là `GET /:id`, **không phải** `GET /:id/result`.

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
