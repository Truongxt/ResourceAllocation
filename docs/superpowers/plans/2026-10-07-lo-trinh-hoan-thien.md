# Lộ trình hoàn thiện RAO sau đợt đối chiếu Base Wework

> Nguồn: [COMPARISON_BASE_WEWORK.md](../../COMPARISON_BASE_WEWORK.md) (mục 4, 6),
> [ALGORITHMS.md](../../ALGORITHMS.md) (S1/S3, all-different), [API.md](../../API.md) (snapshot workload).
> Lập ngày 2026-10-07, nhánh `Mr.Tien`.

Mười hạng mục, chia thành chín giai đoạn. Mỗi giai đoạn tự chạy được, tự có test, và
được commit riêng. Chỉ giai đoạn đang làm mới có plan chi tiết. Lý do: các giai đoạn sau
phụ thuộc vào những gì giai đoạn trước để lại, nên viết chi tiết trước sẽ phải viết lại.

## Trạng thái (cập nhật 2026-10-09)

**Ưu tiên hiện tại (chốt với người dùng ngày 2026-10-08): hoàn thành chương trình trước, sửa luận văn sau.**

### Điểm dừng (2026-10-09)

**Tạm dừng theo yêu cầu người dùng: ghi nhận trạng thái, chưa làm tiếp.** 9/10 giai đoạn đã xong (GĐ1–9).
Còn lại:

- **GĐ10 (react-router v7) — chưa bắt đầu**, chờ người dùng quyết có chấp nhận đổi API router không. Xem ghi
  chú GĐ10 ở cuối file để biết phạm vi.
- **Việc dở** ở mục "Chưa làm" bên dưới: hai việc khi triển khai (cron/`JOB_SECRET`, `UPLOAD_DIR`), phần còn
  lại của trường tùy chỉnh, và báo cáo luận văn (để sau cùng).
- **Chưa thử trên điện thoại thật** (jest giả lập module native, Metro đóng gói Android thành công):
  - Tab "Tệp": hộp chọn tệp (`expo-document-picker`) và bảng mở/lưu tệp (`expo-sharing`). Ba thư viện mới có
    sẵn trong Expo Go; development build thì phải build lại app.
  - Ô trường tùy chỉnh khi tạo việc ở màn Lịch và chi tiết dự án (dùng chung component với màn Công việc,
    màn đó có test).
- **Commit chưa push** tại điểm dừng: `7b08975`, `913b911` và commit ghi điểm dừng này.

Số test ở lần chạy gần nhất (2026-10-09, sau GĐ7): server **37/37 bộ**, client **81/81** (cộng 7 bộ logic
thuần), mobile **38 + 14 + 3 + 13** (node thuần) **+ 40** (jest), e2e **93/93** (trọn bộ).

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
| — | Dọn tồn đọng, đợt hai | `fbbd5ab`, `178eb51`, `7f984e2`, `3662cdd`, `05acc0b` | Trùng index `companyName`; khôi phục `completedAt` (script + seeder); việc lặp lại sinh bù lượt lỡ (trần 31); PM chạy tối ưu theo dự án mình quản lý (server + web) |
| — | Dọn tồn đọng, đợt ba | `bd27c24`, `86ae1db`, `bd74ae1`, `7462d3f` | PM chọn sẵn dự án còn việc mở (`taskStats.openTasks`); mobile mở Tối ưu cho PM; đo lại S1/S3 bằng bộ sinh mới (`npm run measure:csp-soft`); e2e trọn bộ 91/91 |
| 7 | Trường dữ liệu tùy chỉnh | `48e57b4`, `ba1b910`, `85bfa0a`, `bce63b9`, `60791c1`, `7b08975` | [plan](./2026-10-09-truong-tuy-chinh.md). Văn bản, số, ngày, chọn một (người dùng chốt 2026-10-09); form, chi tiết, lọc, CSV, Excel; mobile điền và sửa giá trị |
| 8 | Đính kèm tệp thật | `39a7f3c`, `651e4a8`, `be0aa20`, `09de812`, `5177a20` | [plan](./2026-10-09-dinh-kem-tep.md). Web và mobile; lưu đĩa (`UPLOAD_DIR`), 10 MB/tệp, 20 tệp/việc |
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
| Mobile: màn Tối ưu gọi `POST /optimization/run` (không tồn tại) nên chưa từng chạy được; độ khớp kỹ năng nhân thêm 100; số giả khi thiếu dữ liệu; lịch sử đọc `status === 'applied'` (trường thật là `isApplied`) | `86ae1db` |
| Bài test `jobs` lấy "hôm nay" theo UTC, đỏ oan từ 00:00 đến 07:00 giờ VN | `7462d3f` |
| Bài test `app-routing` (client) đỏ oan khi chạy cả bộ: chỉ chờ 1 giây cho Vite biên dịch chunk Dashboard | `6de20b4` |
| Trang Công việc chỉ tải 20 dự án (gọi `GET /projects` không kèm `limit`): dự án thứ 21 trở đi mất khỏi ô lọc, ô chọn dự án | `bce63b9` |
| Tệp đính kèm thành mồ côi trên đĩa khi ghi bản ghi DB lỗi, và khi e2e seed lại database mà giữ thư mục tệp | `be0aa20` |

### Chưa làm

**Các giai đoạn còn lại** — mỗi giai đoạn cần người dùng quyết trước khi làm:

| # | Giai đoạn | Cần quyết |
|---|-----------|-----------|
| 10 | react-router v7 | Có chấp nhận đổi API router không |

**Việc dở, chưa làm** (cập nhật 2026-10-09, theo thứ tự nên làm):

1. **Khi triển khai phải cấu hình cron và `JOB_SECRET`** (README mục "Job định kỳ"). Thiếu thì hai job không bao
   giờ chạy; Dashboard cảnh báo Owner/Admin khi có job `stale` (`ca15897`). Môi trường có dữ liệu từ trước
   `152df0e` thì chạy `npm run migrate:completed-at` (chạy khô trước), rồi `-- --apply`.
2. **Trường tùy chỉnh — phần còn lại** (GĐ7 bản đầu): việc con và việc lặp lại không kiểm trường bắt buộc;
   chưa có kiểu công thức, nhiều lựa chọn, và bộ trường cho Kết quả công việc như Base. Mobile điền và sửa
   được giá trị (`7b08975`), nhưng khai trường chỉ trên web.
3. **Khi triển khai phải đặt `UPLOAD_DIR`** vào thư mục được sao lưu, không bị xóa khi deploy lại (README mục
   "Tệp đính kèm"). Sao lưu database mà thiếu thư mục này thì tệp tải về báo không còn.
4. **Báo cáo luận văn dùng số đo cũ** — để sau cùng theo quyết định ngày 2026-10-08. `docs/build_thesis_report.py`
   dòng 503–509 và 527 (kéo theo file `.docx`/`.pdf`) ghi "GA dừng sau 119 thế hệ, Hybrid 90, giảm ~24%". Số đúng:
   76.3 / 51.8 thế hệ dừng (Hybrid ít hơn ~32%), hội tụ 90% ở thế hệ 13.9 / 1.8. Fitness 0.8530 cả hai. Báo cáo
   cũng chưa có S1/S3, `contextSwitches`, bộ sinh dữ liệu mới, ngưỡng 0.5 của Benchmark và các bản sửa ở bảng trên.
   Số mới của S1/S3 đã có (ALGORITHMS.md mục 2.3, `bd74ae1`).

**Đã quyết ngày 2026-10-09:**

- **Giữ nguyên trọng số S1/S3** (`SOFT_WEIGHTS` trong `CSPSolver.js`). Số đo mới (medium, ngưỡng 0.5): khớp
  kỹ năng 85 → 94%, chuyển ngữ cảnh 60.6 → 33.8, fitness 0.796 → 0.820, σ tải 16.4 → 18.3 giờ. Fitness — đã gồm
  cân tải 0.30 — tăng ở cả bốn ô; σ tăng không gây quá tải vì H1 vẫn chặn vượt capacity; trọng số chỉ tác động
  CSP chạy riêng (Hybrid lấy miền, không lấy thứ tự), ai cần tải đều dùng GA/Hybrid. Lý lẽ cho luận văn: CSP xếp
  ứng viên theo đúng tỉ lệ trọng số của fitness.
- **Database dev:** việc "Thiết kế Design System & Wireframes" được sửa tay, `completedAt = updatedAt` (lúc
  seeder tạo). Dữ liệu mẫu nên lấy mốc gần đúng được; script migrate vẫn không đoán trên dữ liệu thật.

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
- **GĐ10**: cần chạy lại cả `client/tests` lẫn `e2e` sau khi nâng cấp. Phạm vi đo ngày 2026-10-09: đang dùng
  `react-router-dom ^6.26.0`, 17 file import nó; dùng `Route` (23 chỗ), `useNavigate` (22), `Navigate` (7),
  `useLocation` (6), `useSearchParams` (4), `useParams` (2), `Routes`/`BrowserRouter` (3 mỗi loại); `Link` đếm
  được 26 nhưng có thể lẫn `Typography.Link` của antd. Chưa bật cờ `future` nào: test client đang in cảnh báo
  `v7_startTransition` và `v7_relativeSplatPath`. Cách ít rủi ro: bật hai cờ đó trên v6 trước, chạy lại toàn bộ
  test, rồi mới đổi gói sang `react-router` v7.
