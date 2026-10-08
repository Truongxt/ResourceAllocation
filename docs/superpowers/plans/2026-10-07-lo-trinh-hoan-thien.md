# Lộ trình hoàn thiện RAO sau đợt đối chiếu Base Wework

> Nguồn: [COMPARISON_BASE_WEWORK.md](../../COMPARISON_BASE_WEWORK.md) (mục 4, 6),
> [ALGORITHMS.md](../../ALGORITHMS.md) (S1/S3, all-different), [API.md](../../API.md) (snapshot workload).
> Lập ngày 2026-10-07, nhánh `Mr.Tien`.

Mười hạng mục, chia thành chín giai đoạn. Mỗi giai đoạn tự chạy được, tự có test, và
được commit riêng. Chỉ giai đoạn đang làm mới có plan chi tiết. Lý do: các giai đoạn sau
phụ thuộc vào những gì giai đoạn trước để lại, nên viết chi tiết trước sẽ phải viết lại.

## Trạng thái (cập nhật 2026-10-08)

| # | Giai đoạn | Trạng thái |
|---|-----------|------------|
| 1 | Dự án loại "team" | ✅ **Xong** — `57a8e9a`. Server 27/27 bộ, client 37/37, e2e `03-projects` 10/10 |
| 2 | Báo cáo kết quả theo người | ✅ **Xong** — [plan](./2026-10-08-bao-cao-ket-qua-theo-nguoi.md). Server 29/29 bộ, client 40/40 |
| 3 | Xuất công việc + thông báo Thất bại/đổi deadline | ✅ **Xong** — [plan](./2026-10-08-xuat-cong-viec-va-thong-bao.md). Server 29/29 bộ, client 41/41, e2e 87/87 |
| 4 | Vòng đời dự án | ✅ **Xong** — [plan](./2026-10-08-vong-doi-du-an.md). Server 31/31 bộ, client 46/46, e2e 88/88 |
| 5 | Thuật toán phần 1 (S1/S3, hội tụ) | ✅ **Xong** — [plan](./2026-10-08-thuat-toan-phan-1.md). Số đo trước/sau ở ALGORITHMS.md mục 2.3 và 3.3 |
| 6 | Thuật toán phần 2 (snapshot, Régin) | ⏳ Chưa làm — cần chọn cách chạy job định kỳ |
| 7 | Trường dữ liệu tùy chỉnh | ⏳ Chưa làm — cần spec riêng |
| 8 | Đính kèm tệp thật | ⏳ Chưa làm — cần chọn đĩa hay S3 |
| 9 | Mobile Gantt + test giao diện | ⏳ Chưa làm |
| 10 | react-router v7 | ⏳ Chưa làm |

Làm ngoài lộ trình, cùng ngày: **chặn id của công ty khác trong body/query** (`3d93981`). Đây là
phần đang dở trước khi lập lộ trình; nay đã commit, và `cross-company-refs` đạt 62/62.

### Phát hiện trong lúc làm, đã xử lý ngày 2026-10-08

- **`runBenchmark` đọc được dữ liệu của công ty khác** khi chạy trên "dữ liệu thật". Nay hàm
  truyền `req.user`, và `loadOptimizationData` luôn lọc theo công ty. Có test trong
  `cross-company-refs` (64/64).
- **Nhánh "người không phải admin" trong `loadOptimizationData`** là code chết, nay đã xóa.
  Nếu muốn PM chạy được tối ưu thì phải nới `authorizeApp('optimize')`, và khi đó cần viết lại
  phần thu hẹp phạm vi theo dự án của người gọi.

### Phát hiện trong giai đoạn 3

- ✅ **`PUT /tasks/:id` đổi được `status` mà không qua chốt nào** — đã vá ngày 2026-10-08 (bộ
  `task-status-paths`). Tái hiện bằng request thật: người thực hiện tự kết luận xong khi dự án bật
  đánh giá, và tự đánh Thất bại không lý do dù không được phép. Cùng đợt vá thêm: kéo thẻ Kanban
  sang Hoàn thành không ghi `completedAt`, và `PUT` ghi được `completedAt` từ body. Việc đã xong
  trước bản vá vẫn không có mốc. Nếu cần, có thể khôi phục mốc từ nhật ký hoạt động
  (`UPDATE_TASK_STATUS` sang `done` có thời điểm), nhưng chưa làm.
- ✅ **Màn Công việc chỉ hiện 50 việc đầu mà không báo** — đã sửa ngày 2026-10-08. Rà ra thì Lịch
  (100), Gantt (100) và tìm kiếm toàn cục (50) cũng mắc cùng lỗi. Cả bốn nay dùng
  `taskService.getAllPages` (trần 1000 việc), và màn Công việc báo khi chạm trần.

## Lộ trình

| # | Giai đoạn | Cỡ | Vì sao đứng ở vị trí này | Cần quyết định trước |
|---|-----------|----|--------------------------|----------------------|
| 1 | **Dự án loại "team"** (việc thường ngày) — [plan](./2026-10-07-du-an-loai-team.md) | S | Là hạng mục duy nhất sửa được **đầu vào** của thuật toán | — |
| 2 | **Báo cáo kết quả theo người** — `GET /analytics/performance` + tab Reports | S | Đã có một nửa (`getProductivitySummary`); còn thiếu khoảng thời gian, `scope`, trễ hạn, gia hạn | — |
| 3 | **Xuất công việc** (CSV + in Gantt) và **thông báo khi Thất bại / đổi deadline** | S | Dùng lại tiện ích CSV và `window.print()` đã có | — |
| 4 | **Vòng đời dự án** — `isArchived`, nhân bản, mẫu thật (`isTemplate`) | M | Ghép từ `duplicateTask` + `TaskGroup` đã có | — |
| 5 | **Thuật toán, phần 1** — ràng buộc mềm S1/S3, chỉ số tốc độ hội tụ | M | Không đổi schema; đo được bằng benchmark sẵn có | — |
| 6 | **Thuật toán, phần 2** — ảnh chụp workload định kỳ, all-different (Régin) | M | Snapshot cần job định kỳ; Régin cần xác định trước phạm vi áp dụng (xem ghi chú) | Chạy job bằng gì |
| 7 | **Trường dữ liệu tùy chỉnh** | L | Lan sang form, Excel, bộ lọc, CSV; cần spec riêng | Danh sách kiểu trường cho bản đầu |
| 8 | **Đính kèm tệp thật** | M | Cần chọn hạ tầng lưu trữ | Lưu đĩa hay S3; trần dung lượng |
| 9 | **Mobile** — màn Gantt, test giao diện | M | Độc lập với server | — |
| 10 | **react-router v7** | M | Thay đổi phá vỡ tương thích; nên tách nhánh riêng | Có chấp nhận đổi API router không |

Màn **Lịch** trên mobile đã có (`mobile/src/screens/calendar/CalendarScreen.js`), nên không còn trong lộ trình.

## Ghi chú cho các giai đoạn sau

- **GĐ2**: dùng `completedAt` chứ không dùng `reviewedAt` để tính đúng hạn — quy ước đã ghi trong `Task.js`.
  Phạm vi `subordinates` đọc `User.manager`, giống `scope=subordinates` của `GET /tasks`.
- **GĐ6, Régin**: all-different chỉ áp được lên những **tập task không được dùng chung một
  người** (ví dụ cặp phụ thuộc theo H4, hoặc các việc trùng giờ khi capacity chỉ đủ một việc).
  Bài toán gốc cho phép một người nhận nhiều việc, nên không thể áp all-different lên toàn bộ biến.
  Trước khi code phải liệt kê được các tập như vậy trong dữ liệu thật; nếu không có thì ghi nhận và bỏ.
- **GĐ7**: kiểu **công thức** để sau cùng, vì đó là một trình đánh giá biểu thức chứ không phải một kiểu trường.
- **GĐ10**: cần chạy lại cả `client/tests` lẫn `e2e` sau khi nâng cấp.
