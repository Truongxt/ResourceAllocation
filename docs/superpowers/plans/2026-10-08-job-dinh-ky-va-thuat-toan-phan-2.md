# Job định kỳ, ảnh chụp workload, all-different Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Trạng thái (2026-10-08): đã làm xong Task 1–4.** Bộ `jobs` 21/21. Lỗi sinh trùng việc lặp lại được
> tái hiện bằng hai request song song (2 việc) trước khi sửa. Régin: đo xong, clique lớn nhất = 2 trên
> cả ba database, nên bỏ — kết luận và số đo ở ALGORITHMS.md mục 2.5.

**Goal:** Hệ thống có job định kỳ chạy được và thấy được. Hai job đầu tiên là sinh việc lặp lại và chụp workload hằng ngày. Quyết định có làm all-different (Régin) hay không dựa trên dữ liệu, không làm theo cảm tính.

**Spec:** lộ trình giai đoạn 6 và ghi chú GĐ6 trong [2026-10-07-lo-trinh-hoan-thien.md](./2026-10-07-lo-trinh-hoan-thien.md), [API.md](../../API.md) (mục workload-trend: "hệ thống không lưu ảnh chụp workload theo ngày")

## Quyết định đã chốt (2026-10-08)

- **Job chạy bằng endpoint nội bộ, gọi từ cron bên ngoài.** Đường dẫn `POST /api/internal/jobs/:name`, header `X-Job-Secret` so với `JOB_SECRET` theo kiểu constant-time. Thiếu `JOB_SECRET` thì endpoint trả 503 (tắt), không bao giờ mở tự do.

## Phát hiện trước khi làm

- **`generatePendingRecurringTasks` không có ai gọi.** "Việc lặp lại" chưa từng tự sinh việc theo lịch, chỉ chạy khi bấm "Chạy ngay".
- Hàm đó **không an toàn khi chạy đồng thời**: `nextRunDate` chỉ được cập nhật sau khi tạo việc, nên hai lần gọi trùng nhau sinh trùng việc. Với cron gọi từ ngoài (gọi lại khi timeout, nhiều instance) thì chuyện này có thật.

## Global Constraints

- Mỗi job **chạy lại an toàn**:
  - Việc lặp lại: mỗi cấu hình được "nhận" bằng `findOneAndUpdate` có điều kiện trên `nextRunDate` cũ, nên lần gọi thứ hai không nhận được.
  - Ảnh chụp: upsert theo khóa duy nhất `(resource, date)`.
- Mỗi lần chạy ghi một `JobRun` (tên, bắt đầu, kết thúc, kết quả hoặc lỗi). Rủi ro chính của cron bên ngoài là quên cấu hình, nên quản trị viên phải **thấy** được job quá hạn chưa chạy: `GET /api/jobs/status` (Owner/Admin), kèm cờ `stale` khi lần chạy thành công gần nhất cũ hơn ngưỡng của job.
- Ảnh chụp workload dùng **đúng** phép tính tải đang dùng ở analytics (tuần cao điểm, capacity theo fte), không tự tính lại theo một cách khác.

## Review Focus

1. Sai hoặc thiếu `X-Job-Secret` → 401. Server không đặt `JOB_SECRET` → 503. Tên job lạ → 404.
2. Gọi job việc lặp lại hai lần song song không sinh trùng việc.
3. Chụp workload hai lần trong cùng ngày không sinh bản ghi trùng.
4. `GET /jobs/status` báo `stale` khi chưa từng chạy.

---

### Task 1: Hạ tầng job và job việc lặp lại
**Files:** `server/src/models/JobRun.js`, `server/src/services/jobs.service.js` (danh sách job, chạy và ghi `JobRun`), `server/src/routes/internal.routes.js`, `server/src/routes/job.routes.js` (`/api/jobs/status`), `app.js`, `recurringTask.service.js` (nhận nguyên tử), `.env.example`, `tests/run.mjs` (đặt `JOB_SECRET` cho test), test mới `tests/jobs.test.mjs`.
- [ ] Test trước: các mã lỗi của Review Focus 1; chạy job sinh đúng một việc cho cấu hình đến hạn; gọi song song hai lần vẫn chỉ một việc; `JobRun` được ghi; `/jobs/status` cho member → 403, cho admin → có `stale`.

### Task 2: Ảnh chụp workload hằng ngày
**Files:** `server/src/models/WorkloadSnapshot.js`, job `workload-snapshot` trong `jobs.service.js`, `GET /api/analytics/workload-history?from&to` (phạm vi công ty như analytics khác), test trong `jobs.test.mjs`.
- [ ] Mỗi nhân sự đang hoạt động một bản ghi mỗi ngày: tải tuần hiện tại, capacity, utilization. Chạy lại trong ngày thì ghi đè.
- [ ] Endpoint lịch sử trả chuỗi theo ngày; lọc theo công ty.

### Task 3: All-different (Régin): đo trước, quyết sau
- [ ] Đếm trên dữ liệu mẫu và dữ liệu tổng hợp: đồ thị xung đột H4 có clique nào kích thước ≥ 3 không. Régin chỉ lọc được hơn AC-3 khi có tập ≥ 3 biến đôi một khác nhau.
- [ ] Có thì làm. Không có thì ghi kết luận kèm số đo vào ALGORITHMS.md, và bỏ hạng mục.

### Task 4: Tài liệu
- [ ] API.md (endpoint job, status, workload-history; sửa câu "không lưu ảnh chụp"), DATABASE.md, `.env.example`, hướng dẫn cấu hình cron, CHANGELOG, lộ trình.
