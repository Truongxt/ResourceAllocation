# ⚖️ So sánh Jira với Resource Allocation Optimization (RAO)

> Báo cáo đối chiếu năng lực giữa **Jira Software Cloud** và **hệ thống RAO trong repo này**.
> Ngày lập: **2026-08-19**.

## 0. Phạm vi và cách làm

| Bên | Đối tượng cụ thể | Nguồn đối chiếu |
|-----|------------------|-----------------|
| **RAO** | Chính mã nguồn trong repo, nhánh `Mr.Tien` | Đọc code: 8 model Mongoose, 9 nhóm route (53 endpoint), 12 page React, `src/algorithms/`, `src/analytics/`, 8 bộ kiểm thử. Trạng thái tính năng lấy từ [FEATURES.md](./FEATURES.md) — tài liệu đó đã được đối chiếu với code |
| **Jira** | **Jira Software Cloud bản gốc, không cài thêm app** — có ghi rõ khi một năng lực chỉ đạt được ở gói Premium hoặc phải mua app trên Marketplace | Tài liệu công khai của Atlassian và các bài phân tích công khai (xem [mục 8](#8-nguồn-tham-khảo)) |

Hai điều cần nói trước, vì chúng quyết định cách đọc toàn bộ báo cáo:

1. **Đây không phải hai sản phẩm cùng hạng mục.** Jira là nền tảng *theo dõi và thực thi*
   công việc (issue tracking + quy trình agile + hệ sinh thái). RAO là công cụ *lập kế hoạch
   và tối ưu hóa phân bổ nguồn lực*. Phần giao nhau — dự án, công việc, bảng Kanban, timeline,
   dashboard — chỉ là một phần của mỗi bên.
2. **So với "Jira gốc" khác hẳn so với "Jira + app".** Hầu hết ưu thế của RAO ở mục 4 đều có
   app trên Marketplace lấp được (Tempo, ActivityTimeline, Planyway, BigPicture…). Ranh giới
   này được nói thẳng ở [mục 7](#7-giới-hạn-của-chính-bản-so-sánh-này).

---

## 1. Kết luận nhanh

**RAO trả lời được câu hỏi mà Jira gốc không trả lời:** *"với năng lực, kỹ năng và lịch nghỉ
hiện có của từng người, nên giao việc nào cho ai?"* — và trả lời bằng thuật toán chứ không
bằng cảm tính. Jira gốc lập kế hoạch năng lực **ở mức đội và sprint**, không ở mức từng người,
không biết kỹ năng, không biết ngày nghỉ, và không tự sinh phương án phân công.

**Jira hơn RAO ở mọi thứ quanh việc dùng thật hằng ngày:** quy trình tùy biến, cộng tác
(bình luận, tệp đính kèm, mention), tìm kiếm JQL, tự động hóa, tích hợp, mobile, SSO, và
việc vận hành do Atlassian gánh. RAO còn thiếu ba thứ ảnh hưởng trực tiếp tới việc dùng thật:
**bình luận, tệp đính kèm, và thông báo email**.

**Vì vậy chúng bổ sung cho nhau hơn là thay thế nhau.** Mô hình hợp lý nhất là Jira làm hệ
ghi nhận công việc, RAO làm lớp lập kế hoạch nguồn lực đọc dữ liệu từ Jira — chi tiết ở
[mục 6](#6-nên-dùng-cái-nào--và-mô-hình-kết-hợp).

---

## 2. Bảng điểm theo 9 nhóm năng lực

Thang: **Đầy đủ** · **Một phần** · **Cần app / Premium** · **Không có**

| # | Nhóm năng lực | Jira gốc | RAO | Bên mạnh hơn |
|---|---------------|----------|-----|--------------|
| 1 | Quản lý công việc & quy trình | Đầy đủ | Một phần | **Jira** — cách biệt lớn |
| 2 | Cộng tác trong công việc | Đầy đủ | Không có | **Jira** — cách biệt lớn |
| 3 | Lập kế hoạch & lịch trình | Một phần | Đầy đủ | **RAO** |
| 4 | Nguồn lực, năng lực & kỹ năng | Một phần (mức đội) | Đầy đủ (mức cá nhân) | **RAO** — cách biệt lớn |
| 5 | Tối ưu hóa phân bổ tự động | Không có | Đầy đủ | **RAO** — Jira không có đối trọng |
| 6 | Phân tích & báo cáo | Đầy đủ (nghiêng agile) | Đầy đủ (nghiêng nguồn lực) | Ngang, khác trọng tâm |
| 7 | Tìm kiếm, tự động hóa & tích hợp | Đầy đủ | Không có | **Jira** — cách biệt lớn |
| 8 | Quản trị & bảo mật | Đầy đủ | Một phần | **Jira** |
| 9 | Triển khai, chi phí & vận hành | SaaS, trả theo người | Tự host, chi phí gần như cố định | Tùy quy mô — xem mục 3.9 |

RAO thắng 3 nhóm, Jira thắng 5, 1 nhóm ngang. Nhưng **nhóm 5 là nhóm Jira không có gì để
đặt lên bàn cân**, và đó cũng chính là lý do RAO tồn tại.

---

## 3. So sánh chi tiết

### 3.1 Quản lý công việc & quy trình

| Năng lực | Jira gốc | RAO |
|----------|----------|-----|
| Kiểu công việc | Epic / Story / Task / Bug / Sub-task, thêm kiểu tùy ý (gói trả phí) | **Một kiểu duy nhất**: `Task`. Không có epic, không có sub-task |
| Trạng thái & quy trình | Workflow tùy biến: trạng thái, chuyển tiếp, điều kiện, validator, post-function theo từng dự án | 5 trạng thái **cố định trong code**: `todo · in_progress · review · done · blocked` ([Task.js:23](../server/src/models/Task.js#L23)) |
| Trường dữ liệu | Custom field không giới hạn, screen scheme, field config | Schema cố định. Muốn thêm trường phải sửa model + UI |
| Bảng Kanban | Có, cấu hình cột/swimlane/WIP limit | Có, 5 cột cố định, kéo–thả đổi trạng thái, cập nhật lạc quan |
| Scrum: sprint, backlog, velocity | Đầy đủ | **Không có** |
| Phát hành / version | Có (release, version report) | Không có |
| Người thực hiện | 1 assignee + watcher; nhiều người qua trường tùy biến | **Đúng 1 assignee** ([Task.js:53](../server/src/models/Task.js#L53)) — ràng buộc này ăn sâu vào cả solver |
| Phụ thuộc công việc | Issue link (blocks, relates…), không tính đường tới hạn | `dependencies[]` + **kiểm tra vòng lặp trực tiếp và gián tiếp ở server**, chặn khác dự án, chặn tự phụ thuộc |
| Ước tính / giờ thực tế | Original estimate, remaining, time spent, work log theo từng lần ghi | `estimatedHours` / `actualHours` — **hai con số, không có nhật ký từng lần ghi giờ** |
| Ưu tiên | Có, tùy biến | 4 mức cố định |

**Nhận xét.** Đây là sân nhà của Jira và khoảng cách là khoảng cách về *bản chất*: Jira là một
cỗ máy quy trình cấu hình được, RAO là một mô hình dữ liệu cố định phục vụ bài toán tối ưu.
Đổi lại, RAO chặt hơn Jira ở đúng một chỗ: **kiểm tra tính hợp lệ của đồ thị phụ thuộc**.

### 3.2 Cộng tác trong công việc

| Năng lực | Jira gốc | RAO |
|----------|----------|-----|
| Bình luận, @mention | Đầy đủ | **Không có** |
| Tệp đính kèm | Đầy đủ (2 GB ở gói Free) | **Không có** |
| Theo dõi (watcher), lịch sử thay đổi từng trường | Đầy đủ | Không có watcher; có `ActivityLog` ở mức hệ thống |
| Thông báo trong ứng dụng | Có | **Có, realtime** — Socket.IO xác thực JWT, room `user:<id>`, Notification Center + toast |
| Thông báo email | Có | **Không có** (mục 10.6 trong backlog) |
| Wiki / tài liệu kèm theo | Có qua Confluence | Không có |

**Nhận xét.** Đây là khoảng trống nghiêm trọng nhất của RAO nếu định đưa vào dùng thật.
Một hệ quản lý công việc mà không bình luận được, không gắn được tệp, và không gửi email khi
ai đó được giao việc thì người dùng sẽ quay về Slack và email — và dữ liệu thật sẽ nằm ngoài
hệ thống. Điểm sáng: **thông báo realtime của RAO nhạy hơn Jira**, vì Jira đẩy qua email và
polling nhiều hơn là WebSocket.

### 3.3 Lập kế hoạch & lịch trình

| Năng lực | Jira gốc | RAO |
|----------|----------|-----|
| Timeline / roadmap | Có (Timeline theo dự án); nhiều dự án cần **Plans, gói Premium** | Có, toàn hệ thống, lọc theo dự án |
| Kéo–thả đổi lịch | Có trên Timeline | Có: kéo thanh để dời, kéo hai mép để đổi ngày; snap theo ngày, hoàn tác nếu server từ chối |
| Mũi tên phụ thuộc trên biểu đồ | Có ở Plans | Có: lớp SVG, đường Bézier; **phụ thuộc bị vi phạm vẽ đỏ đứt nét kèm cảnh báo** |
| **Đường tới hạn (Critical Path)** | **Không có** — phải mua app Gantt | **Có**: CPM đầy đủ, lượt xuôi/ngược, slack = 0, phát hiện chu trình ([gantt.js](../client/src/utils/gantt.js), 24 assertion) |
| Mốc (milestone) | Có qua version / issue type | Có: công việc thời lượng 0 vẽ thành hình thoi |
| Zoom Ngày / Tuần / Tháng | Có (mức khác) | Có, 3 mức |
| Lane theo nhân sự ("ai làm gì khi nào") | Không có ở bản gốc | Có: gộp theo nhân sự hoặc dự án, hàng nhóm thu gọn được |
| Xuất ảnh / PDF | Không ở bản gốc | Có (`window.print()` + `@media print`) |

**Nhận xét.** RAO thắng nhóm này, và thắng ở đúng thứ Jira nổi tiếng là không có: **đường tới
hạn**. Giới hạn thật của RAO đã ghi trong tài liệu: CPM và mũi tên chỉ tính trên tập công việc
đang tải (tối đa 100, có thể đang bị lọc), phụ thuộc trỏ ra ngoài tập đó bị bỏ qua im lặng.

### 3.4 Nguồn lực, năng lực & kỹ năng

| Năng lực | Jira gốc | RAO |
|----------|----------|-----|
| Năng lực (capacity) | **Mức đội và sprint**, ở gói Premium (Plans). Không đặt được năng lực cho từng người | **Mức từng người**: `maxCapacity` giờ/tuần × `fte` ([Resource.js:45-55](../server/src/models/Resource.js#L45-L55)) |
| Ma trận kỹ năng | **Không có** | **Có**: `skills[{name, level 1-4, yearsOfExperience}]`, có editor, tìm nhân sự theo `?skill=&skillLevel=` (lọc `>=`) |
| Lịch nghỉ / ngày không rảnh | Không có ở bản gốc | **Có**: `unavailablePeriods[]`, chặn ngày đảo ngược và kỳ nghỉ chồng nhau; bảng nhân sự hiện tag "Đang nghỉ tới…" |
| Tỷ lệ sử dụng (utilization) | Gadget "workload pie chart" đếm **số issue**, không phải giờ so với năng lực | `utilizationRate` = `currentWorkload / (maxCapacity × fte)`, thanh utilization trên mọi bảng |
| Chi phí nhân sự | Không có | `hourlyRate` — và **chi phí là một trong 4 mục tiêu của hàm fitness** |
| Phân bổ % vào dự án | Không có | `members[].allocation` 0–100% |
| Phòng ban | Qua group / team | Module riêng: CRUD, chặn xóa khi còn nhân sự, ràng buộc nhân sự phải thuộc phòng ban hợp lệ |
| Ngân sách dự án | Không có | `Project.budget` |

**Nhận xét.** Đây là cách biệt rõ nhất của báo cáo và nó không phải chuyện cấu hình: Jira Plans
**chỉ lập kế hoạch năng lực ở mức đội**, kể cả gói Premium và Enterprise. Không có chỗ để khai
báo "người này 0.6 FTE, giỏi React mức 4, nghỉ phép hai tuần tháng sau". RAO khai báo được cả
ba, và cả ba đều đi thẳng vào ràng buộc của solver.

### 3.5 Tối ưu hóa phân bổ tự động

| Năng lực | Jira gốc | RAO |
|----------|----------|-----|
| Tự sinh phương án phân công | **Không có** | **Có**, 3 chế độ |
| Genetic Algorithm | — | Tournament (k=5), uniform crossover, random mutation, elitism 5% |
| CSP Solver | — | Backtracking + **AC-3** + MRV + LCV |
| Hybrid | — | CSP lọc miền giá trị → GA chỉ sinh/đột biến trong miền đó; mức thu hẹp ghi vào `domainReduction` |
| Hàm mục tiêu | — | 4 mục tiêu, **trọng số cấu hình được từ UI**: cân bằng tải · khớp kỹ năng · chi phí · quá tải |
| Ràng buộc cứng | — | H1 capacity · H2 kỹ năng (ngưỡng tổng hợp ≥ 0.5) · H3 lịch nghỉ · H4 phụ thuộc + chồng lịch |
| Báo cáo ràng buộc vi phạm | — | `constraintReport` — nói rõ cái gì không thỏa và vì sao |
| Áp dụng kết quả vào hệ thống | — | Ghi `assignee` cho từng công việc + notification + ActivityLog |
| Lịch sử & so sánh nhiều lần chạy | — | 50 bản ghi gần nhất; chọn 2–4 lần chạy → bảng 9 chỉ số, đánh dấu bên thắng, ghép phân công theo từng công việc, **cảnh báo khi các phương án chạy khác phạm vi** |
| Biểu đồ hội tụ | — | Có (40 điểm cuối) |

**Nhận xét.** Jira không có gì đặt lên bàn cân ở nhóm này — kể cả Premium. Đây là giá trị lõi
của RAO và cũng là phần có hàm lượng nghiên cứu: AC-3 trên đồ thị ràng buộc, bàn giao miền
giá trị CSP → GA, thang điểm dùng chung để GA và CSP so được với nhau. Giới hạn đã tự ghi ra
trong tài liệu: AC-3 trên ràng buộc `≠` chỉ lan truyền từ biến đã bị ép về một giá trị, muốn
mạnh hơn cần all-different kiểu Régin.

### 3.6 Phân tích & báo cáo

| Năng lực | Jira gốc | RAO |
|----------|----------|-----|
| Báo cáo agile (burndown, burnup, velocity, CFD, control chart) | **Đầy đủ** | **Không có** |
| Dashboard ghép gadget tùy ý | Có | Dashboard cố định |
| Histogram phân bổ theo nhân sự + vạch 100% năng lực | Không có | **Có** |
| Cảnh báo quá tải | Không có | **Có** (alert box + badge) |
| Chỉ số rủi ro burnout | Không có | **Có**: > 120% cao, > 90% trung bình |
| So sánh trước/sau tối ưu hóa | Không có | **Có**: StdDev tải, số người quá tải, khớp kỹ năng, bảng delta từng người |
| Xu hướng khối lượng theo thời gian | Không có ở bản gốc | **Có**, nhưng là **khối lượng đã cam kết suy ra từ lịch**, không phải nhật ký quá khứ — xem ghi chú 7.7 trong FEATURES.md |
| Thống kê theo phòng ban | Qua team | Có |
| Xuất CSV / Excel | Có | Có (UTF-8 có BOM, xuất theo tab đang mở) |
| Xuất PDF | Qua app | `window.print()` + layout in riêng |
| Nhật ký hoạt động | Có (audit log) | Có (`ActivityLog`, lọc theo entity/action/user/thời gian) |

**Nhận xét.** Ngang nhau về độ hoàn chỉnh nhưng nhìn về hai hướng khác nhau: Jira đo **dòng
công việc chạy nhanh chậm thế nào**, RAO đo **con người đang chịu tải bao nhiêu**. Một điểm
trung thực cần giữ: chuỗi thời gian của RAO là suy ra từ lịch, nên nó nói được "tuần tới ai
sẽ quá tải" chứ không nói được "tháng trước đội thực sự chạy ở mức nào" — đúng mục 1 backlog.

### 3.7 Tìm kiếm, tự động hóa & tích hợp

| Năng lực | Jira gốc | RAO |
|----------|----------|-----|
| Ngôn ngữ truy vấn (JQL) + filter lưu lại | Đầy đủ | **Không có** — chỉ filter cố định theo status/priority/dự án/phòng ban/kỹ năng |
| Luật tự động hóa | Có (Free: 100 lần chạy/tháng) | **Không có** |
| REST API công khai + tài liệu | Có | Có 53 endpoint nhưng **chỉ dành cho client của chính nó**: xác thực bằng JWT người dùng, chưa có API key cho máy |
| Webhook | Có | **Không có** |
| Tích hợp Git / CI-CD / Slack / Teams | Có | **Không có** |
| Marketplace | Hàng nghìn app | Không có |
| Nhập dữ liệu | Nhập CSV có wizard, nhập từ công cụ khác | **Dán nội dung CSV** vào modal — chưa chọn được file |
| Ứng dụng mobile | iOS + Android | Không có (chỉ web) |

**Nhận xét.** Đây là khoảng cách của "một sản phẩm" so với "một nền tảng có hệ sinh thái", và
nó không thể lấp bằng vài sprint. Với RAO, hạng mục đáng làm nhất trong nhóm này không phải
tự động hóa mà là **kết nối với Jira** — xem mục 6.

### 3.8 Quản trị & bảo mật

| Năng lực | Jira gốc | RAO |
|----------|----------|-----|
| Phân quyền | Permission scheme chi tiết theo dự án, project role, group | **3 role cứng**: admin / project_manager / member. `canModifyTask` cho người được giao tự cập nhật tiến độ việc của mình. Ranh giới có 12 assertion kiểm chứng |
| SSO / SAML / SCIM | Có (Atlassian Guard) | **Không có** |
| Xác thực | Có 2FA | JWT + bcrypt. **Chưa có refresh token / thu hồi token**; token nằm trong `localStorage` |
| Chống lạm dụng | Nền tảng lo | `helmet`, CORS giới hạn theo `CLIENT_URL` (cả REST và Socket.IO), 10 lần đăng nhập sai / 15 phút, 1000 request / 15 phút, body 1 MB |
| Nhật ký kiểm toán | Audit log riêng | `ActivityLog` — chưa có log kiểm toán riêng cho hành động Admin |
| Sao lưu, khôi phục, data residency, SLA vận hành | Atlassian chịu trách nhiệm | **Chưa có gì** — chưa có backup, monitoring, hay kiểm thử tải |
| Bắt buộc cấu hình an toàn khi deploy | — | `NODE_ENV=production` mà thiếu `JWT_SECRET` thì **server từ chối khởi động** |

**Nhận xét.** Tầng bảo mật ứng dụng của RAO nghiêm túc hơn mức thường thấy ở một dự án cùng
quy mô, và có kiểm thử riêng. Nhưng phần **vận hành** thì chưa có gì, và đó chính là phần
người ta trả tiền cho SaaS.

### 3.9 Triển khai, chi phí & vận hành

| | Jira Software Cloud | RAO |
|---|---|---|
| Mô hình | SaaS, trả theo **từng người được cấp phép** (dù có đăng nhập hay không), tính theo **bậc số người** | Tự host: Node.js + MongoDB, một VPS là đủ |
| Gói Free | 0 đ tới **10 người** — 1 site, 2 GB tệp, 100 email/ngày, 100 lần tự động hóa/tháng | — |
| Standard | ~**$7.91**/người/tháng | — |
| Premium (cần gói này mới có Plans để lập kế hoạch nhiều đội) | ~**$14.54**/người/tháng | — |
| Enterprise | Báo giá riêng, trả theo năm | — |
| Ví dụ 10 người | **$0** (gói Free) | Hạ tầng ~$10–20/tháng + công bảo trì |
| Ví dụ 25 người, Standard | ≈ **$198/tháng** ≈ $2.4k/năm (tính theo bậc 11–25 slot, không theo đầu người thật) | Gần như không đổi so với 10 người |
| Ví dụ 25 người, Premium | ≈ **$364/tháng** ≈ $4.4k/năm | Gần như không đổi |
| Chi phí ẩn | Bậc giá nhảy khi vượt ngưỡng; app Marketplace tính tiền riêng theo cùng số người | **Công phát triển và bảo trì** — đây là chi phí lớn nhất và không hiện trên hóa đơn |

Giá kiểm tra ngày 2026-08-19 từ nguồn công khai của bên thứ ba; giá niêm yết thay đổi theo
thời gian và theo vùng, cần xác nhận lại tại atlassian.com trước khi dùng con số này để quyết định.

**Nhận xét.** Dưới 10 người, Jira **miễn phí** còn RAO thì vẫn tốn hạ tầng và công bảo trì —
lập luận "tự làm để tiết kiệm" không đứng được ở quy mô nhỏ. Chi phí chỉ nghiêng về phía RAO
khi đội đông và khi cần đúng những năng lực ở mục 3.4 và 3.5, vì lúc đó bên Jira phải cộng
thêm gói Premium và app trả phí tính theo đầu người.

---

## 4. Điều RAO làm được mà Jira gốc không làm

Sắp theo mức khác biệt, mỗi mục đều chỉ được vào code:

| # | Năng lực | Vì sao Jira gốc không có | Nơi RAO làm |
|---|----------|--------------------------|-------------|
| 1 | **Tự sinh phương án phân công tối ưu** (GA / CSP / Hybrid, 4 mục tiêu, trọng số cấu hình được) | Jira không có khái niệm "giải bài toán phân công" | [server/src/algorithms/](../server/src/algorithms/) |
| 2 | **Năng lực và tải theo từng người** (`maxCapacity` × `fte`, `utilizationRate`) | Jira Plans chỉ lập kế hoạch năng lực ở mức đội, cả ở Premium | [Resource.js](../server/src/models/Resource.js) |
| 3 | **Ma trận kỹ năng dùng được cho máy** (mức 1–4, trọng số theo từng yêu cầu) | Jira không có mô hình kỹ năng | `Resource.skills` + `Task.requiredSkills` |
| 4 | **Lịch nghỉ đi vào ràng buộc H3** | Jira không quản lý ngày nghỉ | `unavailablePeriods` + CSP H3 |
| 5 | **Đường tới hạn CPM** | Jira Timeline không tính critical path | [client/src/utils/gantt.js](../client/src/utils/gantt.js) |
| 6 | **Chỉ số rủi ro burnout** | Không có khái niệm này | `analytics` |
| 7 | **So sánh trước/sau và so sánh nhiều phương án** (9 chỉ số, ghép theo từng công việc) | Không có phương án để so | `GET /optimization/compare` |
| 8 | **Chi phí là mục tiêu tối ưu hóa** (`hourlyRate` trong fitness) | Jira không biết giá giờ | `src/algorithms/scoring.js` |
| 9 | **Kiểm tra vòng lặp phụ thuộc ở server** (trực tiếp và gián tiếp, trả 400) | Issue link của Jira cho phép mọi hình dạng | `task.controller` |

---

## 5. Khoảng trống của RAO so với Jira

Xếp theo mức ảnh hưởng tới việc dùng thật, kèm ước lượng công sức tương đối:

| Ưu tiên | Khoảng trống | Ảnh hưởng | Công sức |
|---------|--------------|-----------|----------|
| 1 | **Bình luận + tệp đính kèm** | Cao — không có thì bàn luận trôi ra Slack và dữ liệu thật nằm ngoài hệ thống | Vừa (thêm model, lưu tệp, UI) |
| 2 | **Thông báo email** (10.6) | Cao — người được giao việc hiện chỉ biết khi đang mở app | Nhỏ |
| 3 | **API cho máy + webhook** | Cao nếu muốn nối với Jira hay CI | Vừa (API key, scope, tài liệu) |
| 4 | **Ảnh chụp workload định kỳ** | Trung bình — hiện chỉ nhìn về phía trước, không có số liệu lịch sử thật | Nhỏ–vừa |
| 5 | **Tìm kiếm nâng cao / filter lưu được** | Trung bình, tăng theo lượng dữ liệu | Vừa |
| 6 | **SSO, refresh token, thu hồi token** | Trung bình, cao nếu triển khai trong doanh nghiệp | Vừa |
| 7 | **Đa ngôn ngữ** (10.3) | Trung bình | Vừa |
| 8 | **Nhiều người trên một công việc, sub-task, nhiều kiểu công việc** | Trung bình | **Lớn** — cả solver đang giả định đúng 1 assignee/công việc |
| 9 | **Sprint / backlog / báo cáo agile** | Thấp nếu định vị RAO là công cụ lập kế hoạch nguồn lực | Lớn |
| 10 | **Workflow và custom field tùy biến** | Thấp với phạm vi hiện tại | **Rất lớn** — đây là lõi kiến trúc của Jira |
| 11 | **Vận hành: backup, monitoring, kiểm thử tải, tách bundle theo route** | Cao khi lên môi trường thật | Vừa |
| 12 | **Mobile** | Thấp–trung bình | Lớn (hoặc làm responsive tốt hơn) |

Mục 8 đáng nói thêm: đó không phải một trường thiếu, mà là một **giả định nằm trong thuật
toán**. Cho phép nhiều người trên một công việc là đổi cả không gian nghiệm của GA và CSP.

---

## 6. Nên dùng cái nào — và mô hình kết hợp

**Dùng Jira** nếu bài toán chính là theo dõi công việc hằng ngày cho nhiều người với nhiều
quy trình khác nhau, cần cộng tác, tích hợp Git/CI, mobile, SSO, và không muốn tự vận hành.
Dưới 10 người thì gói Free đã bao gần hết nhu cầu đó.

**Dùng RAO** nếu bài toán chính là *phân bổ*: nhiều dự án chạy song song tranh nhau cùng một
nhóm người, cần biết ai đang quá tải, cần chọn người theo kỹ năng và lịch rảnh, và cần một
phương án phân công do thuật toán đề xuất kèm số liệu để bảo vệ quyết định đó.

**Dùng cả hai — đây là kết luận thực tế nhất.** Jira là hệ ghi nhận công việc; RAO là lớp lập
kế hoạch nguồn lực đặt bên trên. Hiện RAO đã có sẵn ba mảnh cho hướng này: mô hình dữ liệu
nguồn lực, engine tối ưu hóa, và chức năng nhập CSV (10.4). Còn thiếu:

1. **Đồng bộ vào**: Jira issue → `Task` (`summary`→`title`, `assignee`, `duedate`→`endDate`,
   original estimate→`estimatedHours`, issue link→`dependencies`). Cần token app Jira và một
   bảng mapping trường.
2. **Đồng bộ ra**: khi bấm "Áp dụng kết quả", ghi `assignee` trở lại Jira qua REST API.
3. **Dữ liệu chỉ RAO có** (FTE, kỹ năng, lịch nghỉ, giá giờ) thì vẫn nhập và giữ ở RAO —
   Jira không có chỗ để chứa.
4. **Cách xử lý xung đột** khi cả hai bên đều sửa: chọn một bên làm nguồn sự thật cho từng
   trường, đừng đồng bộ hai chiều toàn bộ.

Bước nhỏ nhất có giá trị: nhập một chiều từ Jira bằng CSV export sẵn có, chưa cần gọi API —
đủ để chạy tối ưu hóa trên dữ liệu thật và kiểm chứng xem phương án có thuyết phục hay không,
trước khi bỏ công làm tích hợp API.

---

## 7. Giới hạn của chính bản so sánh này

Nói thẳng để người đọc biết tin tới đâu:

1. **Không có phiên chạy thử Jira đối chứng.** Phần RAO đối chiếu trực tiếp với code; phần
   Jira dựa trên tài liệu công khai và bài phân tích của bên thứ ba tính tới 2026-08-19.
   Jira Cloud thay đổi liên tục — một năng lực hôm nay xếp "không có" có thể đã được thêm.
2. **"Jira gốc" là một lựa chọn có chủ ý và nó thiên vị RAO.** Với app Marketplace
   (Tempo, ActivityTimeline, Planyway, BigPicture…), phần lớn ưu thế ở mục 3.3 và 3.4 —
   Gantt có đường tới hạn, timesheet, năng lực theo từng người, lịch nghỉ — đều mua được.
   Chỗ khó lấp bằng app là **mục 3.5**: các app nghiêng về dự báo và cảnh báo hơn là tự sinh
   phương án phân công đa mục tiêu rồi ghi trở lại. Nhưng tôi **không kiểm chứng từng app**
   trong hạng mục này, nên hãy đọc mục 3.5 như "chưa thấy đối trọng tương đương" chứ không
   phải "chắc chắn không tồn tại".
3. **Không so sánh hiệu năng và độ chịu tải.** Jira chạy cho hàng nghìn người; RAO chưa có
   kiểm thử tải nào. Bundle client hiện là một mảnh ~1.5 MB.
4. **Không so sánh trải nghiệm người dùng bằng đo lường.** Không có phiên usability test nào
   ở cả hai bên.
5. **Số liệu giá là giá niêm yết công khai của bên thứ ba**, chưa tính thuế, chiết khấu năm,
   giá theo vùng, hay giá app.
6. **Số liệu RAO lấy từ [FEATURES.md](./FEATURES.md)** — 78 hạng mục, 76 hoàn thành. Đó là
   thang đo do chính dự án tự đặt, nên **không so được trực tiếp** với bất kỳ con số nào của
   Jira; nó chỉ nói mức hoàn thiện so với phạm vi tự đề ra.

---

## 8. Nguồn tham khảo

**Phía RAO** — chính repo này:
[FEATURES.md](./FEATURES.md) · [API.md](./API.md) · [DATABASE.md](./DATABASE.md) ·
[ALGORITHMS.md](./ALGORITHMS.md) · [architecture/SYSTEM_DESIGN.md](./architecture/SYSTEM_DESIGN.md) ·
[server/tests/README.md](../server/tests/README.md)

**Phía Jira** — truy cập ngày 2026-08-19:

- [Jira Pricing Plans in 2026: What Every Tier Really Costs — resolution](https://www.resolution.de/post/jira-pricing-plans/)
- [Jira Pricing 2026: 4 Plans from Free–$14.54/user/month — costbench](https://costbench.com/software/project-management/jira/)
- [Jira Capacity Planning: Uses, Limitations & Best Practices — Epicflow](https://www.epicflow.com/blog/jira-capacity-planning/)
- [Jira Resource Planning & Management Guide — Planyway](https://planyway.com/blog/jira-resource-planning)
- [Capacity Planning in Jira Without Premium — Titanapps](https://titanapps.io/blog/capacity-planning-in-jira)
- [Resource Planning in Jira: Plan Capacity and Skills Before Work — Atlassian Community](https://community.atlassian.com/forums/App-Central-articles/Resource-Planning-in-Jira-Plan-Capacity-and-Skills-Before-Work/ba-p/3178472)
