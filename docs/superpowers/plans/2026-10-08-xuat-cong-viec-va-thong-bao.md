# Xuất công việc và thông báo Thất bại / đổi deadline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Trạng thái (2026-10-08): đã làm xong Task 1–4.** Lệch so với plan ở Task 3: bản in còn mất
> khoảng 265px ở mép trái do lề chừa cho thanh bên (inline style trong `App.jsx`) và transition
> của lề đó, nên phải thêm quy tắc in toàn cục trong `workspace.css`. Màu thanh cũng mất khi in
> với cài đặt mặc định, nên thêm `print-color-adjust` và kiểm bằng lệnh tô màu trong PDF thật.
> Phát hiện ngoài phạm vi (`PUT /tasks/:id` đổi `status` không qua chốt) đã ghi trong lộ trình.

**Goal:** Lấy được dữ liệu công việc ra khỏi hệ thống (CSV và bản in Gantt), và báo cho những người liên quan khi một việc bị đánh dấu Thất bại hoặc bị đổi deadline.

**Spec:** [COMPARISON_BASE_WEWORK.md mục 4.6 và 4.8](../../COMPARISON_BASE_WEWORK.md#46-xuất-dữ-liệu-công-việc), lộ trình: [2026-10-07-lo-trinh-hoan-thien.md](./2026-10-07-lo-trinh-hoan-thien.md)

## Hiện trạng đo được (2026-10-08), khác với spec

- Spec nói "dùng lại bộ tiện ích CSV đã có ở Projects, Resources, Reports". Thực tế **không có tiện ích nào**. Projects và Resources chỉ có *nhập* CSV. Reports tự dựng chuỗi CSV ngay trong trang, và không escape dấu `"`: tên người có dấu ngoặc kép sẽ làm lệch cột.
- Màn Công việc gọi `GET /tasks` không kèm `limit`, nên server trả **50 việc đầu** (trần là 100/trang). Muốn xuất đủ thì phải tự lấy hết các trang. Việc màn hình chỉ hiện 50 việc là lỗi riêng, **không** sửa trong giai đoạn này.
- Gantt **đã có** nút In. Nhưng `.gantt-timeline-wrap` cuộn ngang và dọc, `.gantt-sidebar-body` cuộn dọc, nên bản in chỉ ra đúng khung đang thấy trên màn hình.
- Đánh dấu Thất bại **có** gửi thông báo, nhưng là loại chung `task_status_changed` với nội dung "đã chuyển sang trạng thái: failed". Chỉ người thực hiện nhận, và không kèm lý do. Đổi deadline thì cả hai đường (`PUT /tasks/:id` khi `endDate` đổi, và `PATCH /tasks/:id/deadline`) đều không gửi gì.

## Global Constraints

- Người nhận thông báo là người thực hiện và người theo dõi, **trừ chính người thao tác**. Đây là cùng quy tắc với thông báo bình luận.
- Hai loại mới trong enum `Notification.type` là `task_failed` và `task_deadline_changed`. Riêng với Thất bại, `task_failed` **thay thế** `task_status_changed`, để người thực hiện không nhận hai thông báo cho cùng một thao tác.
- Nội dung thông báo phải có lý do (thất bại hoặc gia hạn), và ngày cũ → ngày mới theo dạng `dd/mm/yyyy`.
- Mỗi giá trị trong CSV đều được đặt trong ngoặc kép, dấu `"` bên trong được nhân đôi. Chuỗi bắt đầu bằng `=`, `+`, `-`, `@`, tab hoặc CR thì được thêm `'` ở đầu để Excel không chạy nó như công thức. Số thì giữ nguyên. File có BOM UTF-8 để Excel đọc đúng tiếng Việt.

## Review Focus

1. Người thao tác không tự nhận thông báo. Người theo dõi cũng nhận, không chỉ người thực hiện.
2. `PUT /tasks/:id` gửi lại **cùng** `endDate` thì không được sinh thông báo, đúng như điều kiện ghi `deadlineHistory` hiện có.
3. File xuất chứa việc ở **mọi trang**, không chỉ 50 việc đầu.
4. Bản in Gantt có đủ mọi dòng và trọn trục thời gian. Kiểm bằng PDF thật, không chỉ đọc CSS.

---

### Task 1: Thông báo Thất bại và đổi deadline

**Files:**
- Modify: `server/src/models/Notification.js` (enum)
- Modify: `server/src/controllers/task.controller.js` (`updateTaskStatus`, `updateTask`, `updateDeadline`, thêm hàm `notifyTaskPeople`)
- Modify: `server/tests/notify-session.test.mjs`

- [ ] Viết test trước, đếm bản ghi thông báo thật:
  - PM đánh dấu Thất bại kèm lý do: người thực hiện và người theo dõi mỗi người nhận một `task_failed`, nội dung có lý do. Người thực hiện **không** nhận thêm `task_status_changed`. PM không nhận gì.
  - `PATCH /:id/deadline` và `PUT /:id` có `endDate` mới: mỗi đường sinh một `task_deadline_changed` cho người thực hiện và người theo dõi, nội dung có ngày mới. `PUT` lại cùng `endDate` thì không sinh thêm.
- [ ] Chạy để thấy đỏ, cài đặt, rồi chạy cả bộ server.

### Task 2: Tiện ích CSV và nút Xuất ở màn Công việc

**Files:**
- Create: `client/src/utils/csv.js` (`toCsv(rows)`, `downloadCsv(filename, rows)`)
- Create: `client/tests/csv.test.mjs` (logic thuần, đăng ký trong `test:logic`)
- Modify: `client/src/pages/reports/Reports.jsx` (`exportCSV` dùng `toCsv`)
- Modify: `client/src/pages/tasks/Tasks.jsx` (nút "Xuất CSV")
- Modify: `client/src/i18n/locales/vi.json`, `en.json`
- Create: `client/tests/task-export.test.jsx`

- [ ] Test `toCsv`: escape ngoặc kép, xuống dòng nằm trong ô, chặn công thức, số âm giữ nguyên, `null`/`undefined` thành ô rỗng.
- [ ] Nút xuất lấy theo đúng bộ lọc đang áp dụng, gọi `limit=100` và đi qua từng trang cho tới `pagination.pages`. Các cột: tiêu đề, dự án, nhóm, trạng thái, ưu tiên, người thực hiện, bắt đầu, hạn chót, giờ ước tính, tiến độ, hoàn thành lúc. Nhãn trạng thái và ưu tiên lấy theo ngôn ngữ đang dùng.
- [ ] Test component: dữ liệu giả có 2 trang thì file chứa việc của cả hai trang, và bộ lọc đang chọn được truyền kèm.

### Task 3: In Gantt trọn biểu đồ

**Files:**
- Modify: `client/src/pages/gantt/GanttChart.css` (`@media print`), `client/src/pages/gantt/GanttChart.jsx` (co theo chiều ngang trang khi in)

- [ ] Đo trước bằng Playwright `page.pdf()` trên dữ liệu mẫu: bản in hiện có bị cắt.
- [ ] Khi in: bỏ thanh cuộn và chiều cao cố định, khổ ngang, và co toàn biểu đồ cho vừa bề ngang trang. Đo lại bằng PDF.

### Task 4: Tài liệu

- [ ] `docs/API.md` (hai loại thông báo mới), `docs/CHANGELOG.md`, cập nhật mục 4.6/4.8 trong `COMPARISON_BASE_WEWORK.md`, trạng thái giai đoạn 3 trong lộ trình, README các bộ test.
