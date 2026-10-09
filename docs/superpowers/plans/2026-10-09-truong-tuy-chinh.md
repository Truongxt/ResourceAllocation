# Trường dữ liệu tùy chỉnh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mỗi dự án tự khai thêm trường cho công việc của mình (ví dụ "Kênh", "Ngân sách", "Ngày phát hành") mà không phải sửa schema. Giá trị đi theo công việc qua form, chi tiết, bộ lọc, xuất CSV và nhập Excel.

**Spec:** [COMPARISON_BASE_WEWORK.md mục 4.2](../../COMPARISON_BASE_WEWORK.md#42-trường-dữ-liệu-tùy-chỉnh-custom-field), lộ trình: [2026-10-07-lo-trinh-hoan-thien.md](./2026-10-07-lo-trinh-hoan-thien.md) (GĐ7)

## Quyết định đã chốt (2026-10-09)

1. **Bốn kiểu cho bản đầu:** văn bản (`text`), số (`number`), ngày (`date`), danh sách chọn một (`select`). Kiểu công thức để sau.

## Quyết định suy ra (không cần hỏi)

- **Định nghĩa theo dự án:** `Project.customFields[]` = `{ key, name, type, options, required, order }`. Tối đa **20 trường** mỗi dự án, **50 lựa chọn** mỗi trường, tên không trùng nhau trong một dự án.
- **`key` do server sinh** (`f_` + 8 ký tự ngẫu nhiên) và không bao giờ đổi. Giá trị lưu theo `key` chứ không theo tên hay `_id` của subdocument: đổi tên trường không mất giá trị, nhân bản dự án chép nguyên được cả định nghĩa lẫn giá trị.
- **Giá trị:** `Task.customValues` (Map `key → giá trị`). Văn bản ≤ 1000 ký tự, số hữu hạn, ngày lưu kiểu `Date`, chọn một phải nằm trong `options`. Rỗng / `null` = xóa giá trị.
- **Ai sửa định nghĩa:** admin/Owner hoặc quản lý của dự án — cùng chốt với Phân quyền thao tác. `PUT /api/projects/:id/custom-fields` thay cả danh sách một lần. Dự án lưu trữ → 409.
- **Không đổi kiểu một trường đã có** (400): giá trị cũ sẽ sai nghĩa. Muốn đổi thì xóa rồi tạo trường mới.
- **Xóa trường** thì xóa giá trị của nó trên mọi việc của dự án. **Bỏ một lựa chọn** thì xóa giá trị đang là lựa chọn đó.
- **Bắt buộc** được kiểm khi tạo việc (form, API, nhập Excel) và khi một lần sửa **có gửi** `customValues`. Sửa việc mà không đụng tới `customValues` (đổi trạng thái, kéo Kanban…) thì không bị chặn, để thêm một trường bắt buộc vào dự án đang chạy không khóa cứng mọi việc cũ.
- **Chuyển việc sang dự án khác** thì bỏ giá trị (định nghĩa thuộc dự án cũ). **Nhân bản việc** trong cùng dự án thì giữ giá trị. **Nhân bản dự án / tạo từ mẫu** chép định nghĩa và giá trị.
- **Bộ lọc:** chỉ cho trường chọn một, khớp đúng giá trị: `GET /tasks?cf_<key>=<lựa chọn>`. `key` phải đúng dạng mới được ghép vào truy vấn.
- **Xuất CSV:** thêm một cột cho mỗi **tên** trường của các dự án có việc trong file (trường cùng tên ở nhiều dự án dồn chung một cột).
- **Nhập Excel:** cột thứ 9 trở đi có tiêu đề trùng tên trường của dự án đích thì là giá trị trường đó. Kiểm hết mọi dòng trước khi tạo việc nào; sai một dòng thì báo số dòng, không tạo gì. Mẫu tải về kèm sẵn các cột của dự án khi có `?project=`.
- **Mobile:** chỉ hiển thị giá trị (đọc) trong chi tiết công việc. Định dạng giá trị dùng chung `customFields.js` của web, chép nguyên.
- **Kết quả công việc** (bộ trường thứ hai cho `resultReport` như Base) để sau.

## API

| Method | Route | |
|---|---|---|
| PUT | `/api/projects/:id/custom-fields` | Body `{ fields: [...] }`, thay cả danh sách. Trả về dự án |
| POST/PUT | `/api/tasks`, `/api/tasks/:id` | Thêm `customValues: { [key]: value }` |
| GET | `/api/tasks?cf_<key>=<giá trị>` | Lọc theo trường chọn một |
| GET | `/api/tasks/excel/template?project=<id>` | Mẫu kèm cột trường tùy chỉnh |

## Tasks

### Task 1: Server — định nghĩa và giá trị
- [ ] Test trước (bộ `custom-fields`): khai trường; sinh `key`; tên trùng / kiểu lạ / chọn một không có lựa chọn / quá 20 trường → 400; đổi kiểu → 400; người không quản lý dự án → 403; dự án lưu trữ → 409. Tạo việc với giá trị đúng; sai kiểu / ngoài lựa chọn / `key` lạ → 400; thiếu trường bắt buộc khi tạo → 400; sửa không gửi `customValues` thì không bị chặn. Đổi tên trường giữ giá trị; xóa trường / bỏ lựa chọn thì giá trị biến mất. Lọc `cf_`. Chuyển dự án bỏ giá trị; nhân bản việc giữ; nhân bản dự án chép cả hai.
- [ ] `services/customFields.service.js`, `Project.customFields`, `Task.customValues`, route, gắn vào tạo/sửa/chuyển/nhân bản/lọc.

### Task 2: Server — Excel
- [ ] Test trước: mẫu có cột trường của dự án; nhập đọc đúng cột theo tên; giá trị sai hoặc thiếu trường bắt buộc → 400 kèm số dòng, không tạo việc nào.

### Task 3: Web
- [ ] Tab "Trường tùy chỉnh" ở chi tiết dự án (thêm, sửa tên, bắt buộc, lựa chọn, xóa, đổi thứ tự).
- [ ] Form tạo/sửa việc hiện ô theo dự án đang chọn; chi tiết việc hiện giá trị; bộ lọc chọn một khi đang lọc một dự án; cột CSV; mẫu Excel theo dự án.
- [ ] Test component, một bài e2e: khai trường → tạo việc có giá trị → thấy trong chi tiết → lọc ra đúng việc.

### Task 4: Mobile
- [ ] Chi tiết công việc hiện giá trị trường tùy chỉnh (chỉ đọc), `customFields.js` chép từ web, test so hai bản.

### Task 5: Tài liệu
- [ ] API.md, DATABASE.md, CHANGELOG, COMPARISON 4.2, FEATURES, lộ trình.

## Review Focus

1. `key` từ request không bao giờ được ghép vào đường dẫn truy vấn Mongo khi chưa khớp `^f_[a-z0-9]{8}$`.
2. Không đường ghi nào (tạo, sửa, nhập Excel) lưu được giá trị sai kiểu hoặc ngoài lựa chọn.
3. Xóa trường / bỏ lựa chọn / chuyển dự án không để lại giá trị mồ côi.
