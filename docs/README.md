# 📋 Resource Allocation Optimization - Tài liệu Dự án

## Giới thiệu

Hệ thống **Resource Allocation Optimization (RAO)** là Web Application hỗ trợ quản lý phân công công việc cho các dự án chạy song song, tích hợp thuật toán tối ưu hóa (Constraint Satisfaction Problem / Genetic Algorithm) để:

- Tự động cân bằng khối lượng công việc (Workload Balancing)
- Đề xuất nhân sự phù hợp dựa trên kỹ năng (Skill Matrix) và thời gian rảnh
- Giảm thiểu burnout và xung đột nguồn lực giữa các dự án

## Đối tượng sử dụng

| Vai trò | Mô tả | Quyền riêng (thực tế trong code) |
|---------|-------|----------------------------------|
| **Admin** | Quản trị hệ thống | Toàn quyền. Riêng: xem danh sách tài khoản, xóa nhân sự, xóa phòng ban, tính lại workload, xóa nhật ký hoạt động |
| **Project Manager** | Quản lý dự án | Tạo/sửa/xóa dự án, quản lý thành viên dự án, thêm/sửa nhân sự, tạo/sửa phòng ban, áp dụng kết quả tối ưu hóa |
| **Member** | Thành viên dự án | Xem toàn bộ dữ liệu, chạy tối ưu hóa, và cập nhật `status`/`progress`/`actualHours` của **task được giao cho mình** |

Member không tạo/xóa được task, không sửa được task của người khác, và không sửa được
skill matrix. Chi tiết từng endpoint: xem [API.md](./API.md).

## Kiến trúc hệ thống

```
┌──────────────────────────────────────────────────────────┐
│           Client (React 18 + Vite + Ant Design)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │Dashboard │ │ Projects │ │  Tasks   │ │  Resources  │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │  Gantt   │ │ Reports  │ │Optimize  │ │  Settings   │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────────┘ │
│  ┌──────────────┐ ┌───────────────────────────────────┐ │
│  │ActivityLogs  │ │ Login / Register                  │ │
│  └──────────────┘ └───────────────────────────────────┘ │
└──────────┬──────────────────────────────┬───────────────┘
           │ REST API (Axios + JWT)       │ WebSocket
┌──────────┴──────────────────────────────┴───────────────┐
│              Server (Node.js + Express + Socket.IO)       │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐ │
│  │  Routes  │ │   Auth   │ │      Controllers         │ │
│  │ (9 nhóm) │ │  (JWT)   │ │                          │ │
│  └──────────┘ └──────────┘ └──────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐│
│  │              Algorithm Engine                         ││
│  │  ┌──────────────────┐  ┌──────────────────────────┐  ││
│  │  │ Genetic Algorithm│  │      CSP Solver          │  ││
│  │  └──────────────────┘  └──────────────────────────┘  ││
│  └──────────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────┐│
│  │  Services: socket · email · activityLog              ││
│  └──────────────────────────────────────────────────────┘│
└─────────────────────┬───────────────────────────────────┘
                      │ Mongoose ODM
┌─────────────────────┴───────────────────────────────────┐
│                    MongoDB Database                       │
│  ┌────────┐ ┌──────────┐ ┌──────┐ ┌──────────────────┐  │
│  │ Users  │ │ Projects │ │Tasks │ │    Resources     │  │
│  └────────┘ └──────────┘ └──────┘ └──────────────────┘  │
│  ┌────────────┐ ┌───────────────┐ ┌──────────────────┐  │
│  │Departments │ │ Notifications │ │  ActivityLogs    │  │
│  └────────────┘ └───────────────┘ └──────────────────┘  │
│  ┌──────────────────────────────────────────────────┐   │
│  │            OptimizationResults                    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Cấu trúc thư mục

```
ResourceAllocation/
├── client/                    # Frontend
│   ├── src/
│   │   ├── components/        # common/ (ProtectedRoute), layout/ (Sidebar, Header)
│   │   ├── pages/             # 12 page components + CSS riêng
│   │   ├── context/           # AuthContext, SocketContext, ThemeContext
│   │   ├── services/          # 10 API service module (Axios)
│   │   ├── constants/         # Enum dùng chung, khớp schema Mongoose
│   │   ├── utils/             # gantt.js — logic thuần (CPM, thời lượng, mốc)
│   │   └── styles/            # index.css + antdTheme.js
│   ├── tests/                 # Kiểm thử logic thuần chạy bằng node (npm test)
│   └── vite.config.js         # Dev server port 5173 + proxy /api → :5000
├── server/                    # Backend
│   ├── server.js              # HTTP server + Socket.IO + start
│   ├── app.js                 # Express app + mount routes
│   └── src/
│       ├── algorithms/        # genetic/ + csp/
│       ├── config/            # db.js, jwt.js, mail.js
│       ├── controllers/       # 9 controllers
│       ├── middleware/        # auth, error, validate, rateLimit, sanitize
│       ├── models/            # 9 Mongoose models
│       ├── routes/            # 9 route files (kèm validation inline)
│       ├── services/          # socket, email, activityLog
│       └── utils/             # seeder.js
├── server/tests/              # Kiểm thử end-to-end qua API + Socket.IO (npm test)
└── docs/                      # Documentation
```

## Tài liệu liên quan

- [FEATURES.md](./FEATURES.md) - Danh sách tính năng & trạng thái
- [COMPARISON_JIRA.md](./COMPARISON_JIRA.md) - So sánh năng lực với Jira Software Cloud
- [DATABASE.md](./DATABASE.md) - Thiết kế Database Schema
- [API.md](./API.md) - API Documentation
- [ALGORITHMS.md](./ALGORITHMS.md) - Mô tả thuật toán tối ưu hóa
- [CHANGELOG.md](./CHANGELOG.md) - Nhật ký thay đổi
- [architecture/SYSTEM_DESIGN.md](./architecture/SYSTEM_DESIGN.md) - Thiết kế kiến trúc chi tiết
