# 📝 Changelog - Resource Allocation Optimization

Tất cả thay đổi đáng chú ý của dự án sẽ được ghi lại tại đây.

Format: [Semantic Versioning](https://semver.org/lang/vi/)

---

## [Chưa phát hành] - 2026-08-19

### Added

- **UI lịch nghỉ nhân sự** (4.6) — modal "Lịch nghỉ" ở trang Nhân sự cho thêm/xóa nhiều kỳ
  nghỉ kèm lý do; bảng hiện tag "Đang nghỉ tới…" / "Nghỉ từ…". CSP Solver đã dùng
  `unavailablePeriods` cho ràng buộc H3 từ trước nhưng không màn hình nào nhập được.
  Server chặn ngày đảo ngược, kỳ nghỉ chồng nhau, ngày sai định dạng và lý do quá dài.
- **UI thiết lập công việc tiền nhiệm** (3.7) — ô chọn nhiều trong form Task, giới hạn
  công việc cùng dự án và tự loại các lựa chọn sẽ tạo vòng lặp. Server kiểm tra lại
  toàn bộ: tự phụ thuộc, id không tồn tại, khác dự án, vòng lặp trực tiếp lẫn gián tiếp
  đều trả 400; id trùng được gộp trước khi lưu.
- **Ràng buộc H4 (Dependency) trong CSPSolver** (5.4) — hai công việc phụ thuộc nhau mà
  lịch chồng nhau không được giao cho cùng một người. Vi phạm thuần về thứ tự ngày được
  báo trong `constraintReport` thay vì làm bài toán vô nghiệm, vì thuật toán chỉ chọn
  người chứ không sinh lịch. Có bộ kiểm thử đơn vị riêng: `npm test csp` (20 assertion).
- `constraintReport.details` được lưu vào `OptimizationResult` và hiển thị trong trang
  Tối ưu hóa — trước đây chỉ lưu hai con số nên "violated: 1" không cho biết vi phạm gì.
- **Sơ đồ Gantt nâng cao** — hoàn thành 5 tính năng còn thiếu của Module 6:
  - Kéo thả đổi lịch: kéo thanh để dời cả hai đầu, kéo hai mép để đổi riêng ngày bắt đầu
    hoặc kết thúc; snap theo ngày, cập nhật lạc quan rồi hoàn tác nếu server từ chối.
    Chỉ Admin/PM thấy thao tác này, khớp với `canModifyTask` ở server.
  - Mũi tên phụ thuộc vẽ bằng SVG (đường Bézier + đầu mũi tên). Phụ thuộc bị vi phạm —
    task sau bắt đầu trước khi task trước kết thúc — vẽ đỏ đứt nét kèm cảnh báo đếm số lượng.
  - Đường găng theo CPM đầy đủ (lượt xuôi/ngược, slack = 0), viền vàng trên thanh và
    mũi tên vàng trên chuỗi găng; phát hiện chu trình phụ thuộc và báo thay vì trả kết quả sai.
  - Gộp hàng theo dự án hoặc theo nhân sự, thu gọn được, kèm dải tổng hợp thời gian và
    % tiến độ trung bình của nhóm.
  - Mốc (milestone): task có thời lượng 0 vẽ thành hình thoi, viền màu theo mức ưu tiên.
  - Thêm chấm màu ưu tiên trên mỗi thanh và bảng chú giải đầy đủ.
- `client/src/utils/gantt.js` — tách phần logic thuần (CPM, thời lượng, nhận diện mốc)
  khỏi component để chạy và kiểm thử được bằng node.
- `client/tests/gantt.test.mjs` + script `npm test` cho client — 24 assertion phủ CPM
  (chuỗi tuần tự, nhánh song song có slack, chu trình, dependency trỏ ra ngoài tập, mốc).
- `PRIORITY_COLORS` trong `client/src/constants` — mã màu thật cho những chỗ vẽ trực tiếp.
- 3 assertion end-to-end cho đúng payload mà thao tác kéo thả gửi lên
  (PM đổi lịch → 200, Member đổi lịch → 403, ngày sai định dạng → 400).
- **Trang chi tiết dự án** `ProjectDetail.jsx` (route `/projects/:id`) — 4 thẻ thống kê,
  3 tab (Tổng quan / Công việc / Thành viên) và UI thêm–sửa–gỡ thành viên kèm `%` phân bổ.
- **Bộ kiểm thử end-to-end** `server/tests/` — 158 assertion qua API thật và Socket.IO,
  chạy trên database và cổng riêng nên không đụng dữ liệu dev (`cd server && npm test`).
- `server/src/algorithms/scoring.js` — hàm tính fitness/metrics dùng chung cho GA và CSP.
- `server/src/config/jwt.js` — nguồn duy nhất cho JWT secret và thời hạn token.
- `server/src/middleware/taskAccess.js` — phân quyền theo bản ghi cho công việc.

### Changed

- **Siết phân quyền công việc và ma trận kỹ năng**: `POST /tasks`, `DELETE /tasks/:id` và
  `PUT /resources/:id/skills` giới hạn Admin/PM. `PUT /tasks/:id` và `PATCH /tasks/:id/status`
  cho phép thêm người được giao việc, nhưng chỉ ba trường `status`, `progress`, `actualHours` —
  gửi kèm trường khác bị chặn 403 kèm tên trường bị từ chối. Giao diện ẩn/vô hiệu hóa
  đúng các thao tác tương ứng.
- CSP dùng chung thang điểm với GA nên kết quả có đủ `fitness` và `metrics` để so sánh.
- `GET /api/analytics/optimization-comparison/:id` trả thêm `metrics.before/after` và mảng
  `resources[]` ghép theo resource ID; số liệu "trước" tính từ task đang mở thay vì
  `Resource.currentWorkload` có thể đã cũ.

### Fixed

- `Reports.jsx` đọc `summary.highBurnoutRisk` trong khi API trả `summary.highBurnout` →
  thẻ "Nguy cơ burnout cao" luôn bằng 0.
- `Tasks.jsx` gửi `requiredSkills[].minLevel` không có trong schema → `level` luôn bị đặt
  về mặc định 3, làm sai đầu vào của thuật toán.
- Cột "Độ khớp kỹ năng" trong `Optimization.jsx` đọc `skillMatchScore` thay vì `skillMatch`
  nên luôn hiện giá trị dự phòng 85%.
- Tab "So sánh Trước/Sau" đọc cấu trúc dữ liệu mà API không hề trả về nên luôn rỗng.
- JWT secret dự phòng ở nơi ký token và nơi xác thực khác nhau → nếu quên đặt `JWT_SECRET`
  thì đăng nhập được nhưng mọi request sau đó đều 401.
- `utils/seeder.js` đọc `MONGO_URI` (thiếu `DB`) và không nạp `.env` ở thư mục gốc nên
  luôn seed vào database mặc định.
- `client/src/constants/index.js` đã lạc hậu và không được import ở đâu; nay khớp enum của
  server và được dùng ở 4 trang.

### 📚 Documentation

Rà soát toàn bộ tài liệu, đối chiếu với mã nguồn và kiểm chứng bằng request thật.

#### Changed
- **FEATURES.md**: Module 4 và 6 lên đủ, 3.7 và 5.4 lên ✅; thống kê tổng từ 81.8% lên
  **92.2%** (≈94.2% nếu tính mục dở dang theo 50%); rút gọn backlog còn 6 hạng mục.
- **ALGORITHMS.md**: bổ sung H4 vào bảng ràng buộc cứng và giải thích vì sao phải phát biểu
  lại nó (biến quyết định là "giao cho ai", không phải "làm khi nào"); cập nhật pseudo-code
  của `solve()`.
- **API.md** và **DATABASE.md**: bảng lỗi kiểm tra `dependencies`, và cấu trúc
  `constraintReport.details` mới.
- **SYSTEM_DESIGN.md** và **docs/README.md**: bổ sung `client/src/utils/` và `client/tests/`;
  bỏ ghi chú "constants là dead code" (nay đã được dùng ở 4 trang) và ghi chú seeder đọc sai
  biến môi trường (đã sửa từ đợt trước).
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
