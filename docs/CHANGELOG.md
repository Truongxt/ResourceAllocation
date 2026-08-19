# 📝 Changelog - Resource Allocation Optimization

Tất cả thay đổi đáng chú ý của dự án sẽ được ghi lại tại đây.

Format: [Semantic Versioning](https://semver.org/lang/vi/)

---

## [Chưa phát hành] - 2026-08-19

### Security

Từ một đợt rà soát riêng, kiểm chứng từng mục bằng code chứ không theo trí nhớ.

- **Giới hạn tần suất** (`express-rate-limit`): 10 lần đăng nhập **sai** / 15 phút mỗi IP cho
  `/auth/login` và `/auth/register`, 1000 request / 15 phút cho phần còn lại của API. Đăng nhập
  đúng không bị tính vào ngưỡng nên không khóa nhầm người dùng thật. Ngưỡng đặt qua
  `AUTH_RATE_LIMIT_MAX` / `API_RATE_LIMIT_MAX`.
- **`helmet`** — bổ sung nosniff, frameguard, HSTS, gỡ `X-Powered-By`. CSP tắt vì API chỉ trả JSON.
- **CORS siết theo `CLIENT_URL`** cho REST API; trước đây `cors()` mở cho mọi origin.
  Request không kèm `Origin` (curl, health check hạ tầng) vẫn đi qua được.
- **Giới hạn body 1 MB** cho cả JSON lẫn urlencoded.
- Chặn open redirect ở đích điều hướng động duy nhất của client (`notif.link` trong
  `Header.jsx`): chỉ nhận đường dẫn nội bộ, loại `//host` và `/\host`.
- `.env.example` ghi rõ `CLIENT_URL` là **bắt buộc khi deploy** — thiếu thì server chỉ chấp
  nhận `localhost:5173` và realtime chết trên môi trường thật.

### Added

- **Xu hướng khối lượng theo thời gian** (7.7) — `GET /api/analytics/workload-trend` và tab
  **Xu hướng theo thời gian** trong Báo cáo: cột tải kèm đường năng lực, dải nhiệt từng nhân
  sự, gộp theo ngày hoặc tuần, lọc theo dự án, xuất CSV mỗi mốc một cột.
  Phép tính nằm trong `src/analytics/workloadTrend.js` (thuần, không chạm DB): giờ ước tính
  của mỗi công việc trải đều lên các **ngày làm việc** trong khoảng của nó; capacity ngày là
  `maxCapacity × fte / 5`, bằng 0 vào cuối tuần và trong lịch nghỉ đã đăng ký.
  Ghi rõ ngay trên giao diện rằng đây là **khối lượng đã cam kết suy ra từ lịch**, không phải
  nhật ký quá khứ — hệ thống không lưu ảnh chụp workload theo ngày, nên nó cho biết tuần nào
  ai sẽ quá tải chứ không cho biết tháng trước ai đã thực sự làm bao nhiêu.
  Ba chỗ cố tình không làm tắt:
  - `Resource.availability` không được dùng: đó là trạng thái hiện tại, không gắn với ngày
    nào, áp lên cả trục thời gian sẽ bóp méo cả quá khứ lẫn tương lai. Chỉ `unavailablePeriods`
    (có ngày cụ thể) mới trừ capacity.
  - Capacity bằng 0 thì `utilization` trả `null` chứ không phải 0% — không có mẫu số thì không
    có tỉ lệ. Trường hợp có việc mà không có ngày làm việc nào được báo bằng cờ
    `worksWhileUnavailable`, không quy thành một con số phần trăm bịa ra.
  - Giờ công không đặt được lên trục thời gian (thiếu ngày, ngày ngược, chưa giao người) được
    đếm riêng trong `excluded` và hiện thành cảnh báo, thay vì lặng lẽ biến mất khỏi biểu đồ.
- **So sánh song song nhiều phương án** (5.6) — `GET /api/optimization/compare?ids=` đặt 2–4
  lần chạy cạnh nhau: 9 chỉ số kèm đánh dấu bên thắng, và bảng phân công ghép theo từng công
  việc để thấy hai thuật toán chọn khác nhau ở đâu. Trên giao diện: tick chọn trong tab Lịch
  sử chạy → tab **So sánh phương án**, có công tắc chỉ hiện chỗ khác.
  Ba quy ước cố tình chọn để số liệu không nói dối:
  - Nhiều phương án cùng đạt giá trị tốt nhất thì **không ai** được tô đậm — hòa nhau không
    phải là thắng, và phương án đứng trước không được ưu ái vì đứng trước.
  - `averageUtilization` không có bên thắng: 40% là để phí người, 100% là vắt kiệt.
  - Chỉ số một phương án không sinh ra được trả `null` chứ không quy về 0 — GA không kiểm tra
    ràng buộc, hiển thị "0 vi phạm" cho nó là sai sự thật.
  Kèm cảnh báo khi các phương án chạy khác phạm vi dự án hoặc khác số công việc đầu vào; so
  một lần chạy 20 việc với một lần chạy 8 việc rồi kết luận thuật toán nào hơn là kết luận sai.
- **AC-3 đúng nghĩa trong CSPSolver** (5.2) — tách hẳn hai bước từng bị gộp dưới một cái tên:
  `_nodeConsistency()` lọc theo capacity (ràng buộc đơn phân), `_arcConsistency()` chạy AC-3
  thật trên đồ thị ràng buộc nhị phân H4, có hàng đợi cung và đẩy lại cung sau mỗi lần cắt.
  Phát hiện vô nghiệm với **0 vòng backtracking** và trả đúng thông báo "ràng buộc quá chặt"
  thay vì "không tìm thấy giải pháp". `solve()` trả thêm `propagation` để đối chiếu.
  Ghi rõ giới hạn: trên ràng buộc `≠`, AC-3 chỉ lan truyền từ biến đã bị ép về một giá trị
  và không suy luận được kiểu chuồng bồ câu — cần all-different (Régin) cho việc đó.
- **Hybrid nối CSP → GA thật sự** (5.11) — `CSPSolver.buildFeasibleDomains()` đưa miền giá
  trị đã lọc (H2 skill, H3 availability, capacity) sang `GeneticAlgorithm.optimize()`;
  `_initializePopulation` và `_mutate` chỉ chọn trong miền đó, nên mọi cá thể đều thỏa mãn
  hard constraint ngay từ thế hệ đầu. Trước đây hai thuật toán chạy độc lập trên cùng dữ
  liệu gốc, kết quả CSP chỉ dùng để lấy `constraintReport`.
  Đo trên bài toán 20 công việc × 12 nhân sự (240 → 48 cặp khả thi): số thế hệ tới khi dừng
  giảm từ 119 xuống 90 (trung bình 40 lần chạy mỗi chế độ), fitness nhỉnh hơn một chút.
- `OptimizationResult.domainReduction` — ghi lại mức thu hẹp và số công việc phải mở lại
  miền vì không nhân sự nào đủ điều kiện; hiện trên trang Tối ưu hóa kèm cảnh báo.
- `npm run cleanup` — liệt kê dữ liệu mồ côi trong database đang chạy (thông báo trỏ tới user
  đã xóa, kết quả CSP cũ có `fitness: 0`, kết quả trỏ tới dự án đã xóa). **Mặc định chạy khô**,
  phải thêm `-- --apply` mới xóa thật. ActivityLog cố ý không đụng tới: nhật ký lưu sẵn
  `userName`/`userEmail` để đọc được sau khi tài khoản biến mất, xóa đi là mất vết kiểm toán.
- **UI level/weight cho kỹ năng yêu cầu** (3.9) — form Task nhập từng dòng: tên (gợi ý lấy
  từ Skill Matrix của nhân sự vì thuật toán so khớp theo tên), mức yêu cầu, trọng số 0-1.
  Bảng công việc hiện luôn danh sách kỹ năng kèm mức. Server chặn thiếu tên, level ngoài
  1-5, trọng số ngoài 0-1.
- `server/tests/scoring.test.mjs` — 18 assertion cho thang điểm dùng chung của GA và CSP,
  trong đó chứng minh `weight` thực sự đổi kết quả chứ không chỉ được lưu.
- **UI lịch nghỉ nhân sự** (4.6) — modal "Lịch nghỉ" ở trang Nhân sự cho thêm/xóa nhiều kỳ
  nghỉ kèm lý do; bảng hiện tag "Đang nghỉ tới…" / "Nghỉ từ…". CSP Solver đã dùng
  `unavailablePeriods` cho ràng buộc H3 từ trước nhưng không màn hình nào nhập được.
  Server chặn ngày đảo ngược, kỳ nghỉ chồng nhau, ngày sai định dạng và lý do quá dài.
- **UI thiết lập công việc tiền nhiệm** (3.7) — ô chọn nhiều trong form Task, giới hạn
  công việc cùng dự án và tự loại các lựa chọn sẽ tạo vòng lặp. Server kiểm tra lại
  toàn bộ: tự phụ thuộc, id không tồn tại, khác dự án, vòng lặp trực tiếp lẫn gián tiếp
  đều trả 400; id trùng được gộp trước khi lưu.
- **Ràng buộc H4 (Dependency) trong CSPSolver** (5.4) — hai công việc phụ thuộc nhau mà
  lịch chồng nhau không được giao cho cùng một người. Vi phạm thuần về thứ tự ngày được
  báo trong `constraintReport` thay vì làm bài toán vô nghiệm, vì thuật toán chỉ chọn
  người chứ không sinh lịch. Có bộ kiểm thử đơn vị riêng: `npm test csp` (20 assertion).
- `constraintReport.details` được lưu vào `OptimizationResult` và hiển thị trong trang
  Tối ưu hóa — trước đây chỉ lưu hai con số nên "violated: 1" không cho biết vi phạm gì.
- **Sơ đồ Gantt nâng cao** — hoàn thành 5 tính năng còn thiếu của Module 6:
  - Kéo thả đổi lịch: kéo thanh để dời cả hai đầu, kéo hai mép để đổi riêng ngày bắt đầu
    hoặc kết thúc; snap theo ngày, cập nhật lạc quan rồi hoàn tác nếu server từ chối.
    Chỉ Admin/PM thấy thao tác này, khớp với `canModifyTask` ở server.
  - Mũi tên phụ thuộc vẽ bằng SVG (đường Bézier + đầu mũi tên). Phụ thuộc bị vi phạm —
    task sau bắt đầu trước khi task trước kết thúc — vẽ đỏ đứt nét kèm cảnh báo đếm số lượng.
  - Đường găng theo CPM đầy đủ (lượt xuôi/ngược, slack = 0), viền vàng trên thanh và
    mũi tên vàng trên chuỗi găng; phát hiện chu trình phụ thuộc và báo thay vì trả kết quả sai.
  - Gộp hàng theo dự án hoặc theo nhân sự, thu gọn được, kèm dải tổng hợp thời gian và
    % tiến độ trung bình của nhóm.
  - Mốc (milestone): task có thời lượng 0 vẽ thành hình thoi, viền màu theo mức ưu tiên.
  - Thêm chấm màu ưu tiên trên mỗi thanh và bảng chú giải đầy đủ.
- `client/src/utils/gantt.js` — tách phần logic thuần (CPM, thời lượng, nhận diện mốc)
  khỏi component để chạy và kiểm thử được bằng node.
- `client/tests/gantt.test.mjs` + script `npm test` cho client — 24 assertion phủ CPM
  (chuỗi tuần tự, nhánh song song có slack, chu trình, dependency trỏ ra ngoài tập, mốc).
- `PRIORITY_COLORS` trong `client/src/constants` — mã màu thật cho những chỗ vẽ trực tiếp.
- 3 assertion end-to-end cho đúng payload mà thao tác kéo thả gửi lên
  (PM đổi lịch → 200, Member đổi lịch → 403, ngày sai định dạng → 400).
- **Trang chi tiết dự án** `ProjectDetail.jsx` (route `/projects/:id`) — 4 thẻ thống kê,
  3 tab (Tổng quan / Công việc / Thành viên) và UI thêm–sửa–gỡ thành viên kèm `%` phân bổ.
- **Bộ kiểm thử end-to-end** `server/tests/` — 158 assertion qua API thật và Socket.IO,
  chạy trên database và cổng riêng nên không đụng dữ liệu dev (`cd server && npm test`).
- `server/src/algorithms/scoring.js` — hàm tính fitness/metrics dùng chung cho GA và CSP.
- `server/src/config/jwt.js` — nguồn duy nhất cho JWT secret và thời hạn token.
- `server/src/middleware/taskAccess.js` — phân quyền theo bản ghi cho công việc.

### Changed

- **Tách bundle client theo route** — 12 trang chuyển sang `React.lazy`, hai ranh giới
  `Suspense`: một trong `Content` của `AppLayout` để đổi trang chỉ chớp vùng nội dung chứ
  không mất sidebar/header, một ở ngoài cùng cho Login/Register vốn không nằm trong layout.
  `vite.config.js` chỉ tách tay `react-vendor` và `net-vendor` — hai khối đằng nào cũng nằm
  trong đồ thị entry, gom lại để cache lâu qua các lần deploy.
  **Cố tình không gom antd vào một chunk**: thử cách đó trước và nó phản tác dụng — Table,
  DatePicker, Slider dù chỉ một trang dùng vẫn bị kéo vào chunk mà khung layout cần ngay,
  lần vào đầu tiên vẫn phải tải 1,1 MB (chỉ giảm 8%). Để Rollup tự chia thì phần antd chỉ
  một trang dùng nằm luôn trong chunk của trang đó.
  Tải ở lần vào đầu tiên: **1.544 kB → 813 kB** (gzip 489 → 266 kB), giảm 47%.
  `Table` 158 kB nay chỉ tải ở trang thực sự có bảng.
  Chunk entry còn 559 kB nên cảnh báo >500 kB của Vite vẫn còn — đó là lõi antd + cssinjs
  mà khung layout cần ngay, không tách thêm được nếu không đổi thư viện UI.
- **Siết phân quyền công việc và ma trận kỹ năng**: `POST /tasks`, `DELETE /tasks/:id` và
  `PUT /resources/:id/skills` giới hạn Admin/PM. `PUT /tasks/:id` và `PATCH /tasks/:id/status`
  cho phép thêm người được giao việc, nhưng chỉ ba trường `status`, `progress`, `actualHours` —
  gửi kèm trường khác bị chặn 403 kèm tên trường bị từ chối. Giao diện ẩn/vô hiệu hóa
  đúng các thao tác tương ứng.
- CSP dùng chung thang điểm với GA nên kết quả có đủ `fitness` và `metrics` để so sánh.
- `GET /api/analytics/optimization-comparison/:id` trả thêm `metrics.before/after` và mảng
  `resources[]` ghép theo resource ID; số liệu "trước" tính từ task đang mở thay vì
  `Resource.currentWorkload` có thể đã cũ.

### Fixed

- **Seeder chỉ xóa 5/8 collection.** `notifications`, `activitylogs` và `optimizationresults`
  tồn đọng qua mọi lần seed và trỏ tới user/task đã bị xóa. Nay xóa đủ 8, có assertion
  kiểm tra ba collection này sạch ngay sau khi seed.
- **Member thấy ô mình không lưu được.** Form công việc vẫn cho gõ tiêu đề, ưu tiên, người
  thực hiện, ngày tháng rồi báo "Cập nhật thành công", trong khi client lặng lẽ cắt bỏ những
  trường đó trước khi gửi. Nay các ô bị khóa kèm giải thích ba trường được phép đổi.
- Hai trang tự định nghĩa lại hằng số đã có trong `constants/`: `Dashboard.jsx` (nhãn + màu
  5 trạng thái task, ở ba chỗ khác nhau) và `Resources.jsx` (`SKILL_LEVELS`,
  `AVAILABILITY_OPTIONS`, 4 chỗ viết cứng tên role). Đây đúng loại lệch đã sinh ra 4 lỗi
  trong đợt rà soát đầu tiên.
- Form Task đọc `requiredSkills` ra chuỗi tên rồi ghi lại với `level: 2` cố định, nên
  **mỗi lần sửa công việc là mất mức yêu cầu và trọng số đã đặt**. Nay giữ nguyên giá trị đã lưu.
- `Reports.jsx` đọc `summary.highBurnoutRisk` trong khi API trả `summary.highBurnout` →
  thẻ "Nguy cơ burnout cao" luôn bằng 0.
- `Tasks.jsx` gửi `requiredSkills[].minLevel` không có trong schema → `level` luôn bị đặt
  về mặc định 3, làm sai đầu vào của thuật toán.
- Cột "Độ khớp kỹ năng" trong `Optimization.jsx` đọc `skillMatchScore` thay vì `skillMatch`
  nên luôn hiện giá trị dự phòng 85%.
- Tab "So sánh Trước/Sau" đọc cấu trúc dữ liệu mà API không hề trả về nên luôn rỗng.
- JWT secret dự phòng ở nơi ký token và nơi xác thực khác nhau → nếu quên đặt `JWT_SECRET`
  thì đăng nhập được nhưng mọi request sau đó đều 401.
- `utils/seeder.js` đọc `MONGO_URI` (thiếu `DB`) và không nạp `.env` ở thư mục gốc nên
  luôn seed vào database mặc định.
- `client/src/constants/index.js` đã lạc hậu và không được import ở đâu; nay khớp enum của
  server và được dùng ở 4 trang.

### 📚 Documentation

Rà soát toàn bộ tài liệu, đối chiếu với mã nguồn và kiểm chứng bằng request thật.

#### Changed
- **FEATURES.md**: Module 3, 4 và 6 lên đủ, 5.4 lên ✅, thêm mục 5.11 (Hybrid vốn không hề
  có trong bảng dù đã có endpoint); thống kê tổng từ 81.8% lên **93.6%** (≈94.9% nếu tính
  mục dở dang theo 50%); rút gọn backlog còn 4 hạng mục; ghi lại chênh lệch thang level
  giữa Resource (1-4) và Task (1-5) cần quyết định. Sau khi có AC-3: **94.9%**.
- **ALGORITHMS.md mục 2.4/2.5**: viết lại pseudo-code thành 5 bước tách bạch, bỏ cảnh báo
  "bước 2 không phải AC-3 thật", bổ sung giới hạn của arc consistency trên ràng buộc `≠`.
- **ALGORITHMS.md mục 3**: viết lại toàn bộ phần Hybrid — bỏ sơ đồ "hiện trạng chạy độc lập"
  và "thiết kế mục tiêu chưa implement", thay bằng luồng thật, bảng ảnh hưởng của miền lên
  từng toán tử di truyền, cách xử lý miền rỗng và số đo trước/sau.
- **ALGORITHMS.md**: bổ sung H4 vào bảng ràng buộc cứng và giải thích vì sao phải phát biểu
  lại nó (biến quyết định là "giao cho ai", không phải "làm khi nào"); cập nhật pseudo-code
  của `solve()`.
- **API.md** và **DATABASE.md**: bảng lỗi kiểm tra `dependencies`, và cấu trúc
  `constraintReport.details` mới.
- **SYSTEM_DESIGN.md** và **docs/README.md**: bổ sung `client/src/utils/` và `client/tests/`;
  bỏ ghi chú "constants là dead code" (nay đã được dùng ở 4 trang) và ghi chú seeder đọc sai
  biến môi trường (đã sửa từ đợt trước).
- **API.md**: viết lại hoàn toàn — bổ sung 20 endpoint chưa từng được ghi
  (Departments, Analytics, Notifications, Activity Logs, các endpoint `stats/summary`),
  loại bỏ 6 endpoint không tồn tại, sửa format response (`data` luôn bọc dưới key có tên,
  `total` nằm ngoài `pagination`), sửa bảng phân quyền theo đúng middleware.
- **DATABASE.md**: bổ sung 3 collection thiếu (Departments, Notifications, ActivityLogs);
  sửa `Task.assignee` từ `→ Resources` thành `→ Users`; sửa enum `Task.status`
  (`review` thay vì `in_review`, thêm `blocked`); sửa `requiredSkills` (`name`/`level`/`weight`);
  sửa `dependencies` thành mảng ObjectId phẳng; cập nhật schema `OptimizationResult`
  theo đúng code; bỏ `storyPoints`/`completedAt` không tồn tại.
- **ALGORITHMS.md**: bổ sung trọng số `weight` vào công thức skill match; ghi rõ CSP chỉ
  implement H1/H2/H3 (không có ràng buộc Dependency) và H2 là ngưỡng tổng hợp ≥ 0.5;
  làm rõ bước "AC-3" thực chất là bộ lọc unary theo capacity; mô tả lại Hybrid đúng hiện
  trạng (CSP và GA chạy độc lập); cập nhật bảng metrics kèm thang đo thực tế.
- **FEATURES.md**: hạ trạng thái 11 mục chưa implement và 8 mục hoàn thành một phần;
  bổ sung Module Quản lý Phòng ban; thêm mục Backlog và bảng Lỗi đã biết;
  cập nhật thống kê từ 97.3% xuống 75.3% hoàn thành (≈80.5% nếu tính mục dở dang theo 50%).
- **SYSTEM_DESIGN.md**: bổ sung Ant Design, Socket.IO, dotenv vào tech stack; sửa cấu trúc
  thư mục client/server theo thực tế; bổ sung `CLIENT_URL` và cảnh báo `JWT_SECRET`;
  thêm sơ đồ luồng notification real-time; sửa sơ đồ luồng tối ưu hóa.
- **docs/README.md**: cập nhật sơ đồ kiến trúc (8 collection, Socket.IO, đủ các trang);
  sửa bảng phân quyền theo đúng code.

---

## [0.3.0] - 2026-08-18

### Added
- **Activity Logging**: model `ActivityLog`, `activityLog.service`, controller + routes
  (`GET /`, `GET /stats`, `DELETE /` admin-only) và trang `ActivityLogs.jsx`
- Ghi nhật ký cho các hành động: tạo/sửa/xóa dự án, tạo/sửa/đổi trạng thái/xóa task,
  áp dụng kết quả tối ưu hóa
- Ghi kèm `ipAddress`, `userAgent`, snapshot `userName`/`userEmail`

---

## [0.2.0] - 2026-08-17

### Added
- **Task Management**: controllers/routes đầy đủ cho `/api/tasks`, client service tương ứng,
  tự động tính lại `progress` của dự án
- **Optimization Engine hoàn chỉnh**
  - `GeneticAlgorithm`: tournament selection, uniform crossover, random mutation, elitism,
    dừng theo max generations / stagnation 50 / target fitness 0.95
  - `CSPSolver`: backtracking + MRV + LCV, lọc miền theo skill/availability/capacity
  - 3 endpoint `POST /api/optimization/run/{genetic,csp,hybrid}`, lịch sử, áp dụng kết quả
  - Model `OptimizationResult` lưu assignments, metrics, convergence history
- **Analytics**: 4 endpoint dashboard / utilization / tasks / optimization-comparison,
  kèm chỉ số burnout risk
- **Realtime**: Socket.IO server xác thực JWT, room `user:<id>`, model `Notification`,
  Notification Center + toast ở Header
- **Department Management**: model, 4 endpoint CRUD, ràng buộc nhân sự phải thuộc phòng ban hợp lệ
- **Frontend**: các trang Dashboard, Projects, Tasks (Kanban + List), Resources,
  Optimization, Gantt Chart, Reports, Settings; dark/light theme; nhập CSV

---

## [0.1.0] - 2026-08-04

### 🎉 Khởi tạo dự án

#### Added
- **Project Structure**: Khởi tạo cấu trúc monorepo (client + server + docs)
- **Client**: React 18 + Vite setup với design system (dark theme)
  - Layout components: Sidebar, Header
  - Placeholder pages: Dashboard, Projects, Tasks, Resources, Optimization, Gantt, Reports
  - Auth context, API service (Axios), Constants
  - CSS Design System với variables, components, animations
- **Server**: Node.js + Express setup
  - MongoDB connection (Mongoose)
  - Models: User, Project, Task, Resource
  - Routes placeholder: Auth, Projects, Tasks, Resources, Optimization
  - Middleware: JWT Auth, Error handling
  - Algorithm skeleton: Genetic Algorithm, CSP Solver
- **Documentation**:
  - README.md - Tổng quan dự án
  - FEATURES.md - Danh sách tính năng theo module
  - DATABASE.md - Schema design chi tiết
  - API.md - API documentation
  - ALGORITHMS.md - Mô tả thuật toán GA + CSP
  - SYSTEM_DESIGN.md - Kiến trúc hệ thống

---

<!-- Template cho entry mới:

## [x.y.z] - YYYY-MM-DD

### Added (Tính năng mới)
### Changed (Thay đổi)
### Fixed (Sửa lỗi)
### Removed (Xóa bỏ)

-->
