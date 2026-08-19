# Kiểm thử

Phần lớn các bộ ở đây gọi vào một server thật đang chạy, trên một database riêng,
và assert trên nội dung response chứ không chỉ mã HTTP. Riêng bộ `csp` là kiểm thử
đơn vị: nạp thẳng class thuật toán và chạy trên dữ liệu dựng sẵn.

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

## Các bộ

| Bộ | File | Phạm vi |
|----|------|---------|
| `csp` | `csp.test.mjs` | Ràng buộc H3 và H4 của CSPSolver ở mức đơn vị: loại nhân sự có kỳ nghỉ giao với task; cấm cùng người khi hai việc phụ thuộc nhau và chồng lịch, cho phép khi nối tiếp, báo lại vi phạm thứ tự ngày. Không cần server lẫn database |
| `api` | `api.test.mjs` | Toàn bộ REST API: health, xác thực, phân quyền 3 role, CRUD Projects/Tasks/Resources/Departments, 3 thuật toán tối ưu hóa, Analytics, Notifications, ActivityLog, dọn dữ liệu theo tầng |
| `project-detail` | `project-detail.test.mjs` | Các API trang chi tiết dự án dùng, theo đúng thứ tự UI gọi, gồm cả nhánh lỗi và ranh giới phân quyền |
| `socket` | `socket.test.mjs` | Socket.IO: từ chối kết nối thiếu/sai token, tách room theo user, nhận `notification:new` và `notification:read`, đối chiếu với bản ghi trong DB |

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
