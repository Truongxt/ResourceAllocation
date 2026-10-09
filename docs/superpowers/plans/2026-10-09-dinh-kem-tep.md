# Đính kèm tệp thật Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Trạng thái (2026-10-09): đã làm xong Task 1–4.** Server 36/36 bộ (`attachments` 40/40), client 68/68,
> bài e2e đính kèm đạt. Lệch so với plan: bỏ trường `project` trên `Attachment` (việc chuyển được dự án
> nên trường đó sẽ sai), dọn tệp theo id các việc. `GET /tasks/:id` trả thêm `project.isArchived` để tab
> Tệp ẩn nút tải lên/xóa khi chỉ đọc.

**Goal:** Người dùng tải tệp lên một công việc, xem danh sách, tải về và xóa được. Hiện tại `resultReport.attachments` chỉ là trường trong DB: không có đường tải lên, giao diện cũng không dùng.

**Spec:** [COMPARISON_BASE_WEWORK.md mục 4.5](../../COMPARISON_BASE_WEWORK.md#45-đính-kèm-tệp-thật), lộ trình: [2026-10-07-lo-trinh-hoan-thien.md](./2026-10-07-lo-trinh-hoan-thien.md) (GĐ8)

## Quyết định đã chốt (2026-10-09)

1. **Lưu trên đĩa server**, thư mục `UPLOAD_DIR` (mặc định `server/uploads`). Mọi thao tác đọc/ghi tệp đi qua một lớp `fileStorage` (`save`, `stream`, `remove`), để sau đổi sang S3 chỉ thay lớp này.
2. **Mỗi tệp tối đa 10 MB.**

## Quyết định suy ra (không cần hỏi)

- **Tệp gắn với công việc**, không gắn với báo cáo kết quả. Nằm ở tab "Tệp" trong ngăn chi tiết công việc. Lưu ở collection riêng `Attachment` (`task`, `project`, `companyName`, `originalName`, `mimeType`, `size`, `storageKey`, `uploadedBy`, `createdAt`), không nhúng vào `Task`, để tải công việc không kéo theo danh sách tệp.
- **Quyền: theo đúng bình luận.** Ai xem được công việc thì xem và tải về được (cùng công ty, phân hệ Công việc ≥ xem). Tải lên cũng như gửi bình luận: cùng công ty, phân hệ Công việc = sửa. Xóa: người tải lên, admin, hoặc quản lý của dự án đó. Dự án lưu trữ thì chỉ đọc (409). Mọi điều này có sẵn nhờ đặt route dưới `/api/tasks/:id/…` (`guardTaskCompany`, `requireAppPermission('tasks')`).
- **Kiểu tệp theo danh sách cho phép** (đuôi tệp): tài liệu văn phòng, PDF, văn bản, ảnh, nén. Không có `.html`, `.svg`, `.js`, `.exe`… Tối đa **20 tệp mỗi việc**.
- **Tên lưu trên đĩa là chuỗi ngẫu nhiên**, không dùng tên người dùng gửi: không có đường nào để tên tệp trỏ ra ngoài thư mục. Tải về luôn kèm `Content-Disposition: attachment` (tên gốc, có dấu) và `X-Content-Type-Options: nosniff`, nên trình duyệt không mở tệp ngay trên origin của app.
- **Tên tệp tiếng Việt:** multer đọc tên theo latin1, phải giải mã lại sang UTF-8.
- **Xóa công việc / xóa dự án (force) thì xóa cả tệp.** Nhân bản việc hoặc dự án thì **không** chép tệp.
- **Nhật ký hoạt động:** ghi `UPLOAD_ATTACHMENT`, `DELETE_ATTACHMENT`.
- **Web tải về qua axios (blob)**, vì route cần header `Authorization`.
- **Mobile để sau.** Tải lên cần thêm thư viện native (`expo-document-picker`, `expo-file-system`). Ghi vào lộ trình.
  *Đã làm cùng ngày* (`5177a20`): thêm cả `expo-sharing` để mở/lưu tệp tải về. Tải về đi qua `apiClient`
  (dạng arraybuffer) chứ không đưa URL cho trình tải của hệ điều hành, để được làm mới token như mọi
  request khác. Quy tắc quyền tách ra `client/src/utils/attachmentRules.js`, mobile chép nguyên.
- `resultReport.attachments` giữ nguyên (vẫn nhận `{ name, url, size }` như cũ), không có giao diện.

## API

| Method | Route | |
|---|---|---|
| GET | `/api/tasks/:id/attachments` | Danh sách, mới nhất trước, kèm `uploadedBy { name }` |
| POST | `/api/tasks/:id/attachments` | multipart, trường `file`, một tệp mỗi lần → 201 |
| GET | `/api/tasks/:id/attachments/:attachmentId/download` | Nội dung tệp |
| DELETE | `/api/tasks/:id/attachments/:attachmentId` | |

Lỗi: không có tệp / sai đuôi → 400; quá 10 MB → 413; đã đủ 20 tệp → 400; tệp của việc khác → 404.

## Tasks

### Task 1: Server — lưu trữ, model, route
- [ ] Test trước (bộ `attachments`): tải lên → danh sách → tải về đúng byte và đúng tên có dấu; sai đuôi 400; quá 10 MB 413; người cùng công ty xem được; công ty khác 403; người khác không xóa được, người tải lên và quản lý dự án xóa được; dự án lưu trữ 409; `attachmentId` của việc khác 404; tệp trên đĩa mất sau khi xóa.
- [ ] `services/fileStorage.js`, `models/Attachment.js`, controller + route.
- [ ] Test runner đặt `UPLOAD_DIR` riêng; `.gitignore` bỏ `server/uploads`.

### Task 2: Server — dọn tệp khi xóa
- [ ] Test trước: xóa việc → tệp và bản ghi biến mất; xóa dự án `force` → tệp của mọi việc biến mất; nhân bản việc không chép tệp.

### Task 3: Web
- [ ] `attachmentService`; tab "Tệp" trong `TaskDetailDrawer`: chọn tệp, danh sách (tên, cỡ, người tải, lúc tải), tải về, xóa (chỉ hiện khi được phép), báo lỗi của server.
- [ ] Test component (vitest) và một bài e2e: tải lên, thấy trong danh sách, tải về, xóa.

### Task 4: Tài liệu
- [ ] API.md, CHANGELOG, COMPARISON_BASE_WEWORK 4.5, README (`UPLOAD_DIR`), lộ trình.

## Review Focus

1. Không đường nào đọc/ghi được ngoài `UPLOAD_DIR`: tên lưu ngẫu nhiên, `storageKey` không đến từ request.
2. Tệp tải về không chạy được trên origin của app (`attachment` + `nosniff`, không có `.html`/`.svg`).
3. Mọi route đều qua `guardTaskCompany`; `attachmentId` phải thuộc đúng `:id`.
4. Xóa việc/dự án không để lại tệp mồ côi trên đĩa.
