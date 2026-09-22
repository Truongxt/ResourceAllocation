# ⚖️ So sánh Base Wework với Resource Allocation Optimization (RAO)

> Báo cáo đối chiếu giữa **Base Wework** (app quản lý công việc của Base.vn) và **hệ thống RAO
> trong repo này**, nhằm trả lời một câu hỏi: *còn học được gì từ Base Wework?*
> Ngày lập: **2026-09-22**. Nhánh đối chiếu: `Mr.Tien`.

## 0. Phạm vi và cách làm

| Bên | Đối tượng cụ thể | Nguồn đối chiếu |
|-----|------------------|-----------------|
| **RAO** | Chính mã nguồn trong repo | Đọc code trực tiếp: 12 model Mongoose, 12 nhóm route, 13 thư mục page React, `src/services/`, `src/analytics/`, `src/middleware/` |
| **Base Wework** | Bản SaaS công khai | Tài liệu chính thức tại `help.base.vn`, chủ yếu là bài **Mục lục tính năng** và các bài con (xem [mục 8](#8-nguồn)) |

Ba điều phải nói trước, vì chúng quyết định cách đọc toàn bộ báo cáo:

1. **Mô tả về Base là theo tài liệu, không phải theo trải nghiệm.** Không có tài khoản Base
   thật để thao tác, nên những gì tài liệu không nói (thang điểm đánh giá, giới hạn số lượng,
   hành vi biên) thì báo cáo này không suy đoán. Chỗ nào tài liệu im lặng đều được ghi rõ.
2. **Hai tài liệu cũ trong repo đã lạc hậu, đừng đọc chúng để đối chiếu.**
   [FEATURES.md](./FEATURES.md) ghi "79/79 tính năng, 100%" nhưng không hề nhắc tới TaskGroup,
   RecurringTask, luồng đánh giá, bàn giao hàng loạt, import Excel, checklist, người theo dõi
   — tức là phần lớn việc đã làm trong tháng 9. [COMPARISON_JIRA.md](./COMPARISON_JIRA.md)
   (lập 2026-08-19) còn ghi RAO **không có** bình luận, tệp đính kèm và email; hai trong ba
   thứ đó nay đã có.
3. **RAO không đặt mục tiêu thay thế Base Wework.** Base là công cụ *điều hành công việc hằng
   ngày*; RAO là công cụ *lập kế hoạch và tối ưu hóa phân bổ nguồn lực*. Phần giao nhau khá
   rộng, nhưng lý do tồn tại của RAO nằm ở chỗ Base không có gì để đặt lên bàn cân — xem
   [mục 3](#3-rao-có-mà-base-wework-không-có).

---

## 1. Kết luận nhanh

**RAO đã bám mục lục tính năng của Base Wework rất sát.** Trong 6 nhóm tính năng Base liệt kê,
RAO phủ trọn 3 nhóm (Phân quyền, Nhóm công việc, phần lõi của Công việc) và phủ phần lớn 2
nhóm nữa. Nhiều chi tiết được port đúng tinh thần: 10 cờ phân quyền thao tác trong dự án,
SLA cho người đánh giá, lý do bắt buộc khi đánh dấu Thất bại, lịch sử gia hạn deadline.

**Khoảng trống còn lại tập trung vào 3 chỗ**, không rải đều:

- **Báo cáo kết quả theo con người** — RAO chỉ có báo cáo *tải*, chưa có báo cáo *kết quả*.
- **Khả năng tùy biến của một dự án** — không có trường dữ liệu tùy chỉnh, không có mẫu thật,
  không nhân bản, không đóng/mở.
- **Việc thường ngày của phòng ban không có chỗ để ở** — và điều này ảnh hưởng trực tiếp tới
  chất lượng đầu vào của thuật toán tối ưu, chứ không chỉ tới giao diện.

---

## 2. Đối chiếu theo đúng mục lục tính năng của Base Wework

Thang: **Đầy đủ** · **Một phần** · **Không có**

### I. Phân quyền

| Tính năng Base | RAO | Ở đâu trong code |
|----------------|-----|------------------|
| Phân quyền thao tác trong dự án/phòng ban | **Đầy đủ** | `Project.permissions` — 10 cờ, [Project.js](../server/src/models/Project.js); thực thi ở [taskAccess.js](../server/src/middleware/taskAccess.js) |
| Phân quyền tạo phòng ban / dự án | **Đầy đủ** | [CompanySetting.js](../server/src/models/CompanySetting.js) — `only_admin` / `all_members` |
| Phân quyền xem theo từng công việc | **Không có** | RAO chỉ có cờ cấp dự án `allowMembersViewAllTasks`; Base cho đặt quyền xem trên từng công việc |

### II. Department

| Tính năng Base | RAO | Ghi chú |
|----------------|-----|---------|
| Tạo Department làm tầng cha | **Đầy đủ** | [Department.js](../server/src/models/Department.js) + `Project.department` |
| Department nhiều cấp (cây) | **Không có** | Không có trường `parent`; cấu trúc hiện phẳng một tầng |

### III. Phòng ban / Dự án

| Tính năng Base | RAO | Ghi chú |
|----------------|-----|---------|
| Tạo dự án, thêm thành viên & quản lý | **Đầy đủ** | `POST /projects`, `/members` |
| Phân biệt **Phòng ban (team)** và **Dự án (project)** | **Không có** | `startDate`/`endDate` là `required` trên Project; phòng ban không chứa công việc — xem [4.3](#43-việc-thường-ngày-của-phòng-ban-không-có-chỗ-để-ở) |
| Cấu hình phân quyền trong dự án | **Đầy đủ** | `PATCH /projects/:id/permissions` |
| **Trường dữ liệu tùy chỉnh** | **Không có** | Xem [4.2](#42-trường-dữ-liệu-tùy-chỉnh-custom-field) |
| Thiết lập **mục tiêu** | **Không có** | RAO chỉ có `progress` % suy ra từ task |
| Cấu hình email theo dự án | **Không có** | Email bật/tắt toàn hệ thống, và chỉ gửi đúng một loại — [email.service.js:15](../server/src/services/email.service.js#L15) |
| **Nhân bản** dự án | **Không có** | Có `duplicateTask` nhưng không có `duplicateProject` |
| **Đóng / mở** dự án | **Không có** | `status` có `completed`/`cancelled` nhưng không có khái niệm đóng để rút khỏi bộ lọc |
| Dự án **mẫu** (template) | **Không có** | `Project.template` hiện chỉ là một `String`, không trỏ tới dự án mẫu nào |
| Chuyển đổi loại dự án ↔ phòng ban | **Không có** | Hệ quả của việc chưa tách hai loại |
| Xóa dự án | **Đầy đủ** | Chặn khi còn task, cần `?force=true` |

### IV. Nhóm công việc

| Tính năng Base | RAO |
|----------------|-----|
| Thêm / sửa / xóa nhóm | **Đầy đủ** |
| Sắp xếp thứ tự | **Đầy đủ** — `TaskGroup.order` |
| Đóng / mở nhóm | **Đầy đủ** — `TaskGroup.isOpen` |
| Gán **người đánh giá theo nhóm** | **Không có** — xem [4.7](#47-đánh-giá-theo-nhóm-công-việc) |

### V. Công việc

| Tính năng Base | RAO | Ghi chú |
|----------------|-----|---------|
| Tạo, sửa, xóa, đổi trạng thái | **Đầy đủ** | 6 trạng thái: `todo/in_progress/review/done/blocked/failed` |
| Công việc con (subtask) | **Đầy đủ** | `parentTask` + virtual `subtasks` |
| **Công việc lặp lại** | **Đầy đủ** | [RecurringTask.js](../server/src/models/RecurringTask.js) — ngày/tuần/tháng/quý/năm + `interval` + `daysOfWeek` |
| **Công việc phụ thuộc** | **Đầy đủ, hơn Base ở chỗ nói rõ loại** | 4 loại FS/SS/FF/SF trong [taskDependency.service.js](../server/src/services/taskDependency.service.js) |
| Giao việc chéo dự án | **Đầy đủ** | Gán người ngoài dự án thì họ được tự thêm vào thành viên — [task.controller.js:382](../server/src/controllers/task.controller.js#L382) |
| **Nhiều người phụ trách** | **Không có** | Cố ý — xem [mục 5](#5-một-thứ-không-nên-sao-chép) |
| Bàn giao (delegation) | **Đầy đủ**, kể cả hàng loạt | `POST /tasks/bulk-reassign` |
| Cập nhật kết quả công việc | **Đầy đủ** | `resultReport` — tóm tắt, link, giờ thực tế |
| Checklist | **Đầy đủ** | |
| Người theo dõi | **Đầy đủ** | Trần 50 người, đặt ở schema nên mọi đường ghi đều bị chặn như nhau |
| Nhân bản / chuyển nhóm / xóa | **Đầy đủ** | `POST /:id/duplicate`, `/:id/move` |
| **Thời hạn theo giờ** | **Đầy đủ** | `showTime` bật ở 5 màn nhập liệu |
| **Đánh giá trước khi hoàn thành + SLA** | **Đầy đủ** | `Project.reviewConfig` + `Task.reviewers`, màn hình chờ đánh giá riêng |
| **Đánh dấu Thất bại** | **Đầy đủ** | Bật theo từng dự án, lý do bắt buộc |
| Điều chỉnh deadline có vết | **Đầy đủ, hơn Base** | `deadlineHistory` lưu ngày cũ/mới, người sửa, lý do |
| Thao tác hàng loạt | **Một phần** | Chỉ có bàn giao hàng loạt; Base còn sửa/xóa/chuyển nhóm hàng loạt |
| **Nhập Excel** | **Một phần** | Có mẫu + xem trước + nhập; **thiếu cột phụ thuộc** mà Base hỗ trợ — [excelTaskImport.service.js](../server/src/services/excelTaskImport.service.js) |
| **Xuất Excel / xuất Gantt** | **Không có** | Nhập được nhưng không lấy ra được — xem [4.6](#46-xuất-dữ-liệu-công-việc) |
| **Tệp đính kèm thật** | **Không có** | Xem [4.5](#45-đính-kèm-tệp-thật) |
| Đồng bộ Google Calendar | **Không có** | RAO có lịch nội bộ, không xuất ra ngoài |
| Nhắc nhở (Reminders) | **Đầy đủ** | `GET /tasks/reminders` + `RemindersDrawer` |

### VI. Báo cáo

| Tính năng Base | RAO | Ghi chú |
|----------------|-----|---------|
| Lọc việc theo cấp dưới trực tiếp | **Đầy đủ** | `scope=subordinates` — [task.controller.js:114](../server/src/controllers/task.controller.js#L114) |
| **Báo cáo kết quả theo từng người** | **Không có** | Xem [4.1](#41-báo-cáo-kết-quả-theo-con-người) |
| Báo cáo toàn hệ thống | **Một phần** | Có, nhưng là báo cáo *tải* chứ không phải *kết quả* |
| Xuất báo cáo | **Đầy đủ** | CSV UTF-8 + in PDF |

---

## 3. RAO có mà Base Wework không có

Đây là phần nên giữ và làm nổi bật, vì nó là lý do RAO tồn tại:

1. **Tối ưu hóa phân bổ tự động** — Genetic Algorithm, CSP solver, và bản lai CSP→GA; có so
   sánh song song 2–4 phương án trên 9 chỉ số. Base không có gì tương đương: người quản lý tự
   quyết giao việc cho ai.
2. **Critical Path (CPM)** trên Gantt, kèm cảnh báo phụ thuộc bị vi phạm vẽ đỏ đứt nét.
3. **Skill matrix có trọng số** và điểm khớp kỹ năng dùng làm ràng buộc phân công.
4. **Năng lực và quá tải ở mức từng người** — FTE, `maxCapacity`, lịch nghỉ trừ vào capacity
   theo ngày, histogram, chỉ số burnout, xu hướng tải theo thời gian.
5. **Bảo mật phiên đăng nhập** — refresh token xoay vòng, phát hiện tái sử dụng, thu hồi cả
   chuỗi; mức này cao hơn thứ một app quản lý công việc thông thường cần tới.

---

## 4. Tám khoảng trống, xếp theo mức đáng làm

### 4.1. Báo cáo kết quả theo con người

- **Base làm gì**: báo cáo 3 tầng — cá nhân, cấp dưới trực tiếp của quản lý, toàn hệ thống.
- **RAO đang ở đâu**: dữ liệu đã đủ và bộ lọc đã có. `User.manager` tồn tại kèm chống vòng
  ([auth.controller.js:684](../server/src/controllers/auth.controller.js#L684)), danh sách việc
  đã lọc được theo `scope=subordinates`. Nhưng
  [analytics.controller.js](../server/src/controllers/analytics.controller.js) **không dùng
  `manager` lần nào**, và `getTaskAnalytics` chỉ gom theo `status` và `priority`.
  [Reports.jsx](../client/src/pages/reports/Reports.jsx) có đúng 4 tab: utilization, phòng ban,
  dự án, xu hướng — toàn bộ là báo cáo **tải**.
- **Vì sao đáng làm nhất**: câu hỏi đầu tiên của mọi quản lý là *"tháng này ai làm được việc?"*,
  và RAO hiện không trả lời được, dù đã lưu sẵn `completedAt`, `endDate`, `failedAt`,
  `reviewRequestedAt` trong [Task.js](../server/src/models/Task.js).
- **Phác thảo**: `GET /api/analytics/performance?scope=me|subordinates|all` gom theo `assignee`:
  tổng việc, hoàn thành đúng hạn (`completedAt <= endDate`), trễ hạn, thất bại, đang chờ đánh
  giá, số lần gia hạn deadline. Dùng `completedAt` chứ **không** dùng `reviewedAt` — người thực
  hiện không chịu trách nhiệm cho việc người đánh giá duyệt chậm (quy ước này đã được ghi sẵn
  trong comment của `Task.js`, chỉ cần tôn trọng nó khi tính).

### 4.2. Trường dữ liệu tùy chỉnh (custom field)

- **Base làm gì**: định nghĩa theo từng dự án/phòng ban, với các kiểu số nguyên, số thập phân,
  văn bản ngắn, văn bản đoạn, ngày, ngày giờ, một lựa chọn, nhiều lựa chọn, checkbox, tập tin,
  tiêu đề, bảng, và **công thức** (có hàm kiểu Excel, cộng tổng được các cột số). Có thể đặt
  bắt buộc. Base còn có **một bộ riêng cho Kết quả công việc**, để người làm biết trước phải
  nộp cái gì.
- **RAO đang ở đâu**: không có gì — `grep customField` trên toàn bộ `server/src` và `client/src`
  trả về rỗng. Mọi dự án dùng chung một schema cứng.
- **Vì sao đáng**: đây là thứ khiến một app quản lý việc dùng được cho phòng Marketing lẫn
  phòng Kỹ thuật mà không phải sửa code. Thiếu nó thì mỗi nhu cầu mới là một lần đổi schema.
- **Phác thảo**: `Project.customFields[]` giữ định nghĩa, `Task.customValues` (Map) giữ giá trị,
  và một bộ thứ hai cho `resultReport` — tách đôi đúng như Base. Nên làm **sớm**: nó lan sang
  form tạo/sửa task, mẫu Excel nhập, bộ lọc và file CSV xuất ra; làm sau thì phải sửa cả bốn chỗ.
  Kiểu **công thức** nên để lại sau cùng, nó là một trình đánh giá biểu thức chứ không phải một
  trường dữ liệu.

### 4.3. Việc thường ngày của phòng ban không có chỗ để ở

- **Base làm gì**: tách **Phòng ban (team)** chạy vô thời hạn khỏi **Dự án (project)** có ngày
  kết thúc. Cả hai đều chứa nhóm công việc và công việc, và chuyển đổi qua lại được.
- **RAO đang ở đâu**: `Project.startDate` và `endDate` đều `required`; `Department` có gom dự án
  (`Project.department`) nhưng **không chứa công việc**.
- **Vì sao đáng — và vì sao nó không chỉ là chuyện giao diện**: công việc vận hành thường xuyên
  (trực hệ thống, hỗ trợ khách, họp định kỳ) ăn capacity thật của nhân sự, nhưng hiện không có
  chỗ nào để nhập. Nghĩa là workload đầu vào của thuật toán **bị tính thiếu một cách có hệ
  thống**, và phương án "tối ưu" sinh ra dựa trên năng lực rảnh cao hơn thực tế. Đây là khoảng
  trống duy nhất trong danh sách này chạm thẳng vào chất lượng thuật toán.
- **Phác thảo**: rẻ nhất là thêm `Project.kind: 'project' | 'team'`, bỏ `required` của
  `startDate`/`endDate` khi `kind === 'team'`, và cho tầng tính capacity đọc cả hai loại. Không
  cần tách model mới.

### 4.4. Vòng đời dự án: đóng/mở, nhân bản, mẫu thật

- **Base làm gì**: đóng/mở phòng ban-dự án, nhân bản, quản lý danh sách dự án mẫu, tạo mới từ mẫu.
- **RAO đang ở đâu**: `Project.template` là một `String` không trỏ tới đâu; không có `isArchived`,
  không có `duplicateProject`.
- **Vì sao đáng**: dự án xong không rút được khỏi mọi bộ lọc thì danh sách phình mãi; đội chạy
  dự án lặp đi lặp lại phải gõ tay 40 công việc mỗi lần.
- **Phác thảo**: `Project.isArchived` + `isTemplate`; nhân bản dự án chủ yếu là ghép lại thứ đã
  có — `duplicateTask` và `TaskGroup` — nên chi phí thấp hơn vẻ ngoài của nó.

### 4.5. Đính kèm tệp thật

- **RAO đang ở đâu**: `resultReport.attachments` lưu `{name, url, size}`, nhưng `multer` trong
  [task.routes.js:54](../server/src/routes/task.routes.js#L54) chỉ phục vụ import Excel — không
  có đường nào để tải tệp lên.
- **Vì sao đáng**: đây là khoảng cách giữa "có trường trong DB" và "dùng được". Người dùng nhìn
  thấy mục Đính kèm sẽ tưởng đính kèm được.
- **Phác thảo**: hoặc làm route upload thật (đĩa hoặc S3, kèm giới hạn dung lượng và kiểu tệp),
  hoặc quyết định chỉ nhận link ngoài — nhưng khi đó phải ghi rõ trên giao diện.

### 4.6. Xuất dữ liệu công việc

- **Base làm gì**: xuất bảng, xuất Gantt, xuất nhiều phòng ban một lượt.
- **RAO đang ở đâu**: có nhập Excel, **không có xuất**. CSV chỉ có ở Projects, Resources và
  Reports. Nhập được mà không lấy ra được là một sự bất đối xứng khó biện hộ với người dùng.
- **Phác thảo**: dùng lại đúng bộ tiện ích CSV đã có ở ba màn kia cho màn Công việc; xuất Gantt
  thì `window.print()` đã dựng sẵn cho Reports, áp cùng cách.

### 4.7. Đánh giá theo nhóm công việc

- **Base làm gì**: ngoài cấp dự án, còn gán người đánh giá cho **từng nhóm công việc** bằng cách
  tag @username trong chế độ xem bảng.
- **RAO đang ở đâu**: có 2 tầng — `Project.reviewConfig` và `Task.reviewers` — thiếu tầng giữa.
- **Phác thảo**: thêm `TaskGroup.reviewers`, thứ tự ưu tiên `task > group > project`. Vì
  `TaskGroup` đã có, đây gần như chỉ là một trường và một nhánh `if`.

### 4.8. Hai việc nhỏ nhưng lộ ra ngay khi dùng

- **Thông báo chưa phủ hết luồng**: enum `Notification.type` nay có **15** giá trị, gồm cả ba
  giá trị cho luồng đánh giá — bổ sung ngày 2026-09-22, xem [TESTING.md](./TESTING.md) mục
  "Lỗi tìm ra khi viết tài liệu". Trước đó controller gửi những giá trị không có trong enum,
  nên `Notification.create` ném `ValidationError` và thông báo **mất hẳn** chứ không rơi về
  `system`. Vẫn còn thiếu: **đánh dấu Thất bại và đổi deadline không gửi thông báo nào** —
  chỗ đó thiếu lời gọi `sendNotification`, không phải thiếu giá trị enum.
- **Email quá hẹp**: `EMAILED_TYPES` chỉ chứa `task_assigned`
  ([email.service.js:15](../server/src/services/email.service.js#L15)), và bật/tắt ở mức toàn hệ
  thống. Base cho cấu hình theo từng dự án. Quyết định "chỉ gửi một loại để hộp thư không ngập"
  là đúng, nhưng nên nâng thành tùy chọn theo dự án thay vì một hằng số trong code.

---

## 5. Một thứ không nên sao chép

**Nhiều người phụ trách một công việc.** Base cho phép, RAO thì không — và nên giữ nguyên.

Bài toán phân bổ của RAO dựa trên giả định một việc thuộc về một người: capacity trừ trọn gói,
điểm khớp kỹ năng tính trên một ứng viên, ràng buộc H4 cấm giao hai việc phụ thuộc nhau cho
cùng một người. Cho nhiều người phụ trách nghĩa là phải chia tỉ lệ capacity, sửa hàm fitness,
và sửa cả bộ ràng buộc — đổi lấy một tiện lợi mà nghiệp vụ hiện tại chưa đòi.

Nếu vẫn cần, đường vòng rẻ hơn: thêm `collaborators[]` **không** tính vào bài toán tối ưu, giữ
`assignee` là người chịu trách nhiệm duy nhất.

---

## 6. Lộ trình đề xuất

| Thứ tự | Hạng mục | Vì sao đặt ở đây |
|--------|----------|------------------|
| 1 | [4.1](#41-báo-cáo-kết-quả-theo-con-người) Báo cáo kết quả theo người | Dữ liệu và bộ lọc đã có sẵn — chi phí thấp nhất, giá trị thấy ngay |
| 2 | [4.3](#43-việc-thường-ngày-của-phòng-ban-không-có-chỗ-để-ở) Công việc cấp phòng ban | Thứ duy nhất ảnh hưởng tới **chất lượng thuật toán**, không chỉ giao diện |
| 3 | [4.2](#42-trường-dữ-liệu-tùy-chỉnh-custom-field) Trường tùy chỉnh | Càng làm muộn càng đắt: lan sang form, Excel, bộ lọc, CSV |
| 4 | [4.6](#46-xuất-dữ-liệu-công-việc) Xuất dữ liệu + [4.7](#47-đánh-giá-theo-nhóm-công-việc) Đánh giá theo nhóm + [4.8](#48-hai-việc-nhỏ-nhưng-lộ-ra-ngay-khi-dùng) | Đều nhỏ, đều dùng lại thứ đã có |
| 5 | [4.4](#44-vòng-đời-dự-án-đóngmở-nhân-bản-mẫu-thật) Vòng đời dự án + [4.5](#45-đính-kèm-tệp-thật) Đính kèm | Cần quyết định hạ tầng lưu trữ trước khi code |

Ngoài ra: **cập nhật lại [FEATURES.md](./FEATURES.md)** — nó đang mô tả một phiên bản cũ hơn
code khá nhiều, và mọi báo cáo dựa vào nó sẽ sai theo.

---

## 7. Giới hạn của chính bản so sánh này

- **Phía Base là tài liệu, không phải sản phẩm.** Không có tài khoản để kiểm chứng; tính năng
  có thể đã đổi sau ngày tài liệu được viết. Những chỗ tài liệu không nói rõ — thang điểm đánh
  giá công việc, giới hạn số lượng, hành vi khi xung đột — đều bị bỏ trống thay vì đoán.
- **Phía RAO là code, không phải trải nghiệm.** Báo cáo khẳng định một tính năng "có" dựa trên
  model, route và component đọc được; nó không khẳng định tính năng đó chạy mượt hay dễ dùng.
- **Chỉ so phạm vi Wework.** Base là một hệ sinh thái nhiều app (Request, Workflow, Timesheet…);
  vài thứ RAO thiếu so với "Base nói chung" thực ra nằm ở app khác chứ không phải Wework.

---

## 8. Nguồn

- [Base Wework: Giới thiệu về app và Mục lục tính năng](https://help.base.vn/support/solutions/articles/63000277954)
- [Thư mục tài liệu Base Wework](https://help.base.vn/support/solutions/folders/63000232791)
- [Thiết lập trường dữ liệu tùy chỉnh trong dự án/phòng ban](https://help.base.vn/support/solutions/articles/63000252575)
- [Thiết lập trường dữ liệu tùy chỉnh cho Kết quả công việc](https://help.base.vn/support/solutions/articles/63000286432)
- [Đánh giá công việc theo nhóm, dự án/phòng ban](https://help.base.vn/support/solutions/articles/63000276270)
- [Thiết lập tính năng đánh giá (review) trước khi hoàn thành](https://help.base.vn/support/solutions/articles/63000252574)
- [Hướng dẫn xem Báo cáo công việc của cá nhân](https://help.base.vn/support/solutions/articles/63000274992)
