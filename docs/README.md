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
│  │  Services: socket · notification · activityLog       ││
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
│   │   ├── pages/             # 11 page components + CSS riêng
│   │   ├── context/           # AuthContext, SocketContext, ThemeContext
│   │   ├── services/          # 10 API service module (Axios)
│   │   ├── constants/         # Constants (hiện chưa được import ở đâu)
│   │   └── styles/            # index.css + antdTheme.js
│   └── vite.config.js         # Dev server port 5173 + proxy /api → :5000
├── server/                    # Backend
│   ├── server.js              # HTTP server + Socket.IO + start
│   ├── app.js                 # Express app + mount routes
│   └── src/
│       ├── algorithms/        # genetic/ + csp/
│       ├── config/            # db.js
│       ├── controllers/       # 9 controllers
│       ├── middleware/        # auth, error, validate
│       ├── models/            # 8 Mongoose models
│       ├── routes/            # 9 route files (kèm validation inline)
│       ├── services/          # socket, notification, activityLog
│       └── utils/             # seeder.js
└── docs/                      # Documentation
```

## Tài liệu liên quan

- [FEATURES.md](./FEATURES.md) - Danh sách tính năng & trạng thái
- [DATABASE.md](./DATABASE.md) - Thiết kế Database Schema
- [API.md](./API.md) - API Documentation
- [ALGORITHMS.md](./ALGORITHMS.md) - Mô tả thuật toán tối ưu hóa
- [CHANGELOG.md](./CHANGELOG.md) - Nhật ký thay đổi
- [architecture/SYSTEM_DESIGN.md](./architecture/SYSTEM_DESIGN.md) - Thiết kế kiến trúc chi tiết
