# 📋 Danh sách Tính năng - Resource Allocation Optimization

> Tài liệu này liệt kê tất cả tính năng của hệ thống kèm trạng thái phát triển.
> Cập nhật mỗi khi hoàn thành tính năng.

## Chú thích trạng thái

| Icon | Trạng thái | Mô tả |
|------|-----------|-------|
| ⬜ | Chưa bắt đầu | Chưa implement |
| 🔨 | Đang phát triển | Đang code |
| ✅ | Hoàn thành | Đã implement & test |
| 🧪 | Đang test | Đã code, đang test |

---

## Module 1: Authentication & Authorization ✅

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 1.1 | Đăng ký | Form đăng ký với validation (email, password) | ✅ | |
| 1.2 | Đăng nhập | JWT-based authentication | ✅ | |
| 1.3 | Đăng xuất | Clear token, redirect to login | ✅ | |
| 1.4 | Phân quyền | Role-based: Admin, PM, Member | ✅ | |
| 1.5 | Quản lý Profile | Cập nhật thông tin cá nhân, avatar | ✅ | Trang Cài đặt tài khoản |
| 1.6 | Đổi mật khẩu | Thay đổi mật khẩu từ profile | ✅ | Tích hợp trong Cài đặt |
| 1.7 | Protected Routes | Chặn truy cập trang khi chưa login | ✅ | |


---

## Module 2: Quản lý Dự án (Project Management) ✅

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 2.1 | Tạo dự án | Form tạo dự án (tên, mô tả, ngày, priority) | ✅ | Modal form |
| 2.2 | Danh sách dự án | Hiển thị grid/list dự án với filter, search | ✅ | Card grid + toolbar |
| 2.3 | Chi tiết dự án | Trang chi tiết với tabs (overview, tasks, members) | ✅ | Populate tasks + members |
| 2.4 | Cập nhật dự án | Chỉnh sửa thông tin dự án | ✅ | Modal form edit |
| 2.5 | Xóa dự án | Soft delete hoặc archive | ✅ | Force delete + confirm |
| 2.6 | Dashboard dự án | Tổng quan tiến độ, thống kê | ✅ | Summary API + stats |
| 2.7 | Gắn nhân sự | Thêm/xóa thành viên + allocation % | ✅ | Member CRUD APIs |
| 2.8 | Tiến độ dự án | Tự động tính % hoàn thành từ tasks | ✅ | recalculateProjectProgress |
| 2.9 | Filter & Sort | Lọc theo status, priority, date range | ✅ | Search, status, priority filters |

---

## Module 3: Quản lý Công việc (Task Management) ✅

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 3.1 | Tạo task | Form tạo task (title, description, dates, effort) | ✅ | Modal form |
| 3.2 | Danh sách task | Hiển thị tasks theo project hoặc tất cả | ✅ | List View + filters |
| 3.3 | Chi tiết task | Modal/page chi tiết với đầy đủ thông tin | ✅ | Edit modal |
| 3.4 | Cập nhật task | Chỉnh sửa thông tin task | ✅ | Modal form edit |
| 3.5 | Xóa task | Xóa task khỏi dự án | ✅ | Confirm + cleanup deps |
| 3.6 | Kanban Board | Drag & drop thay đổi status (Todo → In Progress → Done) | ✅ | 5 columns, optimistic UI |
| 3.7 | Task Dependencies | Thiết lập predecessor/successor relationships | ✅ | Model + cleanup on delete |
| 3.8 | Gán nhân sự | Assign resource cho task | ✅ | Assignee field |
| 3.9 | Required Skills | Định nghĩa skills cần thiết cho task | ✅ | Schema + API |
| 3.10 | Estimated Hours | Nhập giờ ước tính vs thực tế | ✅ | estimatedHours/actualHours |
| 3.11 | Thay đổi trạng thái | Cập nhật progress, status | ✅ | PATCH /status endpoint |

---

## Module 4: Quản lý Nhân sự (Resource Management) ✅

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 4.1 | Thêm nhân sự | Form thêm nhân sự (info, position, department) | ✅ | Modal form + user linking |
| 4.2 | Danh sách nhân sự | Grid hiển thị với avatar, skills, workload | ✅ | Card grid + utilization bars |
| 4.3 | Chi tiết nhân sự | Profile chi tiết + assignments hiện tại | ✅ | getById + assignments |
| 4.4 | Cập nhật thông tin | Chỉnh sửa thông tin nhân sự | ✅ | Edit modal |
| 4.5 | Skill Matrix | CRUD kỹ năng + level cho từng nhân sự | ✅ | Skill modal editor |
| 4.6 | Availability Calendar | Lịch trình, ngày nghỉ, periods unavailable | ✅ | Schema + availability status |
| 4.7 | Capacity (FTE) | Thiết lập FTE, max hours/week | ✅ | FTE + maxCapacity fields |
| 4.8 | Workload View | Hiển thị workload hiện tại, utilization rate | ✅ | Virtual utilization bars |
| 4.9 | Department Filter | Lọc nhân sự theo bộ phận | ✅ | Filter by department |
| 4.10 | Skill Search | Tìm nhân sự theo skill + level | ✅ | ?skill=&skillLevel= query |

---

## Module 5: Thuật toán Tối ưu hóa (Optimization Engine) ✅

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 5.1 | Genetic Algorithm | Multi-objective GA cho phân bổ nhân sự | ✅ | Tournament, Uniform Crossover, Random Mutation, Elitism |
| 5.2 | CSP Solver | Backtracking + AC-3 cho ràng buộc cứng | ✅ | MRV + LCV heuristics, domain reduction |
| 5.3 | Fitness Function | Workload balance + skill match + cost | ✅ | 4 objectives, configurable weights |
| 5.4 | Constraint Validation | Kiểm tra capacity, skill, time constraints | ✅ | Hard constraints: capacity, skill, availability |
| 5.5 | Run Optimization UI | Giao diện chạy tối ưu hóa với parameters | ✅ | Algorithm selector, param sliders, weight tuning |
| 5.6 | Results Comparison | So sánh multiple solutions | ✅ | History list + detail view |
| 5.7 | Apply Solution | Áp dụng kết quả tối ưu hóa vào hệ thống | ✅ | Apply assigns tasks to resources |
| 5.8 | History | Lưu lịch sử các lần chạy tối ưu hóa | ✅ | OptimizationResult model |
| 5.9 | Convergence Chart | Biểu đồ hội tụ GA (fitness qua generations) | ✅ | Bar chart in UI |
| 5.10 | Performance Benchmark | Đo thời gian chạy vs kích thước bài toán | ✅ | executionTime + task/resource counts |

---

## Module 6: Gantt Chart tương tác ⬜

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 6.1 | Timeline View | Hiển thị tasks trên timeline | ⬜ | |
| 6.2 | Drag & Drop | Kéo thả để thay đổi thời gian task | ⬜ | |
| 6.3 | Dependencies | Hiển thị mũi tên dependency giữa tasks | ⬜ | |
| 6.4 | Zoom Controls | Zoom theo Day / Week / Month | ⬜ | |
| 6.5 | Critical Path | Highlight critical path | ⬜ | |
| 6.6 | Resource Lane | Gantt theo resource (ai làm gì khi nào) | ⬜ | |
| 6.7 | Milestone | Hiển thị milestones | ⬜ | |
| 6.8 | Export | Xuất Gantt Chart dạng ảnh/PDF | ⬜ | |

---

## Module 7: Resource Histogram & Analytics ⬜

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 7.1 | Resource Histogram | Stacked bar chart phân bổ theo thời gian | ⬜ | |
| 7.2 | Overallocation Alert | Phát hiện & cảnh báo quá tải | ⬜ | |
| 7.3 | Utilization Dashboard | Dashboard utilization rate từng nhân sự | ⬜ | |
| 7.4 | Burnout Risk Index | Chỉ số rủi ro burnout | ⬜ | |
| 7.5 | Before/After Compare | So sánh trước/sau tối ưu hóa | ⬜ | |
| 7.6 | Team Analytics | Thống kê theo team/department | ⬜ | |
| 7.7 | Trend Charts | Biểu đồ xu hướng workload theo thời gian | ⬜ | |

---

## Module 8: Báo cáo & Xuất dữ liệu ⬜

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 8.1 | Báo cáo tổng hợp | Summary report phân bổ nguồn lực | ⬜ | |
| 8.2 | Xuất PDF | Export báo cáo dạng PDF | ⬜ | |
| 8.3 | Xuất Excel | Export dữ liệu dạng Excel/CSV | ⬜ | |
| 8.4 | Optimization History | Bảng lịch sử tối ưu hóa với metrics | ⬜ | |
| 8.5 | Project Report | Báo cáo chi tiết từng dự án | ⬜ | |

---

## Tính năng bổ sung (Nice to have) ⬜

| # | Tính năng | Mô tả | Trạng thái | Ghi chú |
|---|----------|-------|-----------|---------|
| 9.1 | Real-time Notifications | Socket.IO notifications | ⬜ | Optional |
| 9.2 | Dark/Light Theme Toggle | Chuyển đổi theme | ⬜ | Optional |
| 9.3 | Multi-language | Hỗ trợ Tiếng Việt + English | ⬜ | Optional |
| 9.4 | Import Data | Import dự án/nhân sự từ CSV | ⬜ | Optional |
| 9.5 | Activity Log | Nhật ký hoạt động hệ thống | ⬜ | Optional |
| 9.6 | Email Notifications | Gửi email khi được assign task | ⬜ | Optional |

---

## Thống kê tổng quan

| Module | Tổng tính năng | Hoàn thành | % |
|--------|---------------|-----------|---|
| 1. Auth | 7 | 0 | 0% |
| 2. Projects | 9 | 0 | 0% |
| 3. Tasks | 11 | 0 | 0% |
| 4. Resources | 10 | 0 | 0% |
| 5. Optimization | 10 | 0 | 0% |
| 6. Gantt Chart | 8 | 0 | 0% |
| 7. Analytics | 7 | 0 | 0% |
| 8. Reports | 5 | 0 | 0% |
| 9. Bonus | 6 | 0 | 0% |
| **Tổng** | **73** | **0** | **0%** |
