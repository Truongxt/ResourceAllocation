# 📋 Resource Allocation Optimization - Tài liệu Dự án

## Giới thiệu

Hệ thống **Resource Allocation Optimization (RAO)** là Web Application hỗ trợ quản lý phân công công việc cho các dự án chạy song song, tích hợp thuật toán tối ưu hóa (Constraint Satisfaction Problem / Genetic Algorithm) để:

- Tự động cân bằng khối lượng công việc (Workload Balancing)
- Đề xuất nhân sự phù hợp dựa trên kỹ năng (Skill Matrix) và thời gian rảnh
- Giảm thiểu burnout và xung đột nguồn lực giữa các dự án

## Đối tượng sử dụng

| Vai trò | Mô tả | Quyền hạn |
|---------|-------|-----------|
| **Admin** | Quản trị hệ thống | Full access |
| **Project Manager** | Quản lý dự án | Quản lý dự án, task, xem báo cáo, chạy tối ưu hóa |
| **Member** | Thành viên dự án | Xem task được gán, cập nhật tiến độ |

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                     Client (React + Vite)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │Dashboard │ │ Projects │ │  Tasks   │ │ Resources  │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐ │
│  │  Gantt   │ │ Reports  │ │    Optimization UI       │ │
│  └──────────┘ └──────────┘ └──────────────────────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API (Axios)
┌─────────────────────┴───────────────────────────────────┐
│                 Server (Node.js + Express)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐ │
│  │  Routes  │ │  Auth    │ │     Controllers          │ │
│  └──────────┘ └──────────┘ └──────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              Algorithm Engine                        │ │
│  │  ┌──────────────────┐  ┌──────────────────────────┐ │ │
│  │  │ Genetic Algorithm│  │      CSP Solver          │ │ │
│  │  └──────────────────┘  └──────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │ Mongoose ODM
┌─────────────────────┴───────────────────────────────────┐
│                    MongoDB Database                       │
│  ┌────────┐ ┌──────────┐ ┌──────┐ ┌──────────────────┐  │
│  │ Users  │ │ Projects │ │Tasks │ │    Resources     │  │
│  └────────┘ └──────────┘ └──────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Cấu trúc thư mục

```
ResourceAllocation/
├── client/                    # Frontend
│   ├── src/
│   │   ├── components/        # UI Components
│   │   ├── pages/             # Page Components
│   │   ├── context/           # React Context
│   │   ├── services/          # API Services
│   │   ├── constants/         # Constants
│   │   └── styles/            # CSS
│   └── ...
├── server/                    # Backend
│   ├── src/
│   │   ├── algorithms/        # GA + CSP
│   │   ├── config/            # DB Config
│   │   ├── controllers/       # Route Handlers
│   │   ├── middleware/        # Auth, Error
│   │   ├── models/            # Mongoose Models
│   │   ├── routes/            # API Routes
│   │   └── services/          # Business Logic
│   └── ...
└── docs/                      # Documentation
```

## Tài liệu liên quan

- [FEATURES.md](./FEATURES.md) - Danh sách tính năng & trạng thái
- [DATABASE.md](./DATABASE.md) - Thiết kế Database Schema
- [API.md](./API.md) - API Documentation
- [ALGORITHMS.md](./ALGORITHMS.md) - Mô tả thuật toán tối ưu hóa
- [CHANGELOG.md](./CHANGELOG.md) - Nhật ký thay đổi
- [architecture/SYSTEM_DESIGN.md](./architecture/SYSTEM_DESIGN.md) - Thiết kế kiến trúc chi tiết
