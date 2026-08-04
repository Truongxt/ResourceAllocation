# 🗄️ Database Schema Design

> Tài liệu mô tả chi tiết schema MongoDB cho hệ thống RAO.

## Tổng quan Collections

```
┌──────────┐     ┌───────────┐     ┌──────────┐
│  Users   │────▶│  Projects │────▶│  Tasks   │
└──────────┘     └───────────┘     └──────────┘
     │                │                  │
     ▼                │                  ▼
┌──────────┐          │           ┌─────────────┐
│Resources │◀─────────┘           │Optimization │
└──────────┘                      │  Results    │
                                  └─────────────┘
```

---

## 1. Users Collection

Lưu trữ thông tin tài khoản người dùng.

```javascript
{
  _id: ObjectId,
  name: String,            // Tên đầy đủ (required)
  email: String,           // Email (unique, required)
  password: String,        // Hashed password (select: false)
  role: String,            // 'admin' | 'project_manager' | 'member'
  avatar: String,          // URL avatar
  department: String,      // Bộ phận
  isActive: Boolean,       // Trạng thái tài khoản
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: `email` (unique)

---

## 2. Projects Collection

Lưu trữ thông tin dự án.

```javascript
{
  _id: ObjectId,
  name: String,              // Tên dự án (required)
  description: String,       // Mô tả
  code: String,              // Mã dự án (unique, e.g. "PRJ-001")
  status: String,            // 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
  priority: String,          // 'low' | 'medium' | 'high' | 'critical'
  startDate: Date,           // Ngày bắt đầu (required)
  endDate: Date,             // Ngày kết thúc (required)
  budget: Number,            // Ngân sách
  progress: Number,          // 0-100 %
  manager: ObjectId → Users, // Project Manager
  members: [                 // Danh sách thành viên
    {
      user: ObjectId → Users,
      role: String,          // 'lead' | 'developer' | 'designer' | 'tester' | 'devops'
      allocation: Number,   // % FTE allocation (0-100)
      joinedAt: Date
    }
  ],
  tags: [String],
  createdBy: ObjectId → Users,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: `status`, `manager`, `(startDate, endDate)`

---

## 3. Tasks Collection

Lưu trữ công việc trong dự án.

```javascript
{
  _id: ObjectId,
  title: String,               // Tên task (required)
  description: String,         // Mô tả chi tiết
  project: ObjectId → Projects, // Dự án (required)
  status: String,              // 'todo' | 'in_progress' | 'in_review' | 'done'
  priority: String,            // 'low' | 'medium' | 'high' | 'critical'
  startDate: Date,
  endDate: Date,
  estimatedHours: Number,      // Giờ ước tính
  actualHours: Number,         // Giờ thực tế
  assignee: ObjectId → Resources, // Nhân sự được gán
  requiredSkills: [            // Kỹ năng yêu cầu
    {
      skill: String,           // Tên skill (e.g. "React")
      level: Number            // 1=Beginner, 2=Intermediate, 3=Advanced, 4=Expert
    }
  ],
  dependencies: [              // Task dependencies
    {
      task: ObjectId → Tasks,
      type: String             // 'finish_to_start' | 'start_to_start' | etc.
    }
  ],
  storyPoints: Number,
  progress: Number,            // 0-100 %
  completedAt: Date,
  createdBy: ObjectId → Users,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: `(project, status)`, `assignee`, `(startDate, endDate)`

---

## 4. Resources Collection

Lưu trữ thông tin nhân sự kèm Skill Matrix.

```javascript
{
  _id: ObjectId,
  user: ObjectId → Users,     // Liên kết User account (required)
  employeeId: String,         // Mã nhân viên (unique)
  position: String,           // Vị trí (required)
  department: String,         // Bộ phận
  skills: [                   // Skill Matrix
    {
      name: String,           // Tên skill (required)
      level: Number,          // 1-4 (required)
      yearsOfExperience: Number
    }
  ],
  maxCapacity: Number,        // Max hours/week (default: 40)
  fte: Number,                // 0.0 - 1.0 (default: 1.0)
  currentWorkload: Number,    // Current hours/week
  hourlyRate: Number,         // Chi phí/giờ
  availability: String,       // 'available' | 'partially_available' | 'unavailable'
  unavailablePeriods: [
    {
      startDate: Date,
      endDate: Date,
      reason: String
    }
  ],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Virtuals**: `utilizationRate`, `isOverloaded`  
**Indexes**: `(skills.name, skills.level)`, `availability`, `department`

---

## 5. OptimizationResult Collection (Sẽ thêm sau)

```javascript
{
  _id: ObjectId,
  name: String,                 // Tên lần chạy
  algorithm: String,            // 'genetic' | 'csp' | 'hybrid'
  parameters: {                 // Tham số thuật toán
    populationSize: Number,
    maxGenerations: Number,
    crossoverRate: Number,
    mutationRate: Number,
    // ...
  },
  assignments: [                // Kết quả phân bổ
    {
      task: ObjectId → Tasks,
      resource: ObjectId → Resources,
      score: Number              // Fitness score cho assignment này
    }
  ],
  metrics: {
    totalFitness: Number,
    workloadVariance: Number,
    averageSkillMatch: Number,
    totalCost: Number,
    overallocatedCount: Number,
    executionTimeMs: Number
  },
  convergenceHistory: [Number], // Fitness qua các generation
  status: String,               // 'running' | 'completed' | 'applied' | 'rejected'
  runBy: ObjectId → Users,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Relationship Diagram

```
Users (1) ──── (1) Resources        # Mỗi user có 1 resource profile
Users (1) ──── (N) Projects         # User là manager của nhiều projects
Projects (1) ── (N) Tasks           # Project có nhiều tasks
Resources (1) ─ (N) Tasks           # Resource được assign nhiều tasks
Tasks (N) ──── (N) Tasks            # Task dependencies (self-referencing)
```
