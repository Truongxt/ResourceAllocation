# 🚀 Resource Allocation Optimization

> Hệ thống quản lý luồng công việc đa dự án và tự động tối ưu hóa phân bổ nhân sự

## Giới thiệu

Web App hỗ trợ quản lý phân công công việc cho các dự án chạy song song, tích hợp thuật toán tối ưu hóa (CSP / Genetic Algorithm) để tự động cân bằng khối lượng công việc và đề xuất nhân sự phù hợp.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Algorithm | Genetic Algorithm, CSP Solver |
| Auth | JWT + bcrypt |

## Cài đặt

```bash
# Clone repository
git clone <repo-url>
cd resource-allocation-optimization

# Cài đặt tất cả dependencies
npm run install:all

# Copy file env
cp .env.example .env
# Chỉnh sửa .env theo môi trường của bạn

# Chạy development
npm run dev
```

## Scripts

| Command | Mô tả |
|---------|-------|
| `npm run dev` | Chạy cả client và server |
| `npm run dev:client` | Chỉ chạy client (port 5173) |
| `npm run dev:server` | Chỉ chạy server (port 5000) |
| `npm run build` | Build client cho production |

## Tài liệu

- [Tổng quan dự án](./docs/README.md)
- [Danh sách tính năng](./docs/FEATURES.md)
- [API Documentation](./docs/API.md)
- [Database Schema](./docs/DATABASE.md)
- [Thuật toán](./docs/ALGORITHMS.md)
- [Changelog](./docs/CHANGELOG.md)

## License

MIT
