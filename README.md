# 🚀 Resource Allocation Optimization

> Hệ thống quản lý luồng công việc đa dự án và tự động tối ưu hóa phân bổ nhân sự

## Giới thiệu

Web App hỗ trợ quản lý phân công công việc cho các dự án chạy song song, tích hợp thuật toán tối ưu hóa (CSP / Genetic Algorithm) để tự động cân bằng khối lượng công việc và đề xuất nhân sự phù hợp.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5 |
| UI Library | Ant Design 6 + @ant-design/icons |
| Backend | Node.js + Express 4 |
| Database | MongoDB 7 + Mongoose 8 |
| Realtime | Socket.IO 4 (server + client) |
| Algorithm | Genetic Algorithm, CSP Solver |
| Auth | JWT + bcryptjs |

## Cài đặt

```bash
# Clone repository
git clone <repo-url>
cd resource-allocation-optimization

# Cài đặt tất cả dependencies
npm run install:all

# Copy file env
cp .env.example .env
# Chỉnh sửa .env theo môi trường của bạn — BẮT BUỘC đặt JWT_SECRET

# Tạo dữ liệu mẫu (cần MongoDB đang chạy)
npm run seed --prefix server

# Chạy development
npm run dev
```

Yêu cầu: **Node.js ≥ 18** và **MongoDB** đang chạy ở `localhost:27017`.

> `JWT_SECRET` bỏ trống ở môi trường dev thì hệ thống vẫn chạy (ghi cảnh báo và dùng khóa tạm),
> nhưng với `NODE_ENV=production` server sẽ **từ chối khởi động**. Hãy đặt giá trị thật trước khi triển khai.

### Tài khoản mẫu sau khi seed

| Email | Mật khẩu | Role |
|-------|----------|------|
| `admin@rao.com` | `password123` | admin |
| `pm@rao.com` | `password123` | project_manager |
| `nam.tran@rao.com` | `password123` | member |

## Scripts

| Command | Vị trí | Mô tả |
|---------|--------|-------|
| `npm run install:all` | gốc | Cài dependencies cho cả 3 package |
| `npm run dev` | gốc | Chạy cả client và server |
| `npm run dev:client` | gốc | Chỉ chạy client (port 5173) |
| `npm run dev:server` | gốc | Chỉ chạy server (port 5000) |
| `npm run build` | gốc | Build client cho production |
| `npm start` | `server/` | Chạy server không auto-reload |
| `npm run seed` | `server/` | Tạo dữ liệu mẫu (xóa sạch cả 8 collection trước) |
| `npm run cleanup` | `server/` | Liệt kê dữ liệu mồ côi trong DB đang chạy; thêm `-- --apply` để xóa thật |
| `npm run migrate:skill-level` | `server/` | Hạ `requiredSkills.level` cũ từ 5 về 4; thêm `-- --apply` để sửa thật |
| `npm test` | `server/` | Chạy kiểm thử end-to-end trên DB + cổng riêng ([chi tiết](./server/tests/README.md)) |
| `npm test` | `client/` | Logic thuần bằng node + kiểm thử render component bằng vitest ([chi tiết](./client/tests/README.md)) |
| `npm run preview` | `client/` | Xem thử bản build production |

## Tài liệu

- [Tổng quan dự án](./docs/README.md)
- [Danh sách tính năng](./docs/FEATURES.md)
- [So sánh với Jira](./docs/COMPARISON_JIRA.md) — RAO mạnh/yếu ở đâu so với Jira Software Cloud
- [API Documentation](./docs/API.md) — 53 endpoints
- [Database Schema](./docs/DATABASE.md) — 8 collections
- [Thuật toán](./docs/ALGORITHMS.md)
- [Thiết kế hệ thống](./docs/architecture/SYSTEM_DESIGN.md)
- [Changelog](./docs/CHANGELOG.md)

## License

MIT
