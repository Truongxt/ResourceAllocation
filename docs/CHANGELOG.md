# 📝 Changelog - Resource Allocation Optimization

Tất cả thay đổi đáng chú ý của dự án sẽ được ghi lại tại đây.

Format: [Semantic Versioning](https://semver.org/lang/vi/)

---

## [0.1.0] - 2026-08-02

### 🎉 Khởi tạo dự án

#### Added
- **Project Structure**: Khởi tạo cấu trúc monorepo (client + server + docs)
- **Client**: React 18 + Vite setup với design system (dark theme)
  - Layout components: Sidebar, Header
  - Placeholder pages: Dashboard, Projects, Tasks, Resources, Optimization, Gantt, Reports
  - Auth context, API service (Axios), Constants
  - CSS Design System với variables, components, animations
- **Server**: Node.js + Express setup
  - MongoDB connection (Mongoose)
  - Models: User, Project, Task, Resource
  - Routes placeholder: Auth, Projects, Tasks, Resources, Optimization
  - Middleware: JWT Auth, Error handling
  - Algorithm skeleton: Genetic Algorithm, CSP Solver
- **Documentation**:
  - README.md - Tổng quan dự án
  - FEATURES.md - 73 tính năng across 9 modules
  - DATABASE.md - Schema design chi tiết
  - API.md - API documentation đầy đủ
  - ALGORITHMS.md - Mô tả thuật toán GA + CSP
  - SYSTEM_DESIGN.md - Kiến trúc hệ thống

---

<!-- Template cho entry mới:

## [x.y.z] - YYYY-MM-DD

### Added (Tính năng mới)
### Changed (Thay đổi)
### Fixed (Sửa lỗi)
### Removed (Xóa bỏ)

-->
