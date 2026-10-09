# Kiểm thử phía server

Phần lớn các bộ ở đây gọi vào một server thật đang chạy, trên một database riêng,
và assert trên nội dung response chứ không chỉ mã HTTP. Riêng bộ `csp` là kiểm thử
đơn vị: nạp thẳng class thuật toán và chạy trên dữ liệu dựng sẵn.

Đây là **một trong ba lớp** kiểm thử của dự án — lớp này dừng ở ranh giới HTTP, không
biết gì về giao diện. Phần giao diện do [`client/tests`](../../client/tests/README.md)
(component trong jsdom) và [`e2e`](../../e2e/README.md) (Chromium thật) đảm nhận.
Tổng quan: [`docs/TESTING.md`](../../docs/TESTING.md).

## Chạy

```bash
cd server
npm test                 # chạy tất cả các bộ
npm test api             # chỉ chạy bộ có tên khớp "api"
npm test socket
npm test project
```

Yêu cầu MongoDB đang chạy. Không cần khởi động server trước — trình chạy tự lo.

## Trình chạy làm gì

`tests/run.mjs` với mỗi lần chạy:

1. Nạp dữ liệu mẫu vào **database test riêng** (`resource_allocation_test`)
2. Khởi động server trên **cổng riêng** (`5099`) với `JWT_SECRET` dành cho test
3. Nạp lại dữ liệu mẫu **trước từng bộ**, vì các bộ có tạo và xóa bản ghi
4. Chạy lần lượt các bộ, in kết quả
5. Tắt server và thoát với mã 0 nếu tất cả đạt, 1 nếu có bộ thất bại

Nhờ vậy database và server dùng để phát triển không bị đụng tới.

Ghi đè bằng biến môi trường nếu cần: `TEST_PORT`, `TEST_MONGODB_URI`.

Trình chạy chờ tối đa **60 giây** để server trả lời `/api/health`. Hết thời gian thì in ra
tám dòng log cuối của tiến trình server; log **trống** nghĩa là nó chưa kịp in ra gì —
thường vì MongoDB chưa chạy, hoặc máy đang quá tải (chạy ngay sau bộ e2e chẳng hạn).

## Các bộ

| Bộ | File | Phạm vi |
|----|------|---------|
| `security` | `security.test.mjs` | Security header của helmet, CORS chỉ nhận origin của client, và giới hạn tần suất đăng nhập. Phần giới hạn tần suất dựng app express riêng trên cổng tạm vì đó là trạng thái toàn cục theo IP — chạm ngưỡng trên server dùng chung sẽ làm các bộ sau không đăng nhập nổi |
| `scoring` | `scoring.test.mjs` | Thang điểm dùng chung của GA và CSP ở mức đơn vị: công thức khớp kỹ năng có trọng số, so khớp tên không phân biệt hoa thường, giới hạn thang level, capacity/effort mặc định. Thêm `contextSwitches` (S3): đếm dự án thừa của mỗi người, nhận project dạng id lẫn object, tính cả tải đã cam kết |
| `workload-trend` | `workload-trend.test.mjs` | Chuỗi thời gian khối lượng ở mức đơn vị: trải giờ theo ngày làm việc, capacity theo fte và lịch nghỉ, gộp tuần, quá tải, và các giờ công không đặt được lên trục thời gian. Mốc thời gian dùng tháng 3/2026 vì mùng 2 là thứ Hai. Không cần server lẫn database |
| `performance-summary` | `performance-summary.test.mjs` | Báo cáo kết quả theo người ở mức đơn vị: năm nhóm trạng thái phủ hết và không chồng nhau, `completedAt === endDate` tính đúng hạn, việc xong không có mốc không làm tăng tỉ lệ, chỉ lùi deadline mới là gia hạn, người không có việc vẫn có dòng. Không cần server lẫn database |
| `hybrid` | `hybrid.test.mjs` | Bàn giao CSP → GA ở mức đơn vị: CSP lọc đúng miền, GA chỉ chọn trong miền đó, miền rỗng được mở lại và báo lại, chỉ số hỏng bị bỏ qua. Thêm: `generations` là thế hệ dừng thật (không phải mốc ghi lịch sử), `convergenceHistory` kết thúc đúng ở đó, tốc độ hội tụ trong `[0, generations]`; cột Hybrid của Benchmark Studio thật sự nhận miền của CSP |
| `csp` | `csp.test.mjs` | CSPSolver ở mức đơn vị: ràng buộc H3 (lịch nghỉ) và H4 (phụ thuộc), cùng lan truyền AC-3 — cắt từ biến singleton, lan theo dây chuyền, phát hiện vô nghiệm với 0 vòng backtracking, và trường hợp AC-3 **không** cắt được gì. Không cần server lẫn database. Thêm thứ tự thử ứng viên theo ràng buộc mềm: rảnh như nhau thì chọn người khớp kỹ năng hơn (S1), kỹ năng ngang nhau thì chọn người đã có việc cùng dự án, kể cả từ tải đã cam kết (S3), và người khớp hơn mà gần hết chỗ vẫn thua người rảnh hẳn (S2) |
| `benchmark-dataset` | `benchmark-dataset.test.mjs` | Bộ sinh dữ liệu tổng hợp của Benchmark ở mức đơn vị: ở mọi quy mô, mọi việc đều có ít nhất một người đạt ngưỡng H2 mặc định — trước đây 26% việc ở bộ small không ai đạt nên CSP giải được 0/30 bộ, số đo nói về bộ sinh chứ không về thuật toán. Nhưng vẫn phải còn lựa chọn: không phải ai cũng hợp mọi việc, điểm khớp trải nhiều mức để S1 có cái mà chọn. Hình dạng dữ liệu giữ nguyên cho Benchmark Studio. Không cần server lẫn database |
| `api` | `api.test.mjs` | Toàn bộ REST API: health, xác thực, phân quyền 3 role, CRUD Projects/Tasks/Resources/Departments, 3 thuật toán tối ưu hóa, Analytics, Notifications, ActivityLog, dọn dữ liệu theo tầng |
| `project-detail` | `project-detail.test.mjs` | Các API trang chi tiết dự án dùng, theo đúng thứ tự UI gọi, gồm cả nhánh lỗi và ranh giới phân quyền |
| `cross-company-refs` | `cross-company-refs.test.mjs` | Id của công ty khác đi trong **body/query** (người được giao, người theo dõi, dự án đích, nhóm việc, quản lý, thành viên, trưởng phòng…) và `companyName` gửi lên để chuyển bản ghi sang công ty khác. An toàn = 4xx, hoặc bản ghi trả về không chứa id ngoài |
| `jobs` | `jobs.test.mjs` | Job định kỳ qua `POST /internal/jobs/:name`. Khóa: thiếu/sai `X-Job-Secret` → 401, token đăng nhập (kể cả admin) không thay được khóa, tên lạ → 404, server thiếu `JOB_SECRET` → 503. `recurring-tasks`: **hai lần gọi song song chỉ sinh một việc**. `workload-snapshot`: chạy lại trong ngày không thêm điểm, tải khớp trang Utilization (có kiểm là có người mang tải thật để so), công ty B không thấy nhân sự của A. `/jobs/status`: member 403, `stale` trước lần chạy đầu và hết sau đó |
| `performance` | `performance.test.mjs` | `GET /analytics/performance` qua HTTP: ai lọt vào `me` / `subordinates` / `all`, người không phải Owner/Admin gọi `all` thì 403, kỳ lọc theo deadline, đúng/trễ hạn đi qua luồng Hoàn thành thật, công ty B không thấy người của A |
| `project-kind` | `project-kind.test.mjs` | Phòng ban vận hành (`kind: 'team'`): tạo không cần ngày, `endDate` bị gỡ hẳn khi chuyển sang team, chuyển ngược thiếu ngày thì 400. Việc của team vào tải nhưng tối ưu "Tất cả dự án" không phân công lại nó |
| `project-lifecycle` | `project-lifecycle.test.mjs` | Vòng đời dự án. **Lưu trữ**: 409 khi còn việc mở / việc lặp lại đang bật (kèm số lượng), ẩn khỏi danh sách mặc định, chỉ đọc trên mọi đường ghi (tạo, sửa, đổi trạng thái, bình luận, xóa, chuyển và nhân bản việc vào) nhưng đọc vẫn được, mở lại thì ghi lại được. **Nhân bản**: ngày dời đúng khoảng, đủ nhóm / việc / việc con, phụ thuộc và việc con trỏ sang bản sao, bỏ người. **Mẫu**: không có thành viên, không nhận việc có người thực hiện, không làm đổi số việc ở danh sách, thống kê, dashboard và readiness; tối ưu trên mẫu trả 400 |
| `socket` | `socket.test.mjs` | Socket.IO: từ chối kết nối thiếu/sai token, tách room theo user, nhận `notification:new` và `notification:read`, đối chiếu với bản ghi trong DB. Tài khoản bị vô hiệu hóa: socket đang mở bị ngắt ngay, token cũ (còn hạn) không mở được socket mới |
| `notify-session` | `notify-session.test.mjs` | **Tác dụng phụ**, không phải response: bình luận / thêm người theo dõi / tạo việc con / đổi deadline (cả hai đường) / đánh dấu Thất bại có thực sự sinh ra bản ghi thông báo không, ai nhận (người thực hiện và người theo dõi, không phải người thao tác), nội dung có lý do không, và phiên đăng nhập có liệt kê + thu hồi được không. Cả bốn lỗi bộ này giữ đều từng trả 200 với body hợp lệ, nên bộ nào chỉ assert mã trạng thái sẽ không thấy gì |
| `email` | `email.test.mjs` | Tầng email ở mức đơn vị: **mặc định tắt** khi thiếu cấu hình (không được làm hỏng luồng giao việc), chỉ loại "được giao việc" mới gửi mail. Không cần server, database hay SMTP |
| `sanitize` | `sanitize.test.mjs` | `middleware/sanitize.js` ở mức đơn vị: cắt đúng khóa toán tử Mongo và khóa gây ô nhiễm prototype, **không đụng** vào dữ liệu hợp lệ |
| `cors` | `cors.test.mjs` | `config/cors.js` ở mức đơn vị: nhiều origin trong `CLIENT_URL` có tác dụng như nhau ở REST và Socket.IO, production chỉ nhận origin đã khai, dev nhận thêm IP mạng LAN đủ bốn nhóm số |
| `migrate-guest-company` | `migrate-guest-company.test.mjs` | Quyết định của script migrate khách cũ ở mức đơn vị: chỉ quy về công ty khi dự án của khách trỏ về đúng một công ty; thuộc hai công ty hoặc không có dấu vết thì báo ra, không đoán; `--default-company` không gán ép khách đang mâu thuẫn |
| `migrate-completed-at` | `migrate-completed-at.test.mjs` | Quyết định của script bù `completedAt` ở mức đơn vị: mốc lấy từ `reviewRequestedAt`, không có thì từ nhật ký hoạt động — lần vào Hoàn thành của lượt xong **cuối**, sửa tiếp sau khi đã xong không tính. Không có nhật ký, hoặc nhật ký kết thúc ở trạng thái khác, thì báo ra chứ không đoán bằng `updatedAt`; việc đã có mốc hoặc chưa xong thì không đụng. Không cần server lẫn database |
| `regex-search` | `regex-search.test.mjs` | Gửi `(`, `[`, `*`, `\` vào tham số tìm kiếm của 7 endpoint: phải trả 200 chứ không 500, khớp theo nghĩa đen, và mẫu ReDoS `(a+)+$` trả lời ngay |
| `error-handler` | `error-handler.test.mjs` | Bộ bắt lỗi toàn cục ở mức đơn vị — chính nó từng ném lỗi với lỗi `insertMany` trùng khóa, trả 500 rỗng |
| `refresh-token` | `refresh-token.test.mjs` | `classifyToken` ở mức đơn vị cho mọi nhánh, cộng gọi API thật tự giữ cookie: xoay vòng, thu hồi, phát hiện tái sử dụng, ân hạn đa tab, refresh token trong body chỉ cho client tự khai `X-Client-Type: mobile` |
| `task-permissions` | `task-permissions.test.mjs` | Ma trận phân quyền thao tác trên công việc theo tài liệu Base Wework |
| `followers` | `followers.test.mjs` | Người theo dõi: trần số lượng, ai được gỡ ai, và người theo dõi **không** sinh ra khối lượng công việc |
| `task-failed` | `task-failed.test.mjs` | Trạng thái Thất bại: dự án phải bật, bắt buộc có lý do, không nhảy thẳng từ "Chờ đánh giá", và vết để lại trong DB |
| `task-review` | `task-review.test.mjs` | Luồng Chờ đánh giá có SLA: các bước chuyển, và đúng/trễ hạn tính theo lúc **người làm** bấm hoàn thành |
| `task-status-paths` | `task-status-paths.test.mjs` | Hai đường đổi trạng thái (`PATCH /:id/status` và `PUT /:id` của form sửa) qua **cùng** chốt: tự kết luận xong khi dự án bật đánh giá, Thất bại khi dự án tắt / thiếu lý do / sai vai đều bị chặn trên `PUT`; người được phép vẫn làm được; lưu lại form giữ nguyên trạng thái không bị chặn. `completedAt` được ghi trên mọi đường sang `done` (giữ mốc lúc nộp nếu đi từ Chờ đánh giá), và không ghi được từ body |
| `bulk-reassign` | `bulk-reassign.test.mjs` | Bàn giao hàng loạt: đúng phạm vi — không cuốn theo việc ở dự án khác, không viết lại việc đã đóng |
| `dependency-types` | `dependency-types.test.mjs` | Loại quan hệ phụ thuộc: dạng mới `{ task, type }` và mảng id phẳng cũ cùng đi qua một đường |
| `department-wework` | `department-wework.test.mjs` | Quản lý phòng ban theo tài liệu Base Wework |
| `hardening` | `hardening.test.mjs` | Các bản vá lớp e2e không chứng minh được: phân lập công ty, rò mật khẩu, validate payload, vai trò "khách" trong dự án |
| `company-isolation` | `company-isolation.test.mjs` | Dựng công ty B mới rồi cho admin của nó thao tác lên dữ liệu công ty A chỉ bằng id: task, dự án, nhân sự, phòng ban, tối ưu hóa (cả bảng trước/sau bên analytics), nhật ký, nhóm việc, việc lặp lại, nhập Excel. Mọi đường phải 403. Thêm phía **đích** của di chuyển công việc: dự án công ty khác, dự án người gọi không thuộc, nhóm của dự án khác — mỗi ca kiểm độc lập, ca chuyển sang công ty khác để cuối vì nếu lỗ còn thì nó kéo đổ các ca sau |
| `optimize-pm` | `optimize-pm.test.mjs` | Tối ưu hóa cho PM, thu hẹp theo dự án có `Project.manager` là họ. Không chọn dự án ("Tất cả dự án") hoặc chọn dự án người khác → 403 ở cả ba thuật toán lẫn mức sẵn sàng; member vẫn bị chặn. Trên dự án mình: chạy, xem, áp dụng, hoàn tác được. Kết quả trên dự án người khác hoặc toàn công ty: không có trong lịch sử, xem / áp dụng / hoàn tác / so sánh đều 403, admin vẫn thấy như cũ. Benchmark: dữ liệu tổng hợp chạy được, dữ liệu thật của cả công ty hay của dự án người khác → 403 |
| `attachments` | `attachments.test.mjs` | Đính kèm tệp trên công việc: tải lên → danh sách → tải về đúng byte và đúng tên có dấu; giới hạn kiểu, cỡ tệp và tối đa 20 tệp mỗi việc; phân lập công ty; tệp phải thuộc đúng công việc trong URL; quyền xóa theo đúng quy tắc của bình luận; dự án lưu trữ chỉ đọc; nhân bản việc không chép tệp; xóa việc hoặc xóa dự án (force) thì tệp trên đĩa cũng mất, không để lại tệp mồ côi |
| `custom-fields` | `custom-fields.test.mjs` | Trường dữ liệu tùy chỉnh theo dự án (văn bản, số, ngày, chọn một). **Khai**: quản lý dự án khai được, thành viên thì không; tên trùng, kiểu lạ, chọn một thiếu lựa chọn, quá 20 trường, đổi kiểu trường đã có → 400 và không đổi gì. **Giá trị**: tạo / sửa việc kiểm đúng kiểu, lựa chọn, trường bắt buộc, key sai dạng; null hay rỗng là xóa; người thực hiện chỉ sửa được khi dự án cho sửa tiêu đề/mô tả. **Lọc** theo trường chọn một. **Đổi định nghĩa**: đổi tên giữ key và giá trị, bỏ lựa chọn hoặc xóa trường thì giá trị biến mất. Nhân bản giữ cả định nghĩa lẫn giá trị, chuyển dự án thì bỏ giá trị cũ. **Excel**: mẫu có cột theo trường của dự án, sai một dòng thì không tạo việc nào. Dự án lưu trữ → 409 |

## Viết thêm bộ mới

Dùng chung `helpers.mjs` để thống nhất cách đếm và in kết quả:

```js
import { call, login, ok, section, summary } from './helpers.mjs';

const token = await login('admin@rao.com');

section('Tên nhóm kiểm thử');
const res = await call('GET', '/projects', { token });
ok(res.status === 200, 'GET /projects → 200');

process.exit(summary() ? 1 : 0);
```

Sau đó thêm một dòng vào mảng `SUITES` trong `run.mjs`.

Quy ước:

- Bộ test **tự tạo fixture của mình và tự dọn**, không dựa vào bản ghi cụ thể nào
  trong dữ liệu mẫu ngoài các tài khoản đăng nhập.
- Nếu cần chọn một bản ghi từ dữ liệu mẫu, hãy lọc theo điều kiện thay vì lấy phần tử
  đầu tiên — dữ liệu mẫu có thể đổi.
- `call()` trả về `{ status, ...body }`. Với endpoint mà body cũng có field tên
  `status` (như `/health`), truyền `raw: true` để lấy `{ status, json }`.
