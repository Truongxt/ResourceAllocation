# 🗄️ Database Schema Design

> Tài liệu mô tả chi tiết schema MongoDB cho hệ thống RAO.
> Đối chiếu trực tiếp với `server/src/models/` — **9 collections**.

## Tổng quan Collections

```
┌──────────┐     ┌───────────┐     ┌──────────┐
│  Users   │────▶│  Projects │────▶│  Tasks   │
└────┬─────┘     └───────────┘     └────┬─────┘
     │                                  │
     │  ┌──────────┐   ┌────────────┐   │
     ├─▶│Resources │──▶│ Departments│   │  (Resource.department = Department.name)
     │  └──────────┘   └────────────┘   │
     │                                  ▼
     │  ┌───────────────┐        ┌─────────────┐
     ├─▶│ Notifications │        │Optimization │
     │  └───────────────┘        │  Results    │
     │  ┌───────────────┐        └─────────────┘
     └─▶│ ActivityLogs  │
        └───────────────┘
```

---

## 1. Users Collection

Lưu trữ thông tin tài khoản người dùng.

```javascript
{
  _id: ObjectId,
  name: String,            // Tên đầy đủ (required, max 100)
  email: String,           // Email (unique, required, lowercase)
  password: String,        // Hashed bcrypt salt 12 (select: false)
  role: String,            // 'admin' | 'project_manager' | 'member' (default: 'member')
  avatar: String,          // URL avatar (default: null)
  department: String,      // Bộ phận
  isActive: Boolean,       // Trạng thái tài khoản (default: true)
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: `email` (unique)
**Methods**: `comparePassword(candidate)`, `toJSON()` (loại bỏ `password`)
**Hooks**: `pre('save')` tự hash password khi field thay đổi

---

## 1b. RefreshTokens Collection

Phiên đăng nhập **thu hồi được**, đối lập với access token (JWT) không thu hồi được.

```javascript
{
  _id: ObjectId,
  user: ObjectId → Users,   // required
  tokenHash: String,        // SHA-256 của token thật (unique) — KHÔNG lưu giá trị gốc
  family: String,           // Gom cả chuỗi xoay vòng của một lần đăng nhập
  expiresAt: Date,          // required
  revokedAt: Date,          // null nếu còn hiệu lực
  revokedReason: String,    // rotated | logout | logout_all | password_changed | reuse_detected
  replacedBy: String,       // tokenHash của token kế tiếp trong chuỗi
  userAgent: String,
  ipAddress: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: `user`, `tokenHash` (unique), `family`, `expiresAt` (TTL — MongoDB tự xóa bản ghi
hết hạn, không cần cron)
**Virtuals**: `isActive` = chưa thu hồi và chưa hết hạn

Ba điểm thiết kế:

- **Chỉ lưu bản băm.** Giá trị thật chỉ tồn tại trong cookie của người dùng, giống cách lưu
  mật khẩu. Lộ database cũng không ai có token dùng được.
- **`replacedBy` nối thành chuỗi.** Mỗi lần làm mới sinh token mới và thu hồi token cũ với
  `revokedReason: 'rotated'`. Nhờ vậy phân biệt được "token đã xoay vòng bị trình lại"
  (dấu hiệu bị đánh cắp) với "token đã đăng xuất" (người dùng tự bấm).
- **`family` để thu hồi cả họ.** Phát hiện tái sử dụng thì thu hồi toàn bộ chuỗi chứ không
  riêng token đó, vì lúc ấy không phân biệt được ai là chủ thật.

---

## 2. Projects Collection

```javascript
{
  _id: ObjectId,
  name: String,              // Tên dự án (required, max 200)
  description: String,       // Mô tả (max 2000)
  code: String,              // Mã dự án (unique sparse, uppercase, max 10)
  status: String,            // 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
  priority: String,          // 'low' | 'medium' | 'high' | 'critical'
  startDate: Date,           // required
  endDate: Date,             // required
  budget: Number,            // default 0
  progress: Number,          // 0-100, tự tính lại từ tasks
  manager: ObjectId → Users, // REQUIRED — mặc định là user tạo dự án
  members: [
    {
      user: ObjectId → Users,
      role: String,          // 'lead' | 'developer' | 'designer' | 'tester' | 'devops'
      allocation: Number,    // % FTE (0-100, default 100)
      joinedAt: Date
    }
  ],
  tags: [String],
  createdBy: ObjectId → Users,
  createdAt: Date,
  updatedAt: Date
}
```

**Virtuals**: `tasks` (populate ngược từ `Task.project`)
**Indexes**: `status`, `manager`, `(startDate, endDate)`

---

## 3. Tasks Collection

```javascript
{
  _id: ObjectId,
  title: String,               // required, max 300
  description: String,         // max 5000
  project: ObjectId → Projects, // required
  status: String,              // 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
  priority: String,            // 'low' | 'medium' | 'high' | 'critical'
  startDate: Date,
  endDate: Date,
  estimatedHours: Number,      // default 0
  actualHours: Number,         // default 0
  progress: Number,            // 0-100, default 0
  assignee: ObjectId → Users,  // ⚠️ Tham chiếu USERS, không phải Resources
  requiredSkills: [
    {
      name: String,            // Tên skill — field là `name`, KHÔNG phải `skill`
      level: Number,           // 1-4, default 3 — cùng thang với Resource.skills[].level
      weight: Number           // 0-1, default 1 — trọng số dùng trong công thức skill match
    }
  ],
  dependencies: [ObjectId → Tasks],  // Mảng ObjectId PHẲNG, không có field `type`
  createdBy: ObjectId → Users,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: `(project, status)`, `assignee`, `(startDate, endDate)`

### Ghi chú quan trọng

- **`assignee` trỏ tới `Users`**, không phải `Resources`. Khi áp dụng kết quả tối ưu hóa,
  hệ thống lấy `resource.user` để ghi vào `assignee`. Muốn tìm task của một Resource,
  phải query theo `assignee: resource.user`.
- **`status` có 5 giá trị**, gồm cả `review` (không phải `in_review`) và `blocked`.
- **`requiredSkills.level` dùng chung thang 1-4 với `Resource.skills.level`.** Trước đây
  field này nhận tới 5, khiến yêu cầu mức 5 vĩnh viễn không ai khớp tuyệt đối (tối đa
  `min(4,5)/5 = 0.8`). Bản ghi cũ còn mức 5 dọn bằng `npm run migrate:skill-level`.
- Không có field `storyPoints` và `completedAt`.

---

## 4. Resources Collection

Lưu trữ thông tin nhân sự kèm Skill Matrix.

```javascript
{
  _id: ObjectId,
  user: ObjectId → Users,     // required — mỗi User tối đa 1 Resource
  employeeId: String,         // unique sparse — HỆ THỐNG TỰ SINH: NV0001, NV0002...
  position: String,           // required
  department: String,         // Tên phòng ban — phải khớp Department.name đang isActive
  skills: [
    {
      name: String,           // required
      level: Number,          // enum [1,2,3,4] — 1=Beginner ... 4=Expert (required)
      yearsOfExperience: Number // default 0
    }
  ],
  maxCapacity: Number,        // Max hours/week (default 40)
  fte: Number,                // 0.0 - 1.0 (default 1.0)
  currentWorkload: Number,    // Current hours/week (default 0)
  hourlyRate: Number,         // Chi phí/giờ (default 0)
  availability: String,       // 'available' | 'partially_available' | 'unavailable'
  unavailablePeriods: [
    { startDate: Date, endDate: Date, reason: String }
  ],
  isActive: Boolean,          // default true
  createdAt: Date,
  updatedAt: Date
}
```

**Virtuals**: `utilizationRate` = `currentWorkload / (maxCapacity × fte) × 100`, `isOverloaded`
**Indexes**: `(skills.name, skills.level)`, `availability`, `department`

---

## 5. Departments Collection

```javascript
{
  _id: ObjectId,
  name: String,          // required, unique, max 120
  code: String,          // unique sparse, uppercase, max 12
  description: String,   // max 1000
  managerName: String,   // max 100 — chỉ là chuỗi tên, KHÔNG phải ref tới Users
  isActive: Boolean,     // default true
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: `(isActive, name)`

Liên kết với Resources bằng **tên phòng ban** (`Resource.department === Department.name`),
không dùng ObjectId. Không thể xóa phòng ban còn nhân sự `isActive`.

---

## 6. OptimizationResult Collection

```javascript
{
  _id: ObjectId,
  algorithm: String,            // 'genetic' | 'csp' | 'hybrid' (required)
  status: String,               // 'running' | 'completed' | 'failed'
  parameters: {
    populationSize: Number,
    maxGenerations: Number,
    crossoverRate: Number,
    mutationRate: Number,
    weights: { workloadBalance, skillMatch, cost, overallocation }
  },
  projectFilter: ObjectId → Projects,  // null = chạy toàn hệ thống
  taskCount: Number,
  resourceCount: Number,

  fitness: Number,              // Điểm fitness tổng — ở CẤP GỐC
  assignments: [
    {
      task: ObjectId → Tasks,
      taskTitle: String,
      resource: ObjectId → Resources,
      resourceName: String,
      skillMatch: Number,       // 0-100 (%)
      estimatedHours: Number
    }
  ],
  metrics: {
    workloadVariance: Number,      // thực chất là độ lệch chuẩn σ
    averageSkillMatch: Number,     // 0-100 (%)
    totalCost: Number,
    overallocatedResources: Number,
    averageUtilization: Number,
    resourceUtilization: [
      { resource: ObjectId, name, workload, capacity, utilization, isOverloaded }
    ]
  },
  convergenceHistory: [           // Mảng OBJECT, không phải mảng số
    { generation: Number, fitness: Number }
  ],
  // Chỉ Hybrid: mức thu hẹp không gian tìm kiếm mà pha CSP mang lại cho pha GA
  domainReduction: {
    restricted: Boolean,
    totalPairs: Number,     // số cặp (task × nhân sự) trước khi lọc
    feasiblePairs: Number,  // còn lại sau khi lọc
    tasksReopened: Number,  // task có miền rỗng, buộc mở lại toàn bộ nhân sự
  },
  constraintReport: {
    satisfied: Number,
    violated: Number,
    // Chi tiết từng ràng buộc; type = 'capacity' | 'dependency'
    // subject = tên nhân sự, hoặc "Việc trước → Việc sau" với ràng buộc phụ thuộc
    details: {
      satisfied: [{ type: String, subject: String, detail: String }],
      violated:  [{ type: String, subject: String, detail: String }],
    },
  },

  executionTime: Number,        // ms
  generations: Number,          // GA/Hybrid
  iterations: Number,           // CSP

  isApplied: Boolean,           // default false
  appliedAt: Date,
  appliedBy: ObjectId → Users,

  errorMessage: String,
  runBy: ObjectId → Users,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: `(algorithm, createdAt)`, `status`

Trạng thái "đã áp dụng" nằm ở cặp field `isApplied`/`appliedAt`/`appliedBy`,
**không** phải giá trị trong enum `status`.

---

## 7. Notifications Collection

```javascript
{
  _id: ObjectId,
  recipient: ObjectId → Users,  // required, indexed
  actor: ObjectId → Users,      // người gây ra hành động
  type: String,                 // 'task_assigned' | 'task_status_changed' | 'task_updated'
                                // | 'project_updated' | 'project_member_added'
                                // | 'optimization_completed' | 'optimization_applied' | 'system'
  title: String,                // required, max 160
  message: String,              // required, max 1000
  entityType: String,           // 'task' | 'project' | 'resource' | 'optimization' | 'system'
  entityId: ObjectId,
  link: String,                 // đường dẫn client điều hướng tới (default '/')
  readAt: Date,                 // null = chưa đọc (indexed)
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: `recipient`, `type`, `readAt`, `(recipient, createdAt)`

---

## 8. ActivityLogs Collection

```javascript
{
  _id: ObjectId,
  user: ObjectId → Users,       // indexed
  userName: String,             // snapshot tên (default 'Hệ thống')
  userEmail: String,            // snapshot email
  action: String,               // required, indexed — vd 'CREATE_PROJECT', 'APPLY_OPTIMIZATION'
  entityType: String,           // 'project'|'task'|'resource'|'department'|'optimization'|'auth'|'system'
  entityId: Mixed,
  entityTitle: String,
  description: String,          // required
  details: Mixed,               // payload tùy hành động
  ipAddress: String,
  userAgent: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: `user`, `action`, `entityType`, `createdAt` (giảm dần), `(entityType, action)`

`userName`/`userEmail` được lưu dạng snapshot để nhật ký vẫn đọc được sau khi user bị xóa.

---

## Relationship Diagram

```
Users (1) ──── (0..1) Resources     # Mỗi user tối đa 1 resource profile
Users (1) ──── (N) Projects         # User là manager của nhiều projects
Users (N) ──── (N) Projects         # Qua Projects.members[]
Projects (1) ─ (N) Tasks            # Project có nhiều tasks
Users (1) ──── (N) Tasks            # Task.assignee → Users (KHÔNG phải Resources)
Tasks (N) ──── (N) Tasks            # Task dependencies (self-referencing)
Departments (1) ─ (N) Resources     # Liên kết bằng TÊN, không bằng ObjectId
Users (1) ──── (N) Notifications    # recipient
Users (1) ──── (N) ActivityLogs     # user
Users (1) ──── (N) OptimizationResults  # runBy / appliedBy
```
