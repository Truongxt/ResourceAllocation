# 📝 Changelog - Resource Allocation Optimization

Tất cả thay đổi đáng chú ý của dự án sẽ được ghi lại tại đây.

Format: [Semantic Versioning](https://semver.org/lang/vi/)

---

## [Chưa phát hành] - 2026-08-18

### 📚 Documentation

Rà soát toàn bộ tài liệu, đối chiếu với mã nguồn và kiểm chứng bằng request thật.

#### Changed
- **API.md**: viết lại hoàn toàn — bổ sung 20 endpoint chưa từng được ghi
  (Departments, Analytics, Notifications, Activity Logs, các endpoint `stats/summary`),
  loại bỏ 6 endpoint không tồn tại, sửa format response (`data` luôn bọc dưới key có tên,
  `total` nằm ngoài `pagination`), sửa bảng phân quyền theo đúng middleware.
- **DATABASE.md**: bổ sung 3 collection thiếu (Departments, Notifications, ActivityLogs);
  sửa `Task.assignee` từ `→ Resources` thành `→ Users`; sửa enum `Task.status`
  (`review` thay vì `in_review`, thêm `blocked`); sửa `requiredSkills` (`name`/`level`/`weight`);
  sửa `dependencies` thành mảng ObjectId phẳng; cập nhật schema `OptimizationResult`
  theo đúng code; bỏ `storyPoints`/`completedAt` không tồn tại.
- **ALGORITHMS.md**: bổ sung trọng số `weight` vào công thức skill match; ghi rõ CSP chỉ
  implement H1/H2/H3 (không có ràng buộc Dependency) và H2 là ngưỡng tổng hợp ≥ 0.5;
  làm rõ bước "AC-3" thực chất là bộ lọc unary theo capacity; mô tả lại Hybrid đúng hiện
  trạng (CSP và GA chạy độc lập); cập nhật bảng metrics kèm thang đo thực tế.
- **FEATURES.md**: hạ trạng thái 11 mục chưa implement và 8 mục hoàn thành một phần;
  bổ sung Module Quản lý Phòng ban; thêm mục Backlog và bảng Lỗi đã biết;
  cập nhật thống kê từ 97.3% xuống 75.3% hoàn thành (≈80.5% nếu tính mục dở dang theo 50%).
- **SYSTEM_DESIGN.md**: bổ sung Ant Design, Socket.IO, dotenv vào tech stack; sửa cấu trúc
  thư mục client/server theo thực tế; bổ sung `CLIENT_URL` và cảnh báo `JWT_SECRET`;
  thêm sơ đồ luồng notification real-time; sửa sơ đồ luồng tối ưu hóa.
- **docs/README.md**: cập nhật sơ đồ kiến trúc (8 collection, Socket.IO, đủ các trang);
  sửa bảng phân quyền theo đúng code.

---

## [0.3.0] - 2026-08-18

### Added
- **Activity Logging**: model `ActivityLog`, `activityLog.service`, controller + routes
  (`GET /`, `GET /stats`, `DELETE /` admin-only) và trang `ActivityLogs.jsx`
- Ghi nhật ký cho các hành động: tạo/sửa/xóa dự án, tạo/sửa/đổi trạng thái/xóa task,
  áp dụng kết quả tối ưu hóa
- Ghi kèm `ipAddress`, `userAgent`, snapshot `userName`/`userEmail`

---

## [0.2.0] - 2026-08-17

### Added
- **Task Management**: controllers/routes đầy đủ cho `/api/tasks`, client service tương ứng,
  tự động tính lại `progress` của dự án
- **Optimization Engine hoàn chỉnh**
  - `GeneticAlgorithm`: tournament selection, uniform crossover, random mutation, elitism,
    dừng theo max generations / stagnation 50 / target fitness 0.95
  - `CSPSolver`: backtracking + MRV + LCV, lọc miền theo skill/availability/capacity
  - 3 endpoint `POST /api/optimization/run/{genetic,csp,hybrid}`, lịch sử, áp dụng kết quả
  - Model `OptimizationResult` lưu assignments, metrics, convergence history
- **Analytics**: 4 endpoint dashboard / utilization / tasks / optimization-comparison,
  kèm chỉ số burnout risk
- **Realtime**: Socket.IO server xác thực JWT, room `user:<id>`, model `Notification`,
  Notification Center + toast ở Header
- **Department Management**: model, 4 endpoint CRUD, ràng buộc nhân sự phải thuộc phòng ban hợp lệ
- **Frontend**: các trang Dashboard, Projects, Tasks (Kanban + List), Resources,
  Optimization, Gantt Chart, Reports, Settings; dark/light theme; nhập CSV

---

## [0.1.0] - 2026-08-04

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
  - FEATURES.md - Danh sách tính năng theo module
  - DATABASE.md - Schema design chi tiết
  - API.md - API documentation
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
