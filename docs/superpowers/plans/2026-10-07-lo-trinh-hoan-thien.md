# Lộ trình hoàn thiện RAO sau đợt đối chiếu Base Wework

> Nguồn: [COMPARISON_BASE_WEWORK.md](../../COMPARISON_BASE_WEWORK.md) (mục 4, 6),
> [ALGORITHMS.md](../../ALGORITHMS.md) (S1/S3, all-different), [API.md](../../API.md) (snapshot workload).
> Lập ngày 2026-10-07, nhánh `Mr.Tien`.

Mười hạng mục, chia thành chín giai đoạn. Mỗi giai đoạn tự chạy được, tự có test, và
được commit riêng. Chỉ giai đoạn đang làm mới có plan chi tiết. Lý do: các giai đoạn sau
phụ thuộc vào những gì giai đoạn trước để lại, nên viết chi tiết trước sẽ phải viết lại.

## Trạng thái (cập nhật 2026-10-08)

**Ưu tiên hiện tại (chốt với người dùng ngày 2026-10-08): hoàn thành chương trình trước, sửa luận văn sau.**

Số test ở lần chạy gần nhất (sau đợt dọn tồn đọng, 2026-10-08): server **33/33 bộ**, client **58/58** (cộng 4
bộ logic thuần), mobile **35 + 14 + 10 jest**. e2e **88/88** khi chạy trọn bộ sau GĐ4. Sau đó có thêm 1 bài e2e (Benchmark Studio), đã chạy
riêng theo file và đạt. **e2e chưa chạy lại sau đợt dọn tồn đọng.**

### Đã làm

| # | Giai đoạn | Commit | Ghi chú |
|---|-----------|--------|---------|
| 1 | Dự án loại "team" | `57a8e9a` | [plan](./2026-10-07-du-an-loai-team.md) |
| 2 | Báo cáo kết quả theo người | `d7f9eab`, `713c23c` | [plan](./2026-10-08-bao-cao-ket-qua-theo-nguoi.md). `GET /analytics/performance` + tab "Kết quả theo người" |
| 3 | Xuất công việc + thông báo Thất bại/đổi deadline | `f6dfd79`, `e8d265b`, `755097c`, `fda1c39` | [plan](./2026-10-08-xuat-cong-viec-va-thong-bao.md). CSV theo bộ lọc, in Gantt trọn trục thời gian, `task_failed` / `task_deadline_changed` |
| 4 | Vòng đời dự án | `7faaadd`, `d3cf283`, `c8055f9` | [plan](./2026-10-08-vong-doi-du-an.md). Lưu trữ (chỉ đọc), nhân bản, dự án mẫu |
| 5 | Thuật toán phần 1 (S1/S3, hội tụ) | `1c73ee0`, `b13e3c0` | [plan](./2026-10-08-thuat-toan-phan-1.md). Số đo trước/sau ở ALGORITHMS.md mục 2.3 và 3.3 |
| 6 | Thuật toán phần 2 (job, snapshot, Régin) | `0bae0f4`, `9e946f9` | [plan](./2026-10-08-job-dinh-ky-va-thuat-toan-phan-2.md). Job qua endpoint nội bộ + cron ngoài; ảnh chụp workload; Régin đo rồi bỏ (clique lớn nhất = 2) |
| — | Dọn tồn đọng nhỏ | `8b01b01`, `ca15897`, `edd9847`, `66c1660`, `72d31a4`, `f5b8b00` | Nút ở dạng thẻ màn Dự án; cảnh báo job `stale` trên Dashboard; bộ sinh dữ liệu Benchmark theo vai trò; CSP tách hết ngân sách khỏi vô nghiệm; Benchmark Studio về ngưỡng 0.5 (người dùng chốt 2026-10-08) |
| 9 | Mobile: Gantt, test giao diện | `7be9ee8`, `2d486ab`, `a609ea5`, `172c062` | [plan](./2026-10-08-mobile-gantt.md). Gantt chỉ xem; jest-expo + RNTL; mobile tải đủ mọi trang |

**Lỗi phát hiện trong lúc làm và đã sửa** (mỗi lỗi đều được tái hiện trước khi sửa và có test giữ lại):

| Lỗi | Commit |
|-----|--------|
| Id của công ty khác lọt qua body/query (làm trước khi lập lộ trình) | `3d93981` |
| `runBenchmark` trên "dữ liệu thật" đọc được dữ liệu của mọi công ty | `a8e1c2d` |
| `PUT /tasks/:id` đổi trạng thái không qua chốt nào: tự kết luận xong khi dự án bật đánh giá, tự đánh Thất bại không lý do; ghi được `completedAt` từ body | `152df0e` |
| Kéo thẻ Kanban sang Hoàn thành không ghi `completedAt`, làm sai báo cáo kết quả | `152df0e` |
| Công việc / Lịch / Gantt / tìm kiếm chỉ thấy trang đầu (50–100 việc); chip "Bị chặn" luôn ra 0 | `51f0d5f` |
| Bản in Gantt bị cắt ngang và mất màu thanh; mọi trang in mất ~265px mép trái | `755097c` |
| CSV của Reports lệch cột khi tên có dấu `"` | `e8d265b` |
| Cột Hybrid của Benchmark Studio không chạy Hybrid (miền CSP truyền nhầm chỗ) | `1c73ee0` |
| GA báo số thế hệ theo mốc ghi lịch sử (bội số của 10), không phải thế hệ dừng thật | `1c73ee0` |
| "Việc lặp lại" chưa từng tự sinh việc (không ai gọi bộ sinh), và sinh trùng khi gọi song song | `0bae0f4` |
| Dạng thẻ ở màn Dự án: dự án lưu trữ còn nút sửa; quyền "Chỉ xem" còn thấy nút sửa/xóa | `8b01b01` |
| Bộ sinh dữ liệu Benchmark làm CSP vô nghiệm 0/30 bộ small (26% việc không ai đạt ngưỡng H2) | `edd9847` |
| CSP báo "vô nghiệm" khi chỉ chạm `maxIterations`/`timeout`, và đếm vượt trần (~10 250 bước) | `72d31a4` |
| Mobile: Công việc / chi tiết dự án chỉ thấy 50 việc đầu, Lịch chỉ thấy 100 | `2d486ab` |

### Chưa làm

**Các giai đoạn còn lại** — mỗi giai đoạn cần người dùng quyết trước khi làm:

| # | Giai đoạn | Cần quyết |
|---|-----------|-----------|
| 7 | Trường dữ liệu tùy chỉnh (lớn: lan sang form, Excel, bộ lọc, CSV) | Danh sách kiểu trường cho bản đầu |
| 8 | Đính kèm tệp thật | Lưu đĩa hay S3; trần dung lượng |
| 10 | react-router v7 | Có chấp nhận đổi API router không |

**Tồn đọng nhỏ, đã biết nhưng chưa xử lý:**

- **Báo cáo luận văn dùng số đo cũ** — để sau theo quyết định ngày 2026-10-08. `docs/build_thesis_report.py`
  dòng 503–509 và 527 (kéo theo file `.docx`/`.pdf`) ghi "GA dừng sau 119 thế hệ, Hybrid 90, giảm ~24%".
  Số đúng: 76.3 / 51.8 thế hệ dừng (Hybrid ít hơn ~32%), hội tụ 90% ở thế hệ 13.9 / 1.8. Fitness 0.8530 cả
  hai. Báo cáo cũng chưa có S1/S3, `contextSwitches` và các bản sửa ở bảng trên.
- **Khi triển khai phải cấu hình cron và `JOB_SECRET`** (README mục "Job định kỳ"). Thiếu thì hai job không
  bao giờ chạy. Dashboard đã cảnh báo Owner/Admin khi có job `stale` (`ca15897`).
- **Việc đã xong trước `152df0e` không có `completedAt`**, nên báo cáo kết quả các kỳ cũ xếp chúng vào "xong
  nhưng không có mốc". Có thể khôi phục từ nhật ký hoạt động (`UPDATE_TASK_STATUS` sang `done`). Cần người dùng
  quyết có làm không.
- **Các bảng trước/sau ở ALGORITHMS.md mục 2.3 đo bằng bộ sinh cũ.** Bộ sinh mới cho CSP giải được 16/30 small,
  19/30 medium ở ngưỡng 0.5 (cũ: 0/30, 5/30). Cần đo lại trước khi lấy số cho luận văn.
- **S1/S3 làm tải kém cân hơn** (σ medium 15.3 → 16.2). Nếu cần, chỉnh trọng số `SOFT_WEIGHTS` trong
  `CSPSolver.js` và đo lại bằng cách ở ALGORITHMS.md mục 2.3.
- **Job việc lặp lại sinh một lượt mỗi cấu hình mỗi lần gọi**: lỡ nhiều lượt thì các lần gọi sau đuổi kịp dần,
  không sinh bù một lần.
- **PM không chạy được tối ưu** (`authorizeApp('optimize')` chỉ cho Owner/Admin/App Admin). Muốn mở cho PM thì
  phải viết lại phần thu hẹp phạm vi theo dự án.
- Cảnh báo có sẵn từ trước: Mongoose báo trùng index `companyName` khi khởi động (không ảnh hưởng chạy).

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
