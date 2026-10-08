# Báo cáo kết quả theo người Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Trạng thái (2026-10-08): đã làm xong Task 1–4.** Server 29/29 bộ (`performance-summary` 14/14,
> `performance` 20/20), client 40/40. Lệch so với plan: hàm tính đặt ở `src/analytics/` cạnh
> `workloadTrend.js` chứ không ở `src/services/`.

**Goal:** Trả lời câu hỏi *"kỳ này ai làm kịp việc?"*: `GET /api/analytics/performance` gom việc theo người thực hiện trong một khoảng thời gian, với ba phạm vi là bản thân, cấp dưới trực tiếp và toàn công ty. Thêm một tab trong Reports để xem báo cáo này.

**Architecture:** Phần tính toán là một hàm thuần `summarizePerformance(tasks, people, now)` đặt trong `analytics/performanceSummary.js`, cạnh `workloadTrend.js`. Hàm không đụng DB, nên test đơn vị được giống bộ `workload-trend`. Controller chỉ làm ba việc: xác định tập người theo `scope`, lấy việc của họ có **deadline (`endDate`) nằm trong kỳ**, rồi gọi hàm trên. Client có một component riêng là `PerformanceReport.jsx`, tự gọi API, và được gắn thành tab thứ năm của `Reports.jsx`.

**Tech Stack:** Express + Mongoose 8, React + Ant Design, vitest. Test server qua `server/tests/run.mjs`.

**Spec:** [COMPARISON_BASE_WEWORK.md mục 4.1](../../COMPARISON_BASE_WEWORK.md#41-báo-cáo-kết-quả-theo-con-người), lộ trình: [2026-10-07-lo-trinh-hoan-thien.md](./2026-10-07-lo-trinh-hoan-thien.md)

## Quyết định đã chốt (2026-10-08)

- `scope=all` chỉ dành cho **Owner/Admin**. Người khác gọi thì nhận 403. Lý do: đây là dữ liệu đánh giá nhân sự. Ai cũng xem được `me`, và xem được `subordinates` (tức những người có `User.manager` là mình).
- Một việc thuộc về kỳ báo cáo nếu **`endDate` nằm trong `[from, to]`**. Việc không có deadline thì không xếp vào kỳ nào được. Nếu việc đó còn mở, nó được đếm riêng vào `excluded.noDeadline`.

## Global Constraints

- Đúng hạn và trễ hạn đo bằng **`completedAt`**, không bằng `reviewedAt`. Quy ước này đã ghi trong `Task.js` và đã dùng ở `getDashboardOverview`.
- Việc `done` mà không có `completedAt` (dữ liệu từ trước khi có luồng đánh giá) thì đếm riêng vào `doneNoTimestamp`. Nó **không** được tính là đúng hạn. `onTimeRate` = `onTime / (onTime + late)`, và bằng `null` khi mẫu số là 0.
- Phân loại các trạng thái phải loại trừ nhau và phủ hết: `total = done + failed + pendingReview + overdue + open`, và `done = onTime + late + doneNoTimestamp`.
  - `pendingReview`: `status === 'review'`. Không xét đúng hay trễ hạn, vì việc này còn có thể bị trả lại.
  - `overdue`: trạng thái `todo`, `in_progress` hoặc `blocked`, và `endDate < now`.
  - `open`: trạng thái `todo`, `in_progress` hoặc `blocked`, và `endDate >= now`.
- `extensions` là số mục trong `deadlineHistory` có `newEndDate > oldEndDate`. Lùi deadline sớm hơn thì không tính là gia hạn.
- Dữ liệu luôn lọc theo `companyName` của người gọi, kể cả với `subordinates`.
- Kỳ mặc định là tháng hiện tại, theo giờ server. `from > to`, hoặc ngày không hợp lệ, thì trả 400.
- Thông báo lỗi bằng tiếng Việt. Mọi khóa i18n phải có ở cả `vi.json` lẫn `en.json`, vì bộ `locales` sẽ bắt nếu thiếu.

## Review Focus

1. Người không phải admin gọi `scope=all` phải nhận 403, chứ không được lặng lẽ rơi về `me`.
2. `subordinates` chỉ lấy cấp dưới **trực tiếp**, không lấy cấp dưới của cấp dưới. Ai không có việc trong kỳ vẫn phải hiện ra với một dòng toàn số 0, vì quản lý cần thấy cả người không làm gì.
3. Việc giao cho người công ty khác, hoặc việc thuộc công ty khác, không được lọt vào báo cáo.
4. Việc `done` không có `completedAt` không được làm tăng `onTimeRate`.

---

### Task 1: Hàm tính `summarizePerformance` và bộ test đơn vị

**Files:**
- Create: `server/src/analytics/performanceSummary.js`
- Create: `server/tests/performance-summary.test.mjs` (không cần server lẫn DB)
- Modify: `server/tests/run.mjs` (đăng ký bộ), `server/tests/README.md` (bảng các bộ)

- [ ] Viết test trước:
  - Có đủ năm nhóm trạng thái, và hai đẳng thức tổng ở trên đúng.
  - Đúng hạn và trễ hạn: biên `completedAt === endDate` tính là đúng hạn.
  - `done` không có `completedAt`: vào `doneNoTimestamp` và không làm đổi `onTimeRate`. Khi không có việc nào đo được thì `onTimeRate` bằng `null`.
  - Gia hạn: lùi deadline ra sau thì đếm, kéo deadline lên sớm thì không đếm.
  - Người không có việc vẫn có một dòng toàn số 0. Việc giao cho người ngoài tập thì bị bỏ qua.
  - `totals` bằng tổng các dòng.
- [ ] Chạy để thấy đỏ, rồi cài đặt hàm, rồi chạy để thấy xanh.

### Task 2: `GET /api/analytics/performance`

**Files:**
- Modify: `server/src/controllers/analytics.controller.js` (`getPerformanceReport`)
- Modify: `server/src/routes/analytics.routes.js`
- Create: `server/tests/performance.test.mjs` (HTTP), đăng ký trong `run.mjs` và README

- [ ] Viết test HTTP trước. Dựng dữ liệu: một quản lý, hai cấp dưới, và một người không phải cấp dưới. Mỗi người có việc với deadline trong kỳ và ngoài kỳ.
  - `me`: chỉ có một dòng là chính mình. Việc có deadline ngoài kỳ không được tính.
  - `subordinates`: đúng hai cấp dưới, kể cả người không có việc nào.
  - `all`: admin thấy cả công ty. Member gọi thì nhận 403.
  - `scope=xyz` thì 400. `from > to` thì 400. Ngày sai thì 400.
  - Công ty B: admin B gọi `all` thì không thấy người nào của A.
  - Đúng hạn và trễ hạn đi qua luồng thật: hoàn thành một việc có deadline tương lai thì tính là đúng hạn, hoàn thành một việc có deadline đã qua thì tính là trễ. Đánh dấu Thất bại kèm lý do thì vào `failed`. `PUT` đổi `endDate` ra sau thì `extensions` bằng 1.
- [ ] Cài đặt controller và route, rồi chạy cả bộ server.

### Task 3: Tab "Kết quả" trong Reports

**Files:**
- Create: `client/src/components/reports/PerformanceReport.jsx`
- Modify: `client/src/pages/reports/Reports.jsx` (thêm tab `performance`), `client/src/services/analyticsService.js` (`getPerformance`)
- Modify: `client/src/i18n/locales/vi.json`, `en.json` (khóa `reports.performance.*`)
- Create: `client/tests/performance-report.test.jsx`

- [ ] Các điều khiển: `Segmented` chọn phạm vi (Của tôi / Cấp dưới / Toàn công ty; lựa chọn cuối chỉ hiện với Owner/Admin) và `RangePicker` chọn kỳ (mặc định tháng này).
- [ ] Hàng `MetricStrip` hiện số tổng. Bảng theo người có các cột: tên, tổng, đúng hạn, trễ, thất bại, quá hạn, chờ duyệt, gia hạn, tỉ lệ đúng hạn (`—` khi `null`). Có `Alert` khi `doneNoTimestamp > 0` hoặc `excluded.noDeadline > 0`.
- [ ] Test component: member không thấy lựa chọn "Toàn công ty". Đổi phạm vi thì gọi lại API với `scope` mới. `onTimeRate: null` hiện thành `—`.
- [ ] Chạy `npm test` trong `client`.

### Task 4: Tài liệu

- [ ] `docs/API.md`: thêm endpoint mới. `docs/CHANGELOG.md`. Cập nhật trạng thái giai đoạn 2 trong lộ trình.
