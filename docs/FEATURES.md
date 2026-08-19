# 📋 Danh sách Tính năng - Resource Allocation Optimization

> Tài liệu này liệt kê tất cả tính năng của hệ thống kèm trạng thái phát triển.
> Trạng thái dưới đây đã được **đối chiếu trực tiếp với mã nguồn** và kiểm chứng bằng
> request thật tới API + kiểm tra từng file UI.

## Chú thích trạng thái

| Icon | Trạng thái | Mô tả |
|------|-----------|-------|
| ⬜ | Chưa bắt đầu | Chưa implement |
| 🔨 | Đang phát triển | Có một phần (thường là backend xong, UI chưa có / còn lỗi) |
| ✅ | Hoàn thành | Đã implement & chạy được end-to-end |

---

## Module 1: Authentication & Authorization ✅

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 1.1 | Đăng ký | Form đăng ký với validation (email, password ≥ 6) | ✅ | `Register.jsx` + express-validator |
| 1.2 | Đăng nhập | JWT-based authentication | ✅ | Token lưu `localStorage.rao_token` |
| 1.3 | Đăng xuất | Clear token, redirect to login | ✅ | Dropdown ở Header |
| 1.4 | Phân quyền | Role-based: Admin, PM, Member | ✅ | `authorize` cho các thao tác theo role; `canModifyTask` cho phép người được giao tự cập nhật tiến độ task của mình |
| 1.5 | Quản lý Profile | Cập nhật thông tin cá nhân, avatar | ✅ | Trang Cài đặt (`Settings.jsx`) |
| 1.6 | Đổi mật khẩu | Thay đổi mật khẩu từ profile | ✅ | Trả token mới sau khi đổi |
| 1.7 | Protected Routes | Chặn truy cập trang khi chưa login | ✅ | `ProtectedRoute.jsx` + interceptor 401 |

Ranh giới phân quyền được kiểm chứng bằng 12 assertion trong nhóm "4b. Phân quyền công việc"
của `server/tests/api.test.mjs`.

---

## Module 2: Quản lý Dự án (Project Management) ✅

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 2.1 | Tạo dự án | Form tạo dự án (tên, mô tả, ngày, priority) | ✅ | Modal form |
| 2.2 | Danh sách dự án | Hiển thị grid/list dự án với filter, search | ✅ | Card grid + toolbar |
| 2.3 | Chi tiết dự án | Trang chi tiết với tabs (overview, tasks, members) | ✅ | Route `/projects/:id`, 3 tab + 4 thẻ thống kê; mở bằng cách bấm tên dự án ở danh sách |
| 2.4 | Cập nhật dự án | Chỉnh sửa thông tin dự án | ✅ | Modal form edit |
| 2.5 | Xóa dự án | Xóa kèm cảnh báo nếu còn task | ✅ | Chặn nếu còn task, cần `?force=true` |
| 2.6 | Dashboard dự án | Tổng quan tiến độ, thống kê | ✅ | `GET /projects/stats/summary` + trang Dashboard |
| 2.7 | Gắn nhân sự | Thêm/xóa thành viên + allocation % | ✅ | Tab Thành viên: thêm/sửa/xóa, chọn vai trò và allocation. Nút quản lý chỉ hiện với Admin/PM |
| 2.8 | Tiến độ dự án | Tự động tính % hoàn thành từ tasks | ✅ | `recalculateProjectProgress` chạy khi tạo/sửa/xóa task |
| 2.9 | Filter & Sort | Lọc theo status, priority, date range, search | ✅ | Hỗ trợ cả `manager`, `startDate`, `endDate` |

---

## Module 3: Quản lý Công việc (Task Management) ✅

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 3.1 | Tạo task | Form tạo task (title, description, dates, effort) | ✅ | Modal form |
| 3.2 | Danh sách task | Hiển thị tasks theo project hoặc tất cả | ✅ | List View + filters |
| 3.3 | Chi tiết task | Modal chi tiết với đầy đủ thông tin | ✅ | Edit modal |
| 3.4 | Cập nhật task | Chỉnh sửa thông tin task | ✅ | Modal form edit |
| 3.5 | Xóa task | Xóa task khỏi dự án | ✅ | Confirm + gỡ khỏi dependencies của task khác |
| 3.6 | Kanban Board | Drag & drop thay đổi status | ✅ | 5 cột, optimistic UI, gọi `PATCH /:id/status` |
| 3.7 | Task Dependencies | Thiết lập predecessor/successor | ✅ | Ô chọn nhiều trong form Task (chỉ Admin/PM), giới hạn công việc cùng dự án, tự loại các lựa chọn tạo vòng lặp. Server kiểm tra lại: tự phụ thuộc, id không tồn tại, khác dự án, vòng lặp trực tiếp lẫn gián tiếp đều trả 400 |
| 3.8 | Gán nhân sự | Assign resource cho task | ✅ | Chọn từ danh sách Resource, lưu `resource.user` vào `assignee` |
| 3.9 | Required Skills | Định nghĩa skills cần thiết cho task | ✅ | Nhập từng dòng: tên (gợi ý từ Skill Matrix nhân sự), mức yêu cầu Lv.1-4, trọng số 0-1. Danh sách kỹ năng kèm mức hiện luôn trên bảng công việc. Server chặn thiếu tên, level ngoài 1-5, trọng số ngoài 0-1 |
| 3.10 | Estimated Hours | Nhập giờ ước tính vs thực tế | ✅ | `estimatedHours` / `actualHours` |
| 3.11 | Thay đổi trạng thái | Cập nhật progress, status | ✅ | `PATCH /:id/status`, tự set progress 0/100 |

---

## Module 4: Quản lý Nhân sự (Resource Management) ✅

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 4.1 | Thêm nhân sự | Form thêm nhân sự (info, position, department) | ✅ | Liên kết User có sẵn hoặc tạo User mới; `employeeId` tự sinh `NV0001` |
| 4.2 | Danh sách nhân sự | Grid hiển thị với avatar, skills, workload | ✅ | Card grid + utilization bars |
| 4.3 | Chi tiết nhân sự | Profile chi tiết + assignments hiện tại | ✅ | `GET /:id` trả kèm task đang gán |
| 4.4 | Cập nhật thông tin | Chỉnh sửa thông tin nhân sự | ✅ | Edit modal |
| 4.5 | Skill Matrix | CRUD kỹ năng + level cho từng nhân sự | ✅ | Skill modal editor, level 1-4 |
| 4.6 | Availability Calendar | Lịch trình, ngày nghỉ, periods unavailable | ✅ | Modal "Lịch nghỉ" (nút lịch ở cột Hành động): thêm/xóa nhiều kỳ nghỉ kèm lý do. Bảng nhân sự hiện tag "Đang nghỉ tới…" / "Nghỉ từ…". Server chặn ngày đảo ngược, kỳ nghỉ chồng nhau, ngày sai định dạng. Chỉ Admin/PM |
| 4.7 | Capacity (FTE) | Thiết lập FTE, max hours/week | ✅ | `fte` + `maxCapacity` |
| 4.8 | Workload View | Hiển thị workload hiện tại, utilization rate | ✅ | Virtual `utilizationRate` + thanh utilization |
| 4.9 | Department Filter | Lọc nhân sự theo bộ phận | ✅ | Filter by department |
| 4.10 | Skill Search | Tìm nhân sự theo skill + level | ✅ | `?skill=&skillLevel=` (lọc `>=`) |

---

## Module 5: Thuật toán Tối ưu hóa (Optimization Engine) ✅

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 5.1 | Genetic Algorithm | Multi-objective GA cho phân bổ nhân sự | ✅ | Tournament (k=5), Uniform Crossover, Random Mutation, Elitism 5% |
| 5.2 | CSP Solver | Backtracking + AC-3 + MRV + LCV | ✅ | Node consistency (capacity) và AC-3 (trên đồ thị H4) là hai bước tách bạch. AC-3 trên ràng buộc `≠` chỉ lan truyền từ biến đã bị ép về một giá trị — giới hạn cố hữu, muốn mạnh hơn cần all-different (Régin) |
| 5.3 | Fitness Function | Workload balance + skill match + cost + overallocation | ✅ | 4 mục tiêu, trọng số cấu hình được |
| 5.4 | Constraint Validation | Kiểm tra capacity, skill, availability, dependency | ✅ | Đủ H1–H4. **H2 dùng ngưỡng tổng hợp ≥ 0.5** chứ không bắt buộc từng kỹ năng. H4 cấm giao hai việc phụ thuộc nhau, chồng lịch cho cùng một người; sai thứ tự ngày thì báo trong `constraintReport` (thuật toán không đổi được ngày) — xem [ALGORITHMS.md](./ALGORITHMS.md) mục 2.2 |
| 5.5 | Run Optimization UI | Giao diện chạy tối ưu hóa với parameters | ✅ | Chọn thuật toán, slider tham số, tinh chỉnh trọng số |
| 5.6 | Results Comparison | So sánh multiple solutions | ✅ | Tick chọn 2–4 lần chạy trong lịch sử → `GET /optimization/compare`. Bảng 9 chỉ số kèm đánh dấu bên thắng, bảng phân công ghép theo từng công việc, và cảnh báo khi các phương án chạy khác phạm vi |
| 5.7 | Apply Solution | Áp dụng kết quả vào hệ thống | ✅ | Ghi `assignee` cho từng task + notification + ActivityLog |
| 5.8 | History | Lưu lịch sử các lần chạy | ✅ | Model `OptimizationResult`, 50 bản ghi mới nhất |
| 5.9 | Convergence Chart | Biểu đồ hội tụ GA | ✅ | Bar chart, hiển thị 40 điểm cuối |
| 5.10 | Performance Benchmark | Đo thời gian chạy vs kích thước bài toán | ✅ | `executionTime` + `taskCount`/`resourceCount` |
| 5.11 | Hybrid CSP → GA | CSP lọc miền giá trị, GA tối ưu trên miền đã thu hẹp | ✅ | `buildFeasibleDomains()` đưa miền sang GA; `_initializePopulation`/`_mutate` chỉ chọn trong miền. Mức thu hẹp ghi vào `domainReduction` và hiện trên giao diện; miền rỗng được mở lại kèm cảnh báo |

> Hybrid nay chạy đúng thiết kế: pha CSP lọc miền giá trị theo H2/H3 và capacity, pha GA
> chỉ sinh và đột biến gen trong miền đó. Mức thu hẹp được ghi vào `domainReduction` và
> hiện trên giao diện. Xem [ALGORITHMS.md](./ALGORITHMS.md) mục 3.
>
> CSP dùng chung `src/algorithms/scoring.js` với GA nên có đủ `fitness` và `metrics` trên cùng thang đo.
> Các bản ghi CSP tạo trước thay đổi này vẫn còn `fitness: 0` trong DB.

---

## Module 6: Gantt Chart ✅

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 6.1 | Timeline View | Hiển thị tasks trên timeline | ✅ | Split-panel: sidebar tên task + timeline cuộn ngang |
| 6.2 | Drag & Drop | Kéo thả để thay đổi thời gian task | ✅ | Kéo thanh để dời lịch, kéo hai mép để đổi ngày bắt đầu/kết thúc; snap theo ngày, cập nhật lạc quan và hoàn tác nếu server từ chối. Chỉ Admin/PM |
| 6.3 | Dependencies | Hiển thị mũi tên dependency giữa tasks | ✅ | Lớp SVG phủ lên biểu đồ, đường Bézier + đầu mũi tên; phụ thuộc bị vi phạm (task sau bắt đầu trước khi task trước kết thúc) vẽ đỏ đứt nét kèm cảnh báo |
| 6.4 | Zoom Controls | Zoom theo Day / Week / Month | ✅ | 3 mức, `dayWidth` 40/20/8 px |
| 6.5 | Critical Path | Highlight critical path | ✅ | CPM đầy đủ (lượt xuôi/ngược, slack = 0) trong `src/utils/gantt.js`; viền vàng trên thanh + mũi tên vàng; phát hiện chu trình |
| 6.6 | Resource Lane | Gantt theo resource (ai làm gì khi nào) | ✅ | Gộp theo nhân sự hoặc theo dự án, hàng nhóm thu gọn được kèm dải tổng hợp thời gian và % tiến độ trung bình |
| 6.7 | Milestone | Hiển thị milestones | ✅ | Task có thời lượng 0 (bắt đầu = kết thúc) vẽ thành hình thoi, viền theo mức ưu tiên |
| 6.8 | Export | Xuất Gantt Chart dạng ảnh/PDF | ✅ | `window.print()` + `@media print` trong `GanttChart.css` |

Ngoài ra `GanttChart.jsx` còn có: tooltip chi tiết khi hover, lọc theo dự án, tìm kiếm,
tô màu theo status, chấm màu theo mức ưu tiên, chú giải, đánh dấu cuối tuần và ngày hôm nay.

Phần logic thuần (CPM, thời lượng, nhận diện mốc) nằm ở [client/src/utils/gantt.js](../client/src/utils/gantt.js)
để chạy được bằng node, và có bộ kiểm thử riêng: `cd client && npm test` (24 assertion).

> **Giới hạn đã biết:** CPM và mũi tên chỉ tính trên tập task đang tải (tối đa 100, có thể
> đang bị lọc theo dự án). Dependency trỏ ra ngoài tập đó bị bỏ qua chứ không báo lỗi.

---

## Module 7: Resource Histogram & Analytics ✅

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 7.1 | Resource Histogram | Biểu đồ phân bổ theo nhân sự | ✅ | Thanh histogram + vạch 100% capacity |
| 7.2 | Overallocation Alert | Phát hiện & cảnh báo quá tải | ✅ | Alert box + badge quá tải |
| 7.3 | Utilization Dashboard | Dashboard utilization từng nhân sự | ✅ | Thẻ Dashboard + tab Reports |
| 7.4 | Burnout Risk Index | Chỉ số rủi ro burnout (Thấp/TB/Cao) | ✅ | API tính `>120%` cao, `>90%` trung bình; cột trong bảng và thẻ tổng đều hiển thị đúng |
| 7.5 | Before/After Compare | So sánh trước/sau tối ưu hóa | ✅ | StdDev tải, số nhân sự quá tải, skill match, và bảng delta workload từng người |
| 7.6 | Team Analytics | Thống kê theo team/department | ✅ | Thẻ phòng ban + capacity & workload |
| 7.7 | Trend Charts | Biểu đồ xu hướng workload theo thời gian | ✅ | Tab **Xu hướng theo thời gian** trong Báo cáo: cột tải + đường năng lực, dải nhiệt từng nhân sự, gộp theo ngày/tuần, lọc theo dự án, xuất CSV. Là khối lượng **đã cam kết** suy ra từ lịch công việc, không phải nhật ký quá khứ — xem ghi chú dưới bảng |

> **7.7 trả lời câu hỏi nào.** Hệ thống không lưu ảnh chụp workload theo ngày, nên biểu đồ
> này được **suy ra** từ lịch: giờ ước tính của mỗi công việc trải đều lên các ngày làm việc
> trong khoảng của nó rồi cộng theo từng người. Nó cho biết *khối lượng đã cam kết rơi vào
> lúc nào* — đủ để thấy trước tuần nào ai sẽ quá tải — chứ **không** cho biết tháng trước ai
> đã thực sự làm bao nhiêu giờ. Muốn có số liệu lịch sử thật thì phải chụp và lưu định kỳ,
> đó là hạng mục khác. Vì là suy ra, mọi giờ công không đặt được lên trục thời gian (thiếu
> ngày, chưa giao người) đều được đếm riêng và hiện thành cảnh báo, thay vì lặng lẽ biến mất.

---

## Module 8: Báo cáo & Xuất dữ liệu ✅

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 8.1 | Báo cáo tổng hợp | Summary report phân bổ nguồn lực | ✅ | Thẻ tổng hợp + tabs |
| 8.2 | Xuất PDF | Export báo cáo dạng PDF | ✅ | `window.print()` + layout `@media print` trong `Reports.css` |
| 8.3 | Xuất Excel | Export dữ liệu dạng Excel/CSV | ✅ | CSV UTF-8 có BOM, xuất theo tab đang mở |
| 8.4 | Optimization History | Bảng lịch sử tối ưu hóa với metrics | ✅ | Trong trang Tối ưu hóa |
| 8.5 | Project Report | Báo cáo chi tiết từng dự án | ✅ | Bảng dự án + % completion |

---

## Module 9: Quản lý Phòng ban (Department Management) ✅

> Module này đã được implement đầy đủ nhưng chưa từng xuất hiện trong tài liệu trước đây.

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 9.1 | Danh sách phòng ban | Kèm số lượng nhân sự mỗi phòng | ✅ | `GET /departments` trả `resourceCount` |
| 9.2 | Tạo / sửa phòng ban | name, code, description, managerName | ✅ | Modal trong trang Nhân sự |
| 9.3 | Xóa phòng ban | Chặn nếu còn nhân sự đang hoạt động | ✅ | Trả 400 kèm hướng dẫn |
| 9.4 | Ràng buộc dữ liệu | Nhân sự bắt buộc thuộc phòng ban hợp lệ | ✅ | `validateDepartment` khi tạo/sửa Resource |

---

## Module 10: Tính năng bổ sung 🔨

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 10.1 | Real-time Notifications | Socket.IO notifications | ✅ | WebSocket có xác thực JWT, room `user:<id>`, Notification Center, Toast |
| 10.2 | Dark/Light Theme Toggle | Chuyển đổi theme Sáng/Tối | ✅ | Switch ở Header + CSS `data-theme` |
| 10.3 | Multi-language | Hỗ trợ Tiếng Việt + English | ⬜ | Optional — hiện chỉ có tiếng Việt |
| 10.4 | Import Data | Import dự án/nhân sự từ CSV | ✅ | Modal **dán nội dung CSV** (chưa hỗ trợ chọn file) trong Projects & Resources |
| 10.5 | Activity Log | Nhật ký hoạt động hệ thống | ✅ | Model + service + controller + trang ActivityLogs, lọc theo entity/action/user/thời gian |
| 10.6 | Email Notifications | Gửi email khi được assign task | ⬜ | Optional — chưa có |

---

## Thống kê tổng quan

| Module | Tổng | ✅ Hoàn thành | 🔨 Một phần | ⬜ Chưa có |
|--------|------|--------------|-------------|-----------|
| 1. Auth | 7 | 7 | 0 | 0 |
| 2. Projects | 9 | 9 | 0 | 0 |
| 3. Tasks | 11 | 11 | 0 | 0 |
| 4. Resources | 10 | 10 | 0 | 0 |
| 5. Optimization | 11 | 11 | 0 | 0 |
| 6. Gantt Chart | 8 | 8 | 0 | 0 |
| 7. Analytics | 7 | 7 | 0 | 0 |
| 8. Reports | 5 | 5 | 0 | 0 |
| 9. Departments | 4 | 4 | 0 | 0 |
| 10. Bổ sung | 6 | 4 | 0 | 2 |
| **Tổng** | **78** | **76 (97.4%)** | **0** | **2 (2.6%)** |

Hai mục còn lại đều nằm trong nhóm tùy chọn của Module 10 (đa ngôn ngữ, email).

---

## Backlog — các hạng mục còn thiếu

Sắp theo mức độ ảnh hưởng tới trải nghiệm:

1. **Ảnh chụp workload định kỳ** — 7.7 hiện suy ra chuỗi thời gian từ lịch công việc, đủ để
   nhìn về phía trước nhưng không phải số liệu lịch sử. Muốn trả lời "tháng trước đội thực
   sự chạy ở mức nào" thì phải chụp và lưu theo ngày.
2. Đa ngôn ngữ (10.3), email notification (10.6).
3. **Ràng buộc all-different trong CSP** — AC-3 trên `≠` không suy luận được kiểu chuồng
   bồ câu; muốn phát hiện sớm những trường hợp đó cần thuật toán Régin.

### Chênh lệch thang đo cần quyết định

`Resource.skills[].level` là enum 1-4 nhưng `Task.requiredSkills[].level` nhận tới 5, nên
yêu cầu mức 5 vĩnh viễn không thể khớp tuyệt đối. Hiện ô chọn trong form khoá mức 5 lại;
muốn dứt điểm thì phải thống nhất một thang cho cả hai schema.

### Nợ kỹ thuật đã biết

- `GET /api/auth/users` giới hạn Admin, nên UI cần danh sách người dùng phải lấy gián tiếp
  qua `GET /api/resources` (đây là cách trang chi tiết dự án đang làm).
- `react-router-dom` v6 còn 2 advisory mức moderate, chỉ sửa được bằng cách lên v7 (breaking).
  **Không áp dụng được cho dự án này**: một cái nằm ở SSR hydration mà đây là SPA thuần Vite,
  cái còn lại là open redirect qua `<Link>`/`useNavigate` — đích điều hướng động duy nhất
  trong client (`notif.link` ở `Header.jsx`) đã được chặn chỉ nhận đường dẫn nội bộ.
- `vite`/`esbuild` có advisory nhưng chỉ ảnh hưởng dev server, không đi vào bản build.
- Bundle client đã tách theo route (`React.lazy` cho 12 trang). Lần vào đầu tiên tải
  **813 kB** (gzip 266 kB) thay vì 1.544 kB. Chunk entry vẫn 559 kB — lõi antd + cssinjs
  mà khung layout cần ngay — nên cảnh báo >500 kB của Vite còn nguyên; muốn nhỏ hơn nữa
  thì phải đổi thư viện UI chứ không phải chia chunk khác đi.
- Chưa có kiểm thử render component; hiện có kiểm thử end-to-end qua API và Socket.IO
  (`cd server && npm test`, xem [server/tests/README.md](../server/tests/README.md)) và kiểm thử
  logic thuần phía client (`cd client && npm test`).
- Dữ liệu mẫu của seeder có 2 phụ thuộc bị vi phạm (task sau bắt đầu trước khi task trước
  kết thúc) — sơ đồ Gantt hiện cảnh báo đỏ và CSP báo lại trong `constraintReport` ngay sau khi seed.

### Bảo mật — mức đã đạt và chưa đạt

| Đã có | Chưa có |
|-------|---------|
| `helmet` (nosniff, frameguard, HSTS…) | Chưa có refresh token / thu hồi token |
| CORS giới hạn theo `CLIENT_URL` cho cả REST lẫn Socket.IO | Token để trong `localStorage` — XSS đọc được (đánh đổi tiêu chuẩn của SPA) |
| Giới hạn tần suất: 10 lần đăng nhập sai / 15 phút, 1000 request / 15 phút | Chưa chống NoSQL injection ở tầng middleware (hiện dựa vào `express-validator` từng route) |
| Giới hạn body 1 MB | Chưa có log kiểm toán cho hành động của Admin ngoài `ActivityLog` |
| Stack trace chỉ lộ khi `NODE_ENV=development` | |
| `JWT_SECRET` bắt buộc khi `NODE_ENV=production`, thiếu là không khởi động | |

Ngưỡng giới hạn tần suất đặt qua `AUTH_RATE_LIMIT_MAX` / `API_RATE_LIMIT_MAX`.

## Lỗi đã sửa

Toàn bộ 8 lỗi phát hiện trong đợt rà soát đã được xử lý và kiểm chứng bằng chạy thật:

| Vị trí | Lỗi | Cách sửa |
|--------|-----|----------|
| `Reports.jsx` | Đọc `summary.highBurnoutRisk`; API trả `summary.highBurnout` | Đổi sang đúng tên field |
| `Tasks.jsx` | Gửi `{name, minLevel}`; schema là `level` → `level` luôn = 3 | Gửi `level`, giá trị được lưu đúng |
| `Optimization.jsx` cột Skill Match | Đọc `record.skillMatchScore`; DB lưu `skillMatch` → luôn 85% | Đọc `skillMatch`; hiện `—` khi thuật toán không cung cấp |
| `Optimization.jsx` tab So sánh | Đọc `metrics.before/after` và `resources[]`; API trả shape khác | Mở rộng API trả đúng cấu trúc, ghép theo resource ID, giữ shape cũ để tương thích |
| CSP không có `fitness`/`metrics` | `runCSPSolver` không ghi hai field này | Tách `src/algorithms/scoring.js` dùng chung cho GA và CSP |
| JWT secret | `auth.controller` và `middleware/auth` dùng fallback khác nhau | Gom về `src/config/jwt.js`; `NODE_ENV=production` mà thiếu `JWT_SECRET` thì chặn ngay |
| `utils/seeder.js` | Đọc `MONGO_URI`, `dotenv.config()` phụ thuộc cwd | Đổi sang `MONGODB_URI` + đường dẫn tuyệt đối tới `.env` gốc |
| `constants/index.js` | Dead code, enum lạc hậu (`in_review`, thiếu `blocked`) | Sửa khớp server và đưa vào dùng ở Tasks / Projects / GanttChart |

Ghi chú: các bản ghi `OptimizationResult` của CSP tạo **trước** thay đổi này vẫn còn `fitness: 0` trong DB.
