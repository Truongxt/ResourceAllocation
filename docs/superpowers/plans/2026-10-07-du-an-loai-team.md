# Dự án loại "team" (việc thường ngày) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Trạng thái (2026-10-07): đã làm xong Task 1–4.** Server 27/27 bộ, client 37/37, e2e `03-projects` 10/10.
> Lệch so với plan: bỏ phần test cho PM ở Task 2 (Review Focus #5). Nhánh "người không phải admin"
> trong `loadOptimizationData` không đi tới được qua HTTP, vì `authorizeApp('optimize')` chỉ cho
> Owner/Admin/App Admin qua. Bộ lọc team vì vậy được áp **sau** khi rẽ nhánh, để nhánh nào cũng có,
> và có thêm một assertion chạy CSP thật.

**Goal:** Cho phép tạo "Phòng ban vận hành" (`Project.kind = 'team'`) không có ngày kết thúc, để việc thường ngày có chỗ nhập và được tính vào tải của nhân sự.

**Architecture:** Không tách model mới. `Project` thêm trường `kind`. Ngày bắt đầu/kết thúc chỉ bắt buộc khi `kind === 'project'`; team thì không có `endDate`. Tầng tính tải (`workload.service.js`, `workloadTrend.js`) vốn đã đọc mọi task có ngày, không phân biệt dự án, nên **không cần sửa**: việc của team tự vào tải. Optimizer coi việc của team là **tải cố định**: không đưa vào biến để phân công lại khi chạy "Tất cả dự án", nhưng vẫn tính vào `committedTasks` của từng người. Nếu người dùng chọn đích danh một team thì vẫn chạy được.

**Tech Stack:** Express + Mongoose 8, express-validator, React + Ant Design. Test e2e qua `server/tests/run.mjs`.

**Spec:** [COMPARISON_BASE_WEWORK.md mục 4.3](../../COMPARISON_BASE_WEWORK.md#43-việc-thường-ngày-của-phòng-ban-không-có-chỗ-để-ở), lộ trình: [2026-10-07-lo-trinh-hoan-thien.md](./2026-10-07-lo-trinh-hoan-thien.md)

## Global Constraints

- Giá trị: `kind ∈ {'project', 'team'}`, mặc định `'project'`. Bản ghi cũ không có trường này được coi là `'project'`.
- Trường mới tên `kind`. **Không** dùng lại `projectType`, vì trường đó đã mang nghĩa nội bộ/khách hàng.
- Thông báo lỗi bằng tiếng Việt, cùng giọng với các validator sẵn có.
- Không đổi hành vi của dự án thường. Mọi test hiện có phải còn đạt.

## Review Focus

1. Chuyển `project → team` qua `PUT /projects/:id`: `endDate` phải bị gỡ hẳn (`$unset`), không được để lại `null`, vì client gọi `dayjs(null)` sẽ ra Invalid Date.
2. Chuyển `team → project` mà không gửi ngày: phải 400 thay vì lưu một dự án thiếu ngày.
3. Dữ liệu cũ thiếu `kind`: các truy vấn loại team phải dùng `kind: 'team'`, không dùng `kind: { $ne: 'project' }`, để bản ghi cũ không bị tính nhầm.
4. Optimizer "Tất cả dự án" với một người vừa có việc team vừa có việc dự án: việc team phải vào `committedTasks` chứ không bị bỏ sót.
5. PM (không phải admin) chạy optimizer không chọn dự án: việc của team mà PM là thành viên cũng không được đưa vào biến.

---

### Task 1: Model và validator nhận `kind`

**Files:**
- Modify: `server/src/models/Project.js` (thêm `kind`, ngày bắt buộc có điều kiện)
- Modify: `server/src/routes/project.routes.js:69-70, 107-108` (validator)
- Modify: `server/src/controllers/project.controller.js` (`createProject`: bỏ `endDate` khi là team; `updateProject`: gộp bản ghi cũ để kiểm ngày, `$unset` khi chuyển sang team)
- Create: `server/tests/project-kind.test.mjs`
- Modify: `server/tests/run.mjs` (đăng ký bộ `project-kind`)

**Interfaces:**
- Produces: `Project.kind: 'project' | 'team'`. Team không có `endDate`.

- [ ] **Step 1: Viết test hỏng** — `server/tests/project-kind.test.mjs`: tạo team không ngày → 201; team gửi kèm `endDate` → lưu không có `endDate`; dự án thường thiếu ngày → 400; chuyển dự án → team gỡ `endDate`; chuyển team → dự án không ngày → 400, có ngày → 200; `kind` lạ → 400.
- [ ] **Step 2: Chạy `npm test project-kind`**, mong đợi FAIL (team không ngày bị 400).
- [ ] **Step 3: Cài đặt.**

```js
// Project.js
kind: { type: String, enum: ['project', 'team'], default: 'project' },
startDate: { type: Date, required: [datesRequired, 'Ngày bắt đầu là bắt buộc'] },
endDate:   { type: Date, required: [datesRequired, 'Ngày kết thúc là bắt buộc'] },

function datesRequired() {
  // Ở ngữ cảnh update `this` là Query, không đọc được kind của bản ghi; updateProject
  // tự kiểm sau khi gộp bản ghi cũ với payload.
  if (this instanceof mongoose.Query) return false;
  return this.kind !== 'team';
}
```

```js
// project.routes.js — create
body('kind').optional().isIn(['project', 'team']).withMessage('Loại dự án không hợp lệ'),
body('startDate').if(body('kind').not().equals('team'))
  .notEmpty().withMessage('Ngày bắt đầu là bắt buộc'),
body('startDate').optional({ values: 'falsy' }).isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
// endDate tương tự
// update: body('kind').optional().isIn(['project', 'team'])
```

```js
// project.controller.js — updateProject, trước findByIdAndUpdate
const nextKind = updateData.kind || project.kind || 'project';
if (nextKind === 'team') {
  delete updateData.endDate;
  updateData.$unset = { endDate: 1 };
} else if (!(updateData.startDate || project.startDate) || !(updateData.endDate || project.endDate)) {
  return res.status(400).json({ success: false, message: 'Dự án cần có ngày bắt đầu và ngày kết thúc' });
}
```

- [ ] **Step 4: Chạy `npm test project-kind` và `npm test project-detail`**, mong đợi PASS.
- [ ] **Step 5: Commit** `feat(projects): thêm loại team không có ngày kết thúc`

### Task 2: Việc của team là tải cố định trong optimizer

**Files:**
- Modify: `server/src/controllers/optimization.controller.js` (`loadOptimizationData`)
- Test: `server/tests/project-kind.test.mjs` (thêm section)

**Interfaces:**
- Consumes: `Project.kind` (Task 1)

- [ ] **Step 1: Viết test hỏng**: tạo team, thêm một việc `todo` có ngày cho `nam.tran`, rồi gọi `GET /optimization/readiness` (không truyền `projectId`). `totalTasks` phải **không** tăng so với trước khi tạo việc. Truyền `projectId` của team thì `totalTasks === 1`. Tải của `nam.tran` trên `GET /analytics/utilization` phải tăng (việc team có vào tải).
- [ ] **Step 2: Chạy**, mong đợi FAIL ở assertion "không tăng".
- [ ] **Step 3: Cài đặt**: trong hai nhánh không có `projectId` (admin và người thường), loại các task thuộc project có `kind: 'team'` cùng công ty:

```js
const teamIds = await Project.find({ companyName: companyScope, kind: 'team' }).distinct('_id');
// admin:  taskFilter.project = { $nin: teamIds }
// thường: lọc teamIds ra khỏi userProjectIds trước khi gán taskFilter.project
```

Phần `committedTasks` giữ nguyên. Nó đã lấy mọi việc đang mở của người đó mà không nằm trong lần chạy, nên việc team tự vào đó.

- [ ] **Step 4: Chạy `npm test project-kind`, `npm test api`, `npm test company`**, mong đợi PASS.
- [ ] **Step 5: Commit** `feat(optimization): việc của team là tải cố định, không phân công lại`

### Task 3: Giao diện web

**Files:**
- Modify: `client/src/pages/projects/Projects.jsx` (Radio chọn loại; ẩn và bỏ `required` cho khoảng ngày khi là team, đổi sang chọn một ngày bắt đầu không bắt buộc; nhãn "Thường xuyên" ở cột Thời gian, thẻ và tag)
- Modify: `client/src/pages/projects/ProjectDetail.jsx:817` (hiện "Thường xuyên" thay cho `→ —`)

- [ ] **Step 1**: Thêm `Form.useWatch('kind', form)`. Khi là `team` thì hiện `DatePicker` ngày bắt đầu (không bắt buộc); khi là `project` thì hiện `RangePicker` bắt buộc như cũ. Payload gửi `kind`; team chỉ gửi `startDate`.
- [ ] **Step 2**: Ở cột Thời gian, thẻ dự án và ProjectDetail: nếu `kind === 'team'` thì hiện `Từ {startDate} · Thường xuyên`. Thêm tag "Vận hành" cạnh tag Nội bộ/Khách hàng.
- [ ] **Step 3**: Chạy `npm test` trong `client` và `npm run build`, mong đợi PASS.
- [ ] **Step 4**: Kiểm trên trình duyệt: tạo team, sửa team, chuyển team ↔ dự án.
- [ ] **Step 5: Commit** `feat(client): tạo và hiển thị phòng ban vận hành`

### Task 4: Tài liệu

- [ ] Cập nhật `docs/COMPARISON_BASE_WEWORK.md` (mục III, 4.3, 6), `docs/API.md` (trường `kind`), `docs/DATABASE.md` (schema Project), `docs/CHANGELOG.md`, `server/tests/README.md` (bộ `project-kind`).
- [ ] Commit `docs: ghi lại loại dự án team`
