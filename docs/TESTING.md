# 🧪 Chiến lược kiểm thử

Dự án có **ba lớp kiểm thử**, mỗi lớp trả lời một câu hỏi khác nhau. Không lớp nào thay thế
được lớp nào.

| Lớp | Thư mục | Chạy bằng | Quy mô | Trả lời câu hỏi |
|-----|---------|-----------|--------|-----------------|
| Đơn vị + API | `server/tests/` | `npm test` trong `server/` | 18 bộ | Server trả đúng dữ liệu, đúng mã lỗi, thuật toán tính đúng không? |
| Component | `client/tests/` | `npm test` trong `client/` | 3 file logic + 8 file component | Component vẽ đúng, xử lý đúng sự kiện không? |
| Giao diện end-to-end | `e2e/` | `npm run test:e2e` ở gốc | 78 bài / 10 file | Ghép tất cả lại thì người dùng **dùng được** không? |

Hai lớp đầu chạy trong vòng vài phút. Lớp e2e mất khoảng **14 phút** (đo trên máy phát
triển, 1 worker) vì nó khởi động thật, đăng nhập thật và chờ API thật ở từng bài.

Chi tiết từng lớp:

- [`server/tests/README.md`](../server/tests/README.md) — 18 bộ, gồm cả kiểm thử đơn vị cho GA/CSP/scoring
- [`client/tests/README.md`](../client/tests/README.md) — logic thuần chạy bằng `node`, component chạy bằng vitest
- [`e2e/README.md`](../e2e/README.md) — 10 bộ điều khiển Chromium trên hệ thống thật

## Chạy tất cả

```bash
# Lớp 1 — cần MongoDB đang chạy
cd server && npm test

# Lớp 2 — không cần gì
cd client && npm test

# Lớp 3 — cần MongoDB; tự khởi động client + server
npm run test:e2e                    # ở thư mục gốc
npm run test:e2e:install            # lần đầu: tải trình duyệt cho Playwright
```

Ba lớp dùng **ba database và ba cặp cổng khác nhau**, nên chạy lớp nào cũng không đụng tới
môi trường phát triển:

| | Môi trường phát triển | `server/tests` | `e2e` |
|-|-----------------------|----------------|-------|
| Server | 5000 | 5099 | 5098 |
| Client | 5173 | — | 5174 |
| Database | `resource_allocation` | `resource_allocation_test` | `resource_allocation_e2e` |

## Vì sao cần lớp thứ ba

Hai lớp đầu chạy nhanh và chỉ thẳng ra chỗ hỏng. Nhưng cả hai đều kiểm **từng mảnh riêng**,
nên có một loại lỗi chúng không bao giờ bắt được: từng mảnh đều đúng, ghép lại thì sai.

Đợt dựng bộ e2e này tìm ra bốn lỗi thuộc đúng loại đó — chi tiết ở phần dưới. Không lỗi nào
trong số đó làm đỏ `server/tests` hay `client/tests`.

## Lỗi đã biết, đang được test theo dõi

Bốn bài test dưới đây mô tả hành vi **đúng** của những chỗ hiện đang sai, và được đánh dấu
`test.fail()`. Lượt chạy hiện tại chúng "đạt" ở dạng *expected failure*. Ngày ai đó sửa
xong, chính chúng sẽ chuyển sang **đỏ** — đó là lúc gỡ dấu `test.fail()`, xóa mục tương ứng
ở đây, và bài test trở thành bài chống tái phát bình thường.

### 1. Không tạo được dự án nếu chỉ điền các trường nhìn thấy được

**Ở đâu:** `client/src/pages/projects/Projects.jsx` ↔ `server/src/routes/project.routes.js:69`
**Test:** `e2e/tests/03-projects.spec.js`

`startDate` và `endDate` là **bắt buộc** ở server. Nhưng ô nhập chúng
(`Form.Item name="dateRange"`) nằm trong panel *"Cài đặt nâng cao"* đang thu gọn, và **không**
được đánh dấu `required` ở form. Người dùng mở modal, điền tên + PM (hai trường duy nhất có
dấu bắt buộc), bấm Tạo → nhận `400 Ngày bắt đầu là bắt buộc` dưới dạng toast, không có dòng
nhắc nào tại ô còn thiếu, mà ô đó thì đang bị gấp lại nên cũng không nhìn thấy.

Vì sao `server/tests` không bắt được: test API luôn gửi kèm `startDate`, nên nhánh này chưa
bao giờ được đi qua theo đúng cách người dùng đi.

**Hướng sửa:** thêm `rules={[{ required: true }]}` cho `dateRange`, và mở sẵn panel "Cài đặt
nâng cao" khi form chưa hợp lệ.

### 2. Phần trăm khớp kỹ năng hiện thành `10000%`

**Ở đâu:** `client/src/components/optimization/OptimizationResultView.jsx:107` và `:163`
**Test:** `e2e/tests/06-optimization.spec.js`

Server đã trả về thang **0–100**:

- `server/src/algorithms/scoring.js:162` — `averageSkillMatch: Math.round((…) * 100)`
- `server/src/algorithms/genetic/GeneticAlgorithm.js:289` — `skillMatch: Math.round(… * 100)`

Nhưng `OptimizationResultView` nhân thêm 100 lần nữa (`Math.round((match || 0) * 100)`), nên
cả thẻ KPI *"Khớp kỹ năng TB"* lẫn cột *"Độ khớp kỹ năng"* trong bảng phân công đều hiện
`10000%`.

Đáng chú ý: `OptimizationCompareView.jsx:148` **không** nhân — nó dùng thẳng
`Math.round(cell.skillMatch)`. Hai component đang hiểu khác nhau về cùng một con số, và cái
đúng là cái không nhân.

**Hướng sửa:** bỏ `* 100` ở cả hai chỗ trong `OptimizationResultView.jsx`.

### 3. ~~Giờ công của cùng một người lệch nhau giữa hai trang~~ — đã sửa

**Ở đâu:** `server/src/utils/seeder.js`
**Test:** `e2e/tests/07-analytics.spec.js`

Với dữ liệu mẫu, Trần Văn Nam hiện **0h / 40h** ở trang Nhân sự nhưng **32h / 40h** ở trang
Báo cáo. Hai trang đọc hai nguồn khác nhau:

| Trang | Nguồn |
|-------|-------|
| `/resources` | trường `currentWorkload` lưu sẵn trong collection `Resource` |
| `/reports` | cộng `estimatedHours` của task đang mở, tính ngay lúc gọi |

Chẩn đoán đầu tiên là sai, ghi lại đây vì nó là một cái bẫy đáng nhớ: nhìn thấy
`resourceService.recalculateWorkload()` không màn hình nào gọi, rất dễ kết luận rằng
`currentWorkload` không bao giờ được cập nhật. Thực tế **mọi đường ghi task qua API đều gọi
`syncResourceWorkload`** — kiểm bằng cách tạo một task qua `POST /api/tasks` rồi đọc lại
`/api/resources` thì thấy con số nhảy đúng.

Thủ phạm hẹp hơn nhiều: **seeder ghi task thẳng qua model, không đi qua controller**, nên
riêng dữ liệu mẫu không bao giờ được đồng bộ. Đã sửa bằng một lời gọi `syncResourceWorkload()`
ở cuối seeder.

Bài học: đừng suy ra hành vi runtime từ việc đọc code gọi hàm — chạy thử rồi đo.

### 4. Hai màn hình từ chối quyền khác nhau, một cái không có lối ra

**Ở đâu:** `client/src/components/common/ProtectedRoute.jsx`
**Test:** `e2e/tests/08-permissions.spec.js` (đã kiểm, chưa đánh `test.fail()` — đây là điểm
cần bàn về thiết kế chứ chưa hẳn là lỗi)

Member gõ thẳng URL vào trang bị cấm gặp hai màn hình khác hẳn nhau:

| URL | Chặn theo | Màn hình | Có lối quay ra? |
|-----|-----------|----------|-----------------|
| `/resources` | vai trò (`roles`) | "Không có quyền truy cập" | **Không** — không sidebar, không nút |
| `/optimization`, `/benchmark` | quyền ứng dụng (`app`) | "Chưa được phân quyền Quản trị ứng dụng (App Admin)" | Có — nút "Quay lại Tổng quan Dashboard" |

Màn hình thứ nhất là ngõ cụt: người dùng chỉ còn cách bấm nút Back của trình duyệt.

**Điểm làm đúng, cần giữ:** cả hai đều chặn **tại chỗ** chứ không đá về `/login`. Đá ra sẽ
trông như phiên hết hạn, người dùng đăng nhập lại rồi gặp đúng màn hình đó lần nữa.
`client/tests/protected-route.test.jsx` đã khóa hành vi này ở tầng component.

## Vấn đề nhỏ khác, ghi lại để khỏi quên

- **`VITE_SOCKET_URL` không có trong `.env.example`.** `client/src/context/SocketContext.jsx:8`
  đọc biến này, mặc định `http://localhost:5000`. Triển khai server ở cổng/host khác mà quên
  đặt thì **mọi thứ vẫn chạy bình thường**, chỉ có realtime âm thầm không kết nối — không có
  lỗi nào hiện ra trên giao diện. Đã bổ sung vào `.env.example`.
- **Seeder in sai số collection.** `server/src/utils/seeder.js` xóa **9** collection nhưng in
  `Cleared all 8 collections.` — `RefreshToken` được thêm sau mà dòng log và comment không
  được sửa theo.
- **Vài phần tử tương tác không có vai trò ARIA.** Ô mở tìm kiếm toàn cục
  (`client/src/components/layout/Header.jsx:271`) là một `div` bắt `onClick`, không phải
  `button`; thanh chuyển mục trong drawer chi tiết công việc cũng không dùng `role="tab"`.
  Hệ quả: không bấm được bằng bàn phím, trình đọc màn hình không đọc ra được, và bài test
  phải bám vào class thay vì vai trò.
- **Cảnh báo deprecated của Ant Design v6** hiện đầy console ở hầu hết trang:
  `dropdownRender` → `popupRender`, `destroyOnClose` → `destroyOnHidden`, `bodyStyle` →
  `styles.body`, `trailColor` → `railColor`, `strokeWidth` → `size`. Chưa hỏng gì, nhưng sẽ
  hỏng ở bản major kế tiếp.
- **Thông báo validate ở trang Đăng ký viết cứng tiếng Việt.** `client/src/pages/auth/Register.jsx`
  không dùng `t()` cho `message` của các `rules`, trong khi `vi.json`/`en.json` đã có sẵn
  nhóm khóa `auth.required.*`. Đổi sang tiếng Anh thì phần còn lại của trang dịch, riêng
  thông báo lỗi vẫn tiếng Việt. `client/tests/locales.test.mjs` không bắt được vì nó so
  hai file locale với nhau, không kiểm xem component có dùng chúng hay không.

## Ghi chú vận hành

### Biên thời gian của lớp component

`client/vite.config.js` đặt `testTimeout: 15_000` và `maxWorkers: 2`.

Lý do: render một modal/portal của Ant Design trong jsdom tốn 2–3 giây ngay cả lúc máy rảnh,
và đo lúc máy bận thì bài chậm nhất mất **4,5 giây** — trong khi `testTimeout` mặc định của
vitest đúng **5 giây**. Gần như không còn dư, nên bộ test đỏ ngẫu nhiên: mỗi lần một file
khác, mà chạy riêng file đó thì luôn đạt. Nâng ngưỡng cho gấp ba ca chậm nhất, và chặn worker
để chúng thôi giành CPU của nhau.

Quy tắc chẩn đoán: **đỏ vì timeout thì chạy riêng file đó trước khi đi tìm lỗi trong code.**
Đạt khi chạy riêng nghĩa là chuyện tài nguyên, không phải chuyện logic.

### Dung lượng đĩa và RAM

Bộ e2e chạy Chromium + Vite dev server + Node server + MongoDB cùng lúc. Trên máy còn ít
RAM trống, Chromium hay bị hệ điều hành giết giữa chừng và Playwright báo `Target crashed`.
Hai cách xử lý:

```bash
E2E_CLIENT_MODE=preview npx playwright test   # dùng bản build tĩnh, nhẹ hơn nhiều
```

Cấu hình cũng đặt `retries: 1` cho lượt chạy cục bộ — không phải để giấu test chập chờn
(báo cáo vẫn đánh dấu `flaky` cho bài nào chỉ đạt ở lượt thứ hai) mà để một lần trình duyệt
bị giết vì hết RAM không làm đỏ cả lượt chạy.

MongoDB cũng cần chỗ trống trên ổ chứa `dbPath`. Hết đĩa thì service **tự dừng** và mọi bộ
test cần database đều hỏng với `ECONNREFUSED` — trông giống hệt lỗi cấu hình, nên rất dễ đi
tìm nhầm chỗ. Gặp `ECONNREFUSED ::1:27017` thì kiểm ba thứ theo thứ tự này:

```bash
Get-Service MongoDB                       # service còn chạy không
Get-PSDrive C | Select-Object Free        # ổ chứa dbPath còn trống không
Start-Service MongoDB                     # cần PowerShell quyền admin
```

Chạy `server/tests` **ngay sau** bộ e2e cũng dễ vướng: server cần lâu hơn bình thường để lên
vì cache đĩa còn nguội. Trình chạy chờ tới 60 giây nên thường không sao, nhưng nếu vẫn hết
thời gian chờ thì đợi một lát rồi chạy lại trước khi nghi ngờ code.

### Kết quả lần chạy gần nhất

```bash
npx playwright show-report e2e/.report
```

Báo cáo HTML kèm ảnh chụp màn hình và trace của mọi bài hỏng. Xem trace bằng
`npx playwright show-trace <đường-dẫn>.zip` — nó tua lại từng bước, kèm DOM và network tại
mỗi thời điểm.
