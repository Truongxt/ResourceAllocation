# 🔌 API Documentation

> Tài liệu mô tả tất cả API endpoints của hệ thống RAO.
> Base URL: `http://localhost:5000/api`

## Chú thích

- 🔓 Public - Không cần authentication
- 🔒 Protected - Cần JWT token
- 👑 Admin only - Chỉ admin
- 📋 PM+ - Project Manager trở lên

---

## 1. Authentication (`/api/auth`)

| Method | Endpoint | Mô tả | Auth | Status |
|--------|----------|-------|------|--------|
| POST | `/register` | Đăng ký tài khoản | 🔓 | ⬜ TODO |
| POST | `/login` | Đăng nhập | 🔓 | ⬜ TODO |
| GET | `/me` | Lấy thông tin user hiện tại | 🔒 | ⬜ TODO |
| PUT | `/profile` | Cập nhật profile | 🔒 | ⬜ TODO |
| PUT | `/password` | Đổi mật khẩu | 🔒 | ⬜ TODO |

### POST `/api/auth/register`
```json
// Request Body
{
  "name": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "password": "password123",
  "role": "member"
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
{
  "email": "nguyenvana@example.com",
  "password": "password123"
}

// Response 200
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "...", "email": "...", "role": "member" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## 2. Projects (`/api/projects`)

| Method | Endpoint | Mô tả | Auth | Status |
|--------|----------|-------|------|--------|
| GET | `/` | Danh sách dự án | 🔒 | ⬜ TODO |
| GET | `/:id` | Chi tiết dự án | 🔒 | ⬜ TODO |
| POST | `/` | Tạo dự án | 📋 PM+ | ⬜ TODO |
| PUT | `/:id` | Cập nhật dự án | 📋 PM+ | ⬜ TODO |
| DELETE | `/:id` | Xóa dự án | 👑 Admin | ⬜ TODO |
| POST | `/:id/members` | Thêm thành viên | 📋 PM+ | ⬜ TODO |
| DELETE | `/:id/members/:userId` | Xóa thành viên | 📋 PM+ | ⬜ TODO |

### POST `/api/projects`
```json
// Request Body
{
  "name": "Website Redesign",
  "description": "Thiết kế lại giao diện website",
  "code": "WRD",
  "priority": "high",
  "startDate": "2026-08-01",
  "endDate": "2026-12-31",
  "budget": 50000
}

// Response 201
{
  "success": true,
  "data": { /* project object */ }
}
```

---

## 3. Tasks (`/api/tasks`)

| Method | Endpoint | Mô tả | Auth | Status |
|--------|----------|-------|------|--------|
| GET | `/` | Danh sách tasks | 🔒 | ⬜ TODO |
| GET | `/:id` | Chi tiết task | 🔒 | ⬜ TODO |
| POST | `/` | Tạo task | 📋 PM+ | ⬜ TODO |
| PUT | `/:id` | Cập nhật task | 🔒 | ⬜ TODO |
| DELETE | `/:id` | Xóa task | 📋 PM+ | ⬜ TODO |
| PUT | `/:id/assign` | Gán nhân sự | 📋 PM+ | ⬜ TODO |
| PUT | `/:id/status` | Thay đổi status | 🔒 | ⬜ TODO |

### POST `/api/tasks`
```json
// Request Body
{
  "title": "Thiết kế UI Dashboard",
  "description": "Thiết kế giao diện trang Dashboard",
  "project": "project_id_here",
  "priority": "high",
  "startDate": "2026-08-05",
  "endDate": "2026-08-15",
  "estimatedHours": 40,
  "requiredSkills": [
    { "skill": "Figma", "level": 3 },
    { "skill": "React", "level": 2 }
  ]
}
```

---

## 4. Resources (`/api/resources`)

| Method | Endpoint | Mô tả | Auth | Status |
|--------|----------|-------|------|--------|
| GET | `/` | Danh sách nhân sự | 🔒 | ⬜ TODO |
| GET | `/:id` | Chi tiết nhân sự | 🔒 | ⬜ TODO |
| POST | `/` | Thêm nhân sự | 📋 PM+ | ⬜ TODO |
| PUT | `/:id` | Cập nhật nhân sự | 📋 PM+ | ⬜ TODO |
| DELETE | `/:id` | Xóa nhân sự | 👑 Admin | ⬜ TODO |
| GET | `/:id/skills` | Lấy skill matrix | 🔒 | ⬜ TODO |
| PUT | `/:id/skills` | Cập nhật skills | 📋 PM+ | ⬜ TODO |
| GET | `/:id/workload` | Lấy workload | 🔒 | ⬜ TODO |

---

## 5. Optimization (`/api/optimization`)

| Method | Endpoint | Mô tả | Auth | Status |
|--------|----------|-------|------|--------|
| POST | `/run` | Chạy tối ưu hóa | 📋 PM+ | ⬜ TODO |
| GET | `/history` | Lịch sử tối ưu hóa | 🔒 | ⬜ TODO |
| GET | `/:id/result` | Kết quả tối ưu hóa | 🔒 | ⬜ TODO |
| POST | `/:id/apply` | Áp dụng kết quả | 📋 PM+ | ⬜ TODO |

### POST `/api/optimization/run`
```json
// Request Body
{
  "algorithm": "genetic",
  "projectIds": ["project_id_1", "project_id_2"],
  "parameters": {
    "populationSize": 100,
    "maxGenerations": 500,
    "crossoverRate": 0.8,
    "mutationRate": 0.1
  },
  "weights": {
    "workloadBalance": 0.3,
    "skillMatch": 0.35,
    "cost": 0.15,
    "overallocation": 0.2
  }
}

// Response 200
{
  "success": true,
  "data": {
    "resultId": "...",
    "assignments": [...],
    "metrics": {
      "totalFitness": 0.87,
      "workloadVariance": 2.3,
      "averageSkillMatch": 0.92,
      "executionTimeMs": 1500
    }
  }
}
```

---

## 6. Health Check

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/health` | Kiểm tra server status | 🔓 |

---

## Error Response Format

```json
{
  "success": false,
  "message": "Mô tả lỗi",
  "stack": "... (chỉ hiển thị ở development mode)"
}
```

## Pagination

Các endpoints trả về danh sách hỗ trợ pagination:

```
GET /api/projects?page=1&limit=10&sort=-createdAt
```

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```
