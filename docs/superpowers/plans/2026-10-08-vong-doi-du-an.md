# Vòng đời dự án: lưu trữ, nhân bản, mẫu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Trạng thái (2026-10-08): đã làm xong Task 1–5.** Server 31/31 bộ (`project-lifecycle` 58/58),
> client 46/46, e2e 88/88. Lệch so với plan: "Tạo từ mẫu" nằm trong menu "…" của tab Mẫu, không phải
> một ô trong form tạo dự án. Ở dạng thẻ (grid), dự án lưu trữ vẫn hiện nút sửa (dạng bảng đã ẩn);
> bấm vào thì server trả 409 kèm thông báo. Nhân bản không ghép từ `duplicateTask` như spec phác
> thảo, vì hàm đó không trỏ lại được phụ thuộc giữa các bản sao. Bộ bắt lỗi chung nay đọc
> `err.statusCode`.

**Goal:** Dự án xong rút được khỏi mọi danh sách (lưu trữ). Một dự án chạy lặp lại không phải gõ lại 40 công việc (nhân bản, mẫu).

**Spec:** [COMPARISON_BASE_WEWORK.md mục 4.4](../../COMPARISON_BASE_WEWORK.md#44-vòng-đời-dự-án-đóngmở-nhân-bản-mẫu-thật), lộ trình: [2026-10-07-lo-trinh-hoan-thien.md](./2026-10-07-lo-trinh-hoan-thien.md)

## Quyết định đã chốt (2026-10-08)

1. **Lưu trữ** = ẩn khỏi danh sách và bộ lọc mặc định, **chỉ đọc**, mở lại được. Chỉ lưu trữ được khi không còn việc mở (`todo`, `in_progress`, `review`, `blocked`). Nhờ vậy tải nhân sự và tối ưu không đổi ngầm.
2. **Nhân bản / tạo từ mẫu**: mọi ngày dời theo ngày bắt đầu mới và giữ khoảng cách tương đối. Giữ lại nhóm việc, việc con, checklist, phụ thuộc, giờ ước tính, kỹ năng yêu cầu, độ ưu tiên và mô tả. Trạng thái về `todo`, tiến độ về 0. **Người thực hiện để trống**, người theo dõi cũng bỏ.
3. **Mẫu (`isTemplate`) nằm ngoài mọi tính toán**: không có trong danh sách dự án thường, Gantt, danh sách việc, tải, tối ưu hay báo cáo. Chỉ hiện ở danh sách mẫu và ô "Tạo từ mẫu". Ba bộ nhóm việc có sẵn (`template: 'agile_scrum' | 'marketing' | 'standard'`) giữ nguyên.

## Quyết định suy ra (không cần hỏi)

- Mẫu tạo bằng **"Lưu thành mẫu"** từ một dự án. Thao tác này là một lần nhân bản với `isTemplate: true`, nên mẫu không bao giờ có người thực hiện. Không có nút biến một dự án đang chạy thành mẫu, vì các việc đã giao người của nó sẽ lọt vào tải.
- Việc trong mẫu **không được gán người**: tạo hoặc sửa với `assignee` thì trả 400.
- Nhân bản dự án thường thì **giữ thành viên dự án**: tối ưu dùng thành viên làm tập nhân sự, thiếu họ thì chỉ còn mỗi quản lý. Mẫu thì không có thành viên; tạo từ mẫu thì quản lý là người tạo.
- Lưu trữ cũng bị chặn khi dự án còn **việc lặp lại đang bật**, vì nó sẽ tự sinh việc mở mới vào dự án đã đóng. Bộ sinh việc lặp lại cũng bỏ qua dự án lưu trữ và dự án mẫu.
- Việc **đã đóng** trong dự án lưu trữ vẫn được tính trong báo cáo kết quả và dashboard. Đó là lịch sử, ẩn đi thì báo cáo kỳ trước tự đổi số.

## Global Constraints

- Trường mới: `Project.isArchived` (Boolean, mặc định `false`), `archivedAt`, `archivedBy`, `Project.isTemplate` (Boolean, mặc định `false`). Truy vấn loại trừ phải dùng `{ $ne: true }`, để bản ghi cũ thiếu trường vẫn được tính là đang hoạt động.
- Chặn ghi vào dự án lưu trữ thì trả **409**, kèm thông báo "Dự án đã lưu trữ — mở lại để chỉnh sửa".
- Lấy tập dự án "không hoạt động" (lưu trữ + mẫu) bằng một hàm dùng chung, không rải điều kiện ra từng nơi.

## Review Focus

1. Lưu trữ khi còn việc mở hoặc còn việc lặp lại đang bật phải trả 409, và nói rõ còn bao nhiêu.
2. Mọi đường ghi vào dự án lưu trữ đều bị chặn: tạo việc, nhập Excel, chuyển hoặc nhân bản việc vào, sửa/xóa/đổi trạng thái việc, sửa dự án. Đọc thì vẫn được.
3. Việc của mẫu không lọt vào `GET /tasks`, thống kê, tối ưu "Tất cả dự án" và dashboard.
4. Nhân bản: phụ thuộc trỏ sang bản sao, không trỏ về việc gốc. Việc con trỏ sang việc cha mới. Khoảng cách ngày giữ nguyên.

---

### Task 1: Lưu trữ / mở lại

**Files:** `server/src/models/Project.js`, `server/src/controllers/project.controller.js`, `server/src/routes/project.routes.js`, `server/src/middleware/taskAccess.js` (`guardTaskCompany`, `createDeniedReason`), `server/src/services/recurringTask.service.js`, `server/src/services/projectLifecycle.service.js` (mới: `inactiveProjectIds`), test mới `server/tests/project-lifecycle.test.mjs`.

- [ ] Test trước: 409 khi còn việc mở (kèm số lượng); 409 khi còn việc lặp lại đang bật; lưu trữ được khi mọi việc đã đóng; `GET /projects` mặc định không có dự án đó, còn `?archived=true` thì có; tạo việc, sửa việc, đổi trạng thái và sửa dự án đều 409; `GET /tasks/:id` vẫn 200; mở lại thì ghi lại được.
- [ ] `POST /projects/:id/archive` và `POST /projects/:id/unarchive` (PM+).

### Task 2: Nhân bản và mẫu

**Files:** `server/src/services/projectLifecycle.service.js` (`cloneProject`), controller và route, test trong cùng bộ.

- [ ] `POST /projects/:id/duplicate` nhận `{ name, startDate, asTemplate }`. Tạo từ mẫu cũng là gọi endpoint này trên một mẫu, với `asTemplate: false`.
- [ ] Test trước: số nhóm, số việc và số việc con khớp bản gốc; ngày dời đúng khoảng; `assignee` rỗng; phụ thuộc trỏ sang bản sao; mẫu không có thành viên; tạo việc có `assignee` trong mẫu thì 400; nhân bản dự án công ty khác thì 403/404.

### Task 3: Loại mẫu (và dự án lưu trữ khi phù hợp) khỏi các truy vấn

**Files:** `task.controller.js` (`getTasks`, `getTaskSummary`, `getTaskReminders`), `analyticsScope.service.js`, `optimization.controller.js` (`loadOptimizationData`, từ chối chạy trên mẫu), các chỗ khác lộ ra khi rà.

- [ ] Test trước: việc của mẫu không có trong `GET /tasks`, `/tasks/stats/summary`, dashboard, `/optimization/readiness`; việc đã đóng của dự án lưu trữ không có trong `GET /tasks` mặc định nhưng có khi lọc đúng `?project=`.

### Task 4: Giao diện

**Files:** `client/src/pages/projects/Projects.jsx`, `ProjectDetail.jsx`, form tạo dự án, i18n, test component.

- [ ] Bộ lọc Đang chạy / Lưu trữ / Mẫu. Thao tác: Lưu trữ, Mở lại, Nhân bản, Lưu thành mẫu. Ô "Tạo từ mẫu" trong form tạo dự án. Dự án lưu trữ có dải báo chỉ đọc và ẩn nút sửa.

### Task 5: Tài liệu

- [ ] `API.md`, `DATABASE.md`, `CHANGELOG.md`, `COMPARISON_BASE_WEWORK.md` (mục 4.4), lộ trình, README các bộ test.
