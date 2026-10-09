# Mobile: màn Gantt và test giao diện Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Trạng thái (2026-10-08): đã làm xong Task 1–5.** Mobile: `app-permissions` 35, `gantt` 14, jest 10 bài.
> Metro đóng gói được bản Android (`expo export`) sau khi thêm màn. Chưa chạy trên máy thật hay giả lập.

**Goal:** Mobile có màn Gantt chỉ xem, và có bộ test dựng màn hình thật (không chỉ logic thuần).

**Spec:** lộ trình giai đoạn 9 trong [2026-10-07-lo-trinh-hoan-thien.md](./2026-10-07-lo-trinh-hoan-thien.md).

## Quyết định đã chốt (2026-10-08)

- **Gantt chỉ xem.** Gồm: thanh việc theo ngày, vạch hôm nay, mốc (milestone), lọc theo dự án, thu phóng
  ngày/tuần, bật tắt đường găng, chạm vào thanh thì mở chi tiết việc. **Không** kéo thả (dễ kéo nhầm khi
  cuộn trên màn nhỏ), **không** vẽ mũi tên phụ thuộc (phải thêm `react-native-svg`).
- **Test giao diện bằng `jest-expo` + `@testing-library/react-native`** (devDependencies).

## Phát hiện trước khi làm

- Mobile có đúng lỗi web đã sửa ở `51f0d5f`: màn **Công việc** và **chi tiết dự án** gọi `GET /tasks` không
  phân trang nên chỉ thấy 50 việc đầu. **Lịch** gọi `limit: 100` nên chỉ thấy 100. Server cắt `limit` về 100.
- Mobile chưa từng cài `node_modules` trong repo này; bộ test duy nhất là `app-permissions` chạy bằng node trần.

## Global Constraints

- Logic thuần (CPM, mốc, thời lượng) **không viết lại**: chép nguyên `client/src/utils/gantt.js` sang
  `mobile/src/utils/gantt.js`. Một bài test so hai file từng byte, để hai bản không lệch nhau âm thầm.
- Phần chỉ mobile có (vị trí thanh, trục thời gian, việc chưa có lịch) nằm ở `mobile/src/utils/ganttLayout.js`,
  thuần, test bằng node.
- Đủ mọi trang: một hàm `taskApi.getAllPages(params, maxPages)` như `taskService.getAllPages` của web, trần
  10 trang cho màn hình.

## Review Focus

1. Gantt có hơn 100 việc thì hiện đủ, không dừng ở trang đầu.
2. Việc thiếu ngày không biến mất: được đếm riêng là "chưa có lịch".
3. Bật đường găng thì đúng các việc trên đường găng được tô; đồ thị có vòng thì báo, không treo.
4. Hai bản `gantt.js` giống hệt nhau.

---

### Task 1: Hạ tầng test giao diện
**Files:** `mobile/package.json` (devDependencies, script `test`), `mobile/jest.config.js`, `mobile/tests/setup.js`.
- [ ] Cài `jest-expo`, `jest`, `@testing-library/react-native` đúng phiên bản Expo SDK đang dùng.
- [ ] `npm test` chạy cả bộ node trần lẫn jest.

### Task 2: Tải đủ mọi trang
**Files:** `mobile/src/api/taskApi.js` (`getAllPages`), `TasksScreen.js`, `ProjectDetailScreen.js`, `CalendarScreen.js`.
- [ ] Test trước: `getAllPages` gọi trang đầu, rồi các trang còn lại theo `pagination.pages`, dừng ở `maxPages`.
- [ ] Ba màn chuyển sang `getAllPages`.

### Task 3: Logic Gantt
**Files:** `mobile/src/utils/gantt.js` (bản chép), `mobile/src/utils/ganttLayout.js`, `mobile/tests/gantt.test.mjs`.
- [ ] Test trước: trục thời gian bao trọn mọi việc; thanh đúng vị trí và độ rộng theo `dayWidth`; mốc; việc
  thiếu ngày vào danh sách "chưa có lịch"; hai bản `gantt.js` giống nhau.

### Task 4: Màn Gantt
**Files:** `mobile/src/screens/gantt/GanttScreen.js`, `AppNavigator.js`, nút mở ở `TasksScreen.js` và
`ProjectDetailScreen.js`, test `mobile/tests/GanttScreen.test.js`.
- [ ] Test trước: hiện một thanh mỗi việc có lịch; đếm việc chưa có lịch; chạm thanh → `TaskDetail` với đúng
  `taskId`; bật đường găng → hiện tóm tắt; mở từ dự án thì gọi API với `project`.

### Task 5: Tài liệu
- [ ] FEATURES.md (mục mobile), CHANGELOG, TESTING.md (cách chạy test mobile), lộ trình.
