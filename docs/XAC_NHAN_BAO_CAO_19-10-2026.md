# Danh sách cần xác nhận — báo cáo `218_110_Truong_Tien_TaiLieu_CapNhat_19-10-2026.docx`

> Lập ngày 19/10/2026, sau khi đối chiếu báo cáo với mã nguồn nhánh `Mr.Tien` (HEAD `b7d3b4d`).
> Đánh `[x]` vào mục đã xác nhận và ghi quyết định vào dòng **Trả lời**. Mục nào cần sửa, em sửa theo câu trả lời.
>
> **Cập nhật Word lần 2 (19/10/2026, sau `d7bacda`):** đã áp các mục có dòng **Đã cập nhật vào Word**. Các mục chưa có dòng này (B2, B4, B5, B6, C6, D1–D6, E, F3) vẫn chờ quyết định, Word chưa đổi.
>
> **Cập nhật Word lần 3 (19/10/2026, sau `b9c7525`):** đã áp các dòng **Cần sửa trong Word** của B1, B4/F3, C6, D1, D2, D5, F5 (mỗi mục có dòng "Đã cập nhật vào Word (lần 3)"). Word không còn mục nào chờ áp ngoài **D4** (chờ ngày nộp), **D6** (chưa chụp màn hình) và **E1–E4** (kiểm tay trong Word, sau khi F9).
>
> **Việc mới cho Word (19/10/2026 tối, sau `d56b8cf`):** mục **G** ở cuối file (G1–G7; G4 có số test cuối cùng, G5 là mobile, G6 là App Admin `work`, G7 là tự duyệt kết quả việc) — luật "PM chỉ có quyền PM trên dự án mình quản lý" (G2 Bảng 1-1 + mục 1.4.3, G3 Bảng 3-1 + mục 4.2 + đặc tả use case, G4 Bảng 4-2 + số module 4.249 + đoạn lỗi phân quyền).
>
> **Quyết định lần 2 (19/10/2026, sau `d250e6e`):** anh đã chốt toàn bộ theo đề xuất; mọi mục đều đã có dòng **Trả lời**. Việc còn phải làm trong Word nằm ở các dòng **Cần sửa trong Word** mới của: **B1** (câu dẫn Bảng 4-5), **B4/F3** (bốn ô Bảng 4-1), **C6** (ghi chú Hình 3-2), **D1** (câu ở 1.3), **D2** (mục 1.2, Bảng 4-6 mới, đánh lại số bảng 4-7, Kết luận), **D5** (câu Abstract) và **F5** (server 1.397 ca). Còn treo: **D4** (chờ ngày nộp), **D6** (chưa chụp màn hình), **E1–E4** (kiểm tay trong Word).
>
> **Đã kiểm lại ngày 19/10/2026** (cùng HEAD `b7d3b4d`): đọc code, chạy `vite build` và `npm run measure:csp-soft`, trích chữ trực tiếp từ file `.docx`. Kết quả ghi ở dòng **Kiểm tra** dưới từng mục. Mục **F** ở cuối liệt kê bốn chỗ sai mới phát hiện, chưa có trong danh sách ban đầu.

Mức độ:

- 🔴 **Sai so với code.** Em đã kiểm trong mã nguồn; cần anh đồng ý cách sửa.
- 🟠 **Số liệu.** Cần đo lại, hoặc em chưa tìm được nguồn đối chiếu.
- 🟡 **Diễn đạt suy ra.** Em viết dựa trên tài liệu (CHANGELOG, HR doc…) nhưng chưa đọc tới code.
- 🔵 **Quyết định của nhóm.**
- ⚪ **Hình thức.**

---

## A. 🔴 Sai so với code (có từ bản gốc, em chưa sửa)

### A1. Thành viên không chạy được tối ưu hóa

- [ ] **Vị trí:** Bảng 1-1, hai dòng "Chạy thuật toán đề xuất phân bổ nhân sự" và "So sánh các phương án tối ưu hóa đã chạy" (cột Thành viên đang ghi **Có**). Mục 1.4.1 "Các chức năng chung" có gạch đầu dòng "Chạy chức năng đề xuất phân bổ nhân sự và xem, so sánh kết quả các lần chạy".
- **Code:** `server/src/routes/optimization.routes.js` dòng 43–54. `router.use(resolveOptimizeScope)` cho mọi route `/api/optimization`. Owner, Admin và App Admin `optimize` dùng được trên toàn công ty; PM chỉ trên dự án mình quản lý; còn lại trả **403**.
- **Đề xuất:** đổi cột Thành viên thành "Không (trừ khi được cấp quyền quản trị ứng dụng Tối ưu hóa)". Chuyển gạch đầu dòng ở 1.4.1 sang mục Quản lý dự án và Quản trị viên.
- **Kiểm tra:** ✅ Đúng. Logic phạm vi ở `server/src/services/optimizeScope.js` dòng 16–27; phía giao diện, `hasAppAccess('optimize')` trong `client/src/context/AuthContext.jsx` dòng 127 dùng cùng logic. Bổ sung cho cột QLDA của hai dòng này: "Có (trong dự án mình quản lý)", vì PM chạy hoặc xem kết quả của dự án khác đều bị chặn.
- **Đã cập nhật vào Word (19/10):** Bảng 1-1: hai dòng tối ưu hóa ghi QLDA "Có (2)", Thành viên "Không (1)", kèm ghi chú dưới bảng; bỏ gạch đầu dòng chạy tối ưu ở 1.4.1.
- **Trả lời:**

### A2. Thành viên không vào được trang Nhân sự

- [ ] **Vị trí:** Bảng 1-1, dòng "Xem danh sách nhân sự và mức sử dụng năng lực" (Thành viên = **Có**). Mục 1.4.1: "Xem danh sách dự án, danh sách công việc và danh sách nhân sự".
- **Code:** `client/src/App.jsx` dòng 136 khai `/resources` với `roles={['admin','project_manager']}`. HR_PRODUCTIVITY_AND_EVALUATION.md cũng ghi "Thành viên không vào `/resources`". Ở phía API, `GET /api/resources` vẫn mở cho mọi người đã đăng nhập.
- **Đề xuất:** Thành viên = "Không (chỉ xem hồ sơ và tải của chính mình)". Có thể ghi chú rằng API vẫn đọc được.
- **Kiểm tra:** ✅ Đúng, nhưng ghi chú về API cần chính xác hơn. Với Thành viên, `GET /api/resources` chỉ trả **chính họ và người cùng dự án**, không trả cả công ty (`server/src/controllers/resource.controller.js` dòng 44–66). Nếu ghi chú thì viết: "API chỉ trả nhân sự cùng dự án với người gọi".
- **Đã cập nhật vào Word (19/10):** Bảng 1-1: Thành viên "Không (3)"; câu ở 1.4.1 thành "Xem danh sách dự án và danh sách công việc trong phạm vi được phép".
- **Trả lời:**

### A3. Lưu trữ, nhân bản dự án — PM có bị giới hạn theo dự án mình quản lý không?

- [x] **Vị trí:** Bảng 1-1, dòng mới "Lưu trữ, nhân bản dự án và tạo dự án từ mẫu" (QTV Có, QLDA Có); đặc tả UC-TH13.
- **Code:** `project.routes.js` dòng 179–181 chỉ ghi `authorize('admin', 'project_manager')`. Em chưa đọc controller để biết PM có bị chặn khi lưu trữ dự án của người khác hay không.
- **Cần anh xác nhận:** PM lưu trữ hoặc nhân bản được **mọi** dự án trong công ty, hay chỉ dự án mình quản lý?
- **Kiểm tra:** PM làm được trên **mọi dự án trong công ty**. Cả `archiveProject`, `unarchiveProject` và `duplicateProject` đều đi qua `loadOwnProject` (`server/src/controllers/project.controller.js` dòng 867–879). Hàm này chỉ kiểm dự án cùng công ty, không kiểm PM có phải `Project.manager` hay không. Bảng 1-1 ghi "Có" là khớp code.
  - Nhóm cần biết điểm lệch: trường tùy chỉnh (cùng file, dòng ~990) và tối ưu hóa đều giới hạn PM theo dự án mình quản lý, còn lưu trữ và nhân bản thì không.
  - Phải chọn một: (a) giữ báo cáo như hiện tại; (b) sửa code cho PM chỉ thao tác trên dự án mình quản lý, rồi ghi "Có (dự án mình quản lý)".
- **Đã sửa code** (commit `d7bacda`): PM chỉ lưu trữ / mở lại được dự án mình quản lý, dự án khác trả 403; Admin/Owner như cũ. Nhân bản và tạo từ mẫu **vẫn mở** cho mọi dự án trong công ty, vì chỉ đọc dự án nguồn; nếu giới hạn, PM không dùng được mẫu do người khác tạo.
- **Cần sửa trong Word:**
  - Bảng 1-1: tách dòng "Lưu trữ, nhân bản dự án và tạo dự án từ mẫu" thành hai dòng.
    - "Lưu trữ, mở lại dự án": QTV Có, QLDA "Có (dự án mình quản lý)", Thành viên Không.
    - "Nhân bản dự án, tạo dự án từ mẫu": QTV Có, QLDA Có, Thành viên Không.
  - Đặc tả UC-TH13 (Bảng 3-17): thêm luồng ngoại lệ "PM lưu trữ hoặc mở lại dự án không do mình quản lý: hệ thống từ chối (403)".
- **Đã cập nhật vào Word (19/10):** Bảng 1-1 tách thành "Lưu trữ, mở lại dự án" (QLDA "Có (2)") và "Nhân bản dự án, tạo dự án từ mẫu"; mục 1.4.3 và mục 4.2 ghi lưu trữ do Admin hoặc người quản lý dự án; UC-TH13 sửa tiền điều kiện và thêm ngoại lệ 403.
- **Trả lời:** Đồng ý sửa code (19/10).

---

## B. 🟠 Số liệu

### B1. Số đo thuật toán đo trước lần gộp `main`

- [ ] **Vị trí:** Bảng 4-4 (GA/Hybrid: 0,8530; 76,3 / 51,8; 13,9 / 1,8), Bảng 4-5 (S1/S3), các đoạn ở mục 4.5 và Kết luận 5.1.
- **Lý do cần kiểm:** các số này đo ngày 08/10. Lần gộp ngày 19/10 sửa `CSPSolver.js`, `scoring.js` và `GreedyAllocator.js`: đổi `maxCapacity || 40` thành `maxCapacity ?? 40`, và `fte || 1` thành `fte ?? 1`. Nghĩa là capacity hoặc FTE bằng 0 nay được giữ là 0, không còn tự thành 40h / 1. Bộ sinh dữ liệu benchmark luôn có capacity khác 0, nên nhiều khả năng số không đổi, nhưng em chưa chạy lại để chắc chắn.
- **Đề xuất:** trong `server/`, chạy `npm run measure:csp-soft` cho Bảng 4-5 và `npm test hybrid` cho Bảng 4-4, rồi so lại với số trong báo cáo.
- **Kiểm tra — Bảng 4-5:** lần gộp **không** làm đổi số, nhưng bảng **không tái tạo được** nếu chạy vào ngày khác.
  - Chạy `npm run measure:csp-soft` ngày 19/10 cho kết quả khác ở **mọi dòng**:

    | Cấu hình | Báo cáo (08/10) | Chạy lại 19/10 |
    |---|---|---|
    | medium, ngưỡng 0,5 | 85 → 94; 60,6 → 33,8; 0,796 → 0,820; σ 16,4 → 18,3; **15 → 18/30** | 85 → 94; 60,1 → 33,2; 0,795 → 0,821; σ 17,0 → 18,2; **19 → 23/30** |
    | small, ngưỡng 0,5 | 92 → 95; 3,9 → 2,9; 0,793 → 0,796; σ 14,8 → 18,0; **15 → 15/30** | 91 → 95; 4,3 → 3,0; 0,795 → 0,802; σ 14,4 → 17,0; **23 → 23/30** |
    | medium, ngưỡng 0 | 30 → 93; 60,6 → 34,4; 0,604 → 0,820; σ 15,7 → 16,5; **25 → 30/30** | 32 → 93; 59,9 → 34,0; 0,609 → 0,821; σ 16,2 → 16,5; **28 → 28/30** |
    | small, ngưỡng 0 | 38 → 87; 4,3 → 3,4; 0,619 → 0,784; σ 12,5 → 14,4; **29 → 30/30** | 38 → 90; 4,4 → 2,9; 0,621 → 0,787; σ 11,6 → 15,4; **30 → 30/30** |

  - **Nguyên nhân:** bộ sinh dữ liệu lấy `new Date()` làm mốc (`server/src/algorithms/benchmark/datasetGenerator.js` dòng 139). Ngày của các công việc trượt theo ngày chạy, nên cách việc rơi vào từng tuần thay đổi, kéo theo ràng buộc H1 (capacity theo tuần). Phần `||` → `??` không ảnh hưởng, vì bộ sinh luôn đặt `maxCapacity: 40, fte: 1` (dòng 129–130).
  - **Đã xác nhận:** cố định đồng hồ về ngày 08/10/2026 rồi chạy code ở HEAD `b7d3b4d` thì ra **đúng từng số** của Bảng 4-5.
  - **Đề xuất cho báo cáo:** giữ số hiện tại, thêm "đo ngày 08/10/2026" vào câu dẫn của Bảng 4-5. Nếu hội đồng có thể chạy lại, nên sửa script đo cho cố định ngày mốc. Việc này chưa làm; chú thích đầu `server/src/utils/measure-csp-soft.js` hiện ghi sai rằng "chạy lại ra đúng số cũ".
- **Kiểm tra — Bảng 4-4:** `npm test hybrid` chỉ chạy 30 bài unit test (đạt 30/30), **không** đo ra các số của bảng. Repo không có script nào tái tạo được Bảng 4-4, nên con số chỉ có nguồn là ALGORITHMS.md dòng 391–392. Từ lần đo 08/10, `GeneticAlgorithm.js` không đổi; còn thay đổi ở `scoring.js` chỉ tác động khi capacity hoặc FTE bằng 0, nên số không bị lần gộp ảnh hưởng. Báo cáo giữ nguyên Bảng 4-4.
- **Đã cập nhật vào Word (19/10):** Câu dẫn của Bảng 4-5 thêm "Số liệu đo ngày 08/10/2026; bộ sinh lấy ngày chạy làm mốc…". Bảng 4-4 giữ nguyên.
- **Đã sửa code** (commit `aa849f4`): bộ sinh nhận thêm ngày mốc; `npm run measure:csp-soft` cố định mốc 08/10/2026. Chạy lại ngày 19/10, không giả đồng hồ, ra **đúng từng số** của Bảng 4-5.
- **Cần sửa trong Word:** câu dẫn Bảng 4-5 đổi thành "Số liệu đo ngày 08/10/2026. Lệnh `npm run measure:csp-soft` cố định seed và ngày mốc 08/10/2026, nên chạy lại vào ngày nào cũng ra đúng các số này." Bỏ ý "bộ sinh lấy ngày chạy làm mốc", vì nay không còn đúng.
- **Đã cập nhật vào Word (lần 3, 19/10):** Câu dẫn Bảng 4-5 thay bằng "Số liệu đo ngày 08/10/2026. Lệnh npm run measure:csp-soft cố định seed và ngày mốc 08/10/2026, nên chạy lại vào ngày nào cũng ra đúng các số này." Đoạn sau Bảng 4-3 thêm câu về bản sửa ngày mốc (aa849f4).
- **Trả lời:** Sửa script cố định ngày mốc (19/10).

### B2. Cảnh báo chunk > 500 kB khi build

- [ ] **Vị trí:** đoạn ngay dưới Bảng 4-2: "Build production cũng đạt: 4.248 module trong 20,66 giây, còn cảnh báo chunk lớn hơn 500 kB".
- **Nguồn:** TESTING.md có 4.248 module và 20,66 giây nhưng **không** ghi cảnh báo chunk.
- **Cần anh xác nhận:** lần build ngày 19/10 có cảnh báo này không? Nếu có, nên thêm vào bảng kết quả trong TESTING.md cho khớp.
- **Kiểm tra:** ✅ Có cảnh báo. Build ngày 19/10 ra 4.248 module, chunk `index-*.js` nặng 1.179,88 kB (gzip 377,52 kB), kèm dòng "(!) Some chunks are larger than 500 kB after minification". Câu trong báo cáo giữ nguyên. Thời gian build phụ thuộc máy: lần kiểm này mất 33–65 giây. Nếu muốn chặt chẽ, viết "20,66 giây trên máy đo".
- **Đã sửa tài liệu** (commit `a7ab2cc`): TESTING.md thêm cảnh báo chunk vào bảng lần chạy gần nhất. Word giữ nguyên câu hiện tại.
- **Trả lời:** Giữ câu trong báo cáo; thêm cảnh báo vào TESTING.md (19/10).

### B3. Số endpoint: 135 hay 118?

- [ ] **Vị trí:** mục 3.5 "Thiết kế API" ghi "14 nhóm route… 135 endpoint"; Hình 3-1.
- **Nguồn:** em đếm bằng đúng lệnh mà API.md đưa ra (`grep -rcE "^\s*router\.(get|post|put|patch|delete)\(" server/src/routes/`) và ra **135** trên 14 file, có tính cả `jobs` và `internal`. API.md và README vẫn ghi **118 / 12 nhóm**.
- **Cần anh xác nhận:** dùng 135 trong báo cáo. Nếu đồng ý thì API.md và README cũng cần sửa con số.
- **Kiểm tra:** ✅ 135 là đúng: auth 27, tasks 33, resources 17, projects 15, optimization 10, analytics 7, recurring-tasks 6, departments 5, task-groups 5, activity-logs 3, notifications 3, company-settings 2, jobs 1, internal 1. Ngoài ra còn `GET /api/health` khai thẳng ở `server/app.js` dòng 68, không nằm trong file route. Đề xuất viết trong mục 3.5: "135 endpoint, chưa kể endpoint kiểm tra sức khỏe `/api/health`". README dòng 124 còn ghi sai "DATABASE.md — 12 collection" (đúng là 15).
- **Đã cập nhật vào Word (19/10):** Mục 3.5 viết "Các file route hiện khai báo 135 endpoint (chưa kể endpoint kiểm tra sức khỏe /api/health)". API.md/README chưa sửa.
- **Đã sửa tài liệu** (commit `a7ab2cc`): API.md, README, docs/README.md ghi 135 endpoint / 14 file route; README và DATABASE.md ghi 15 collection.
  - Khi đối chiếu, phát hiện API.md ghi "đã phủ hết" nhưng **thiếu 3 endpoint**: `POST /optimization/benchmark`, `PATCH /projects/:id/permissions`, `PATCH /projects/:id/quick-edit`. Ngoài ra `/readiness` và `/:id/rollback` chỉ được nhắc trong đoạn văn. Đã bổ sung cả năm vào bảng; kiểm lại thì cả 135 route đều có trong API.md. Word không cần sửa thêm.
- **Trả lời:** Dùng 135; đã sửa API.md, README (19/10).

### B4. Phiên bản thư viện trong Bảng 4-1

- [ ] Bảng 4-1 lấy số từ `package.json` (khoảng phiên bản), không phải bản đang cài thật. Bản cài trong `node_modules` lệch ở ba chỗ:

  | Thư viện | Báo cáo ghi | Bản đang cài |
  |---|---|---|
  | Express | 4.x | 4.22.3 |
  | React Router | 6.26 | 6.30.6 |
  | multer | 2.3 | 2.4.0 |

- **Cần anh chọn:** ghi theo bản đang cài (chính xác hơn) hay giữ theo `package.json`?
- **Kiểm tra:** ✅ Ba chỗ trên đúng, và **còn chỗ thứ tư: Mongoose ghi 8.5, bản cài là 8.24.2** (`package.json` ghi `^8.5.1`). Các thư viện còn lại khớp với bản cài: React 18.3.1, Vite 5.4.21, Ant Design 6.6.1, Axios 1.20.0, Socket.IO 4.8.3, jsonwebtoken 9.0.3, bcryptjs 2.4.3, Helmet 8.3.0, express-rate-limit 8.6.2, xlsx 0.20.3, React Native 0.86.3, Expo 57.0.24, React (mobile) 19.2.3, Vitest 2.1.9, jest-expo 57.0.5, Playwright 1.63.0; Node trên máy là 20.19.2. Chưa kiểm phiên bản MongoDB ("7.x").
  - Nếu ghi theo bản đang cài, các ô cần đổi là: dòng Web frontend `18.3; 5.4; 6.6; 1.20; 6.30`, dòng Backend `Node ≥ 20; 4.22; 4.8`, dòng Dữ liệu `7.x; 8.24`, dòng Tệp và Excel `2.4; 0.20.3`.
- **Cần sửa trong Word:** đổi bốn ô ngay ở trên. Tiêu đề cột "Phiên bản trong project" có thể đổi thành "Phiên bản đang cài", cho rõ đây là bản mà bộ test đã chạy.
- **Đã cập nhật vào Word (lần 3, 19/10):** Bảng 4-1: tiêu đề cột thành "Phiên bản đang cài"; Web frontend `18.3; 5.4; 6.6; 1.20; 6.30`, Backend `Node ≥ 20; 4.22; 4.8`, Dữ liệu `7.x; 8.24`, Tệp và Excel `2.4; 0.20.3`.
- **Trả lời:** Ghi theo bản đang cài (19/10). Áp dụng cho cả F3.

### B5. Số mô hình và collection

- [ ] **Vị trí:** mục 3.4 và Hình 3-2 ghi **15 mô hình** (đếm theo `server/src/models/`). README ghi lệnh seed "xóa sạch cả 14 collection"; DATABASE.md liệt kê 15 mục.
- **Cần anh xác nhận:** 15 là đúng. README có thể đang lệch một collection (có lẽ Attachment hoặc JobRun không bị seed xóa).
- **Kiểm tra:** ✅ 15 là đúng. Seed xóa đúng 14 collection, chừa `Attachment` (`server/src/utils/seeder.js` dòng 36–46), nên README dòng 73 ghi "14" là đúng. Báo cáo không cần sửa. Ngoài lề: seed để lại bản ghi Attachment trỏ tới công việc đã bị xóa.
- **Trả lời:** 15 đúng, không sửa Word (19/10).

### B6. Bảng 4-3: commit của từng lỗi

- [ ] Tám dòng của Bảng 4-3 lấy từ bảng "Lỗi phát hiện trong lúc làm và đã sửa" trong `lo-trinh-hoan-thien.md`. Riêng con số "26% việc ở cỡ small không ai đạt ngưỡng H2" lấy từ CHANGELOG. Anh xem lại các lỗi được chọn có đúng là tiêu biểu nhất chưa.
- **Kiểm tra:** ✅ Bảy mã commit (`1c73ee0` dùng cho hai dòng) đều có trong lịch sử. Nội dung commit khớp mô tả trong bảng, và mỗi commit đều kèm file test. Vì vậy câu "mỗi lỗi được tái hiện bằng test… và test đó được giữ lại" đúng. Con số 26% khớp với CHANGELOG.md dòng 138. (Đính chính: `lo-trinh-hoan-thien.md` **không** bị xóa; commit `8cf39fb` chỉ sửa file này, file vẫn ở `docs/superpowers/plans/`.) Việc chọn lỗi nào là tiêu biểu vẫn do nhóm quyết.
- **Trả lời:** Giữ tám dòng; ba lỗi phân quyền đã có đoạn riêng sau bảng (19/10). Word không sửa thêm.

---

## C. 🟡 Diễn đạt em suy ra, chưa đọc tới code

### C1. UC-TH14 – Báo cáo kết quả theo người

- [ ] Luồng thay thế "Không có công việc trong kỳ: hiển thị trạng thái rỗng" và luồng ngoại lệ "Chọn phạm vi toàn công ty khi không phải Owner/Admin: từ chối truy cập". CHANGELOG chỉ nói phạm vi toàn công ty "chỉ Owner/Admin", không nói server trả mã gì hay giao diện có ẩn lựa chọn đó không.
- **Cần anh xác nhận:** khi đó server trả 403, hay giao diện ẩn hẳn lựa chọn?
- **Kiểm tra:** cả hai. Giao diện chỉ hiện lựa chọn "Toàn công ty" cho Owner/Admin (`client/src/components/reports/PerformanceReport.jsx` dòng 21, 92). Server vẫn trả **403** nếu bị gọi thẳng với `scope=all` (`server/src/controllers/analytics.controller.js` dòng 699–701). Trạng thái rỗng đúng là có (bảng hiện `emptyText`).
  - Đề xuất viết lại luồng ngoại lệ: "Giao diện không hiện phạm vi Toàn công ty với người không phải Owner/Admin; nếu vẫn gọi API với phạm vi này, server trả 403."
  - Lưu ý cho Bảng 1-1: "cấp dưới" là người có `User.manager` trỏ tới mình, và **mọi vai trò** đều chọn được phạm vi "Cấp dưới". Một Thành viên được đặt làm quản lý trực tiếp của người khác vẫn xem được báo cáo kết quả của người đó. Riêng "tải theo kỳ" (`/resources/productivity/summary`) thì đúng là chỉ Admin/PM.
- **Đã cập nhật vào Word (19/10):** UC-TH14: actor chính, bước 2 và luồng ngoại lệ viết lại theo kết quả kiểm tra; Bảng 1-1 tách "Xem tải theo kỳ" và "Xem báo cáo kết quả theo người của cấp dưới trực tiếp" (Thành viên "Có (7)").
- **Trả lời:**

### C2. UC-TH12 – Đánh giá năng lực

- [ ] Bước 2: "Lưu mức tự đánh giá như đề xuất, ghi lịch sử, **thông báo người quản lý**". CHANGELOG ghi "có thông báo cho cả hai phía" nhưng không nói rõ thông báo ở bước nào. Bước 3: "Chỉ liệt kê nhân sự trong phạm vi quản lý của người duyệt" lấy theo CHANGELOG.
- **Kiểm tra:** ✅ Đúng cả hai bước (`server/src/services/skillEvaluation.service.js`).
  - **Khi nhân viên gửi** (dòng 77–83): mọi Admin/PM đang có nhân viên đó trong phạm vi duyệt đều nhận thông báo, trừ chính người gửi. **Khi duyệt hoặc trả lại**: nhân viên nhận thông báo.
  - **Phạm vi duyệt** (dòng 6–13): Admin (gồm Owner) duyệt được cả công ty. PM duyệt được cấp dưới trực tiếp (`User.manager`), thành viên của dự án mình quản lý hoặc tạo, và hồ sơ nhân sự do mình tạo.
  - Nếu muốn ghi chính xác ở bước 2: "thông báo cho các Admin/PM có nhân viên trong phạm vi duyệt".
- **Đã cập nhật vào Word (19/10):** UC-TH12 bước 2 và bước 3 viết lại theo phạm vi duyệt trong code.
- **Trả lời:**

### C3. UC-TH13 – Vòng đời dự án

- [ ] Bước 4 "Tạo dự án từ mẫu" ghi là "sinh dự án mới để thuật toán tối ưu phân công lại". Em suy ra từ "mẫu không có người thực hiện". Cần xác nhận: tạo từ mẫu có dời ngày theo ngày bắt đầu mới như nhân bản không?
- **Kiểm tra:** ✅ Có dời ngày. Tạo từ mẫu dùng chung hàm `cloneProject` với nhân bản (`server/src/services/projectLifecycle.service.js` dòng 72–73). Nếu truyền ngày bắt đầu mới, mọi ngày dời theo và giữ nguyên khoảng cách tương đối; nếu không truyền, ngày giữ nguyên.
  - **Thiếu một bước:** dự án tạo từ mẫu **không có thành viên** (dòng 95), và người quản lý là người tạo. Tối ưu hóa lấy thành viên dự án làm tập nhân sự, nên phải thêm thành viên trước khi chạy tối ưu.
  - Đề xuất viết lại bước 4: "Tạo dự án từ mẫu: sinh dự án mới với ngày dời theo ngày bắt đầu đã chọn, công việc chưa có người thực hiện; người quản lý thêm thành viên rồi chạy tối ưu để phân công."
- **Đã cập nhật vào Word (19/10):** UC-TH13 bước 4 viết lại: dời ngày theo ngày bắt đầu đã chọn, thêm thành viên rồi mới chạy tối ưu.
- **Trả lời:**

### C4. Bảng 1-1 – dòng "Tự đánh giá năng lực kèm minh chứng"

- [x] Em ghi **Có** cho cả Quản trị viên và PM. Thực tế họ chỉ tự đánh giá được nếu tài khoản có hồ sơ Resource. Ai sẽ duyệt cho Admin/PM — Owner chăng?
- **Kiểm tra:** cần hồ sơ Resource; nếu không có, server trả 404 "Không tìm thấy hồ sơ nhân sự của bạn". Người duyệt được xác định như sau (Owner luôn có `role: 'admin'`):
  - **Bản của Admin hoặc Owner:** mọi Admin trong công ty đều duyệt được, **kể cả chính người gửi**. `managerEvaluate` không chặn tự duyệt (`server/src/controllers/resource.controller.js` dòng 692–703). Thông báo không gửi cho chính người gửi, nhưng API vẫn cho duyệt.
  - **Bản của PM:** Admin/Owner duyệt được. PM khác duyệt được nếu quản lý một dự án mà PM này là thành viên. PM cũng tự duyệt được nếu tự thêm mình làm thành viên dự án mình quản lý.
  - **Cần quyết:** ghi nhận đây là hạn chế (mục 5.2), hay sửa code chặn tự duyệt.
- **Đã sửa code** (commit `db2b875`): phạm vi duyệt (`reviewScope`) luôn loại chính người duyệt. Bản tự đánh giá của mình không vào hàng chờ của mình; duyệt hoặc trả lại bản của mình trả 403. Áp dụng cho cả Admin, Owner và PM.
- **Cần sửa trong Word:**
  - Bảng 1-1, dòng "Tự đánh giá năng lực kèm minh chứng": giữ **Có** cho cả ba vai trò, thêm chú thích "(cần có hồ sơ nhân sự)".
  - Đặc tả UC-TH12 (Bảng 3-16), bước duyệt: thêm "Người duyệt không duyệt được bản tự đánh giá của chính mình. Bản của Admin do Admin khác hoặc Owner duyệt; bản của PM do Admin/Owner, hoặc PM quản lý dự án mà người đó tham gia, duyệt."
  - Mục 5.2 (hạn chế): thêm "Nếu công ty chỉ có một Quản trị viên (là Owner), bản tự đánh giá năng lực của người này không có ai duyệt."
- **Đã cập nhật vào Word (19/10):** Bảng 1-1 thêm "(cần có hồ sơ nhân sự)"; UC-TH12 thêm ngoại lệ "không duyệt được bản của chính mình (403)"; mục 5.2 thêm hạn chế khi công ty chỉ có một Quản trị viên.
- **Trả lời:** Đồng ý sửa code (19/10).

### C5. Quyền riêng của Owner

- [x] Mục 1.4.2, Bảng 3-1 và mục 4.2.1 ghi: "chỉ Owner được phong quản trị viên, cấp quyền quản trị ứng dụng, tắt xác thực hai lớp và đổi email". Theo API.md, **đổi email** còn mở cho người có `specialGrants` chứa `can_change_email`, tức không chỉ Owner.
- **Đề xuất:** thêm "(hoặc người được cấp quyền đặc biệt)" sau "đổi email".
- **Kiểm tra:** ✅ Đúng (`server/src/controllers/auth.controller.js` dòng 977). Có một vấn đề nặng hơn:
  - Route cấp quyền đặc biệt `PUT /api/auth/users/:id/special-grants` chỉ yêu cầu `authorize('admin')` (`server/src/routes/auth.routes.js` dòng 136), và controller không kiểm Owner (dòng ~1290). Vì vậy **Admin tự cấp được `can_change_email` cho mình** rồi đổi email người khác.
  - Ba quyền còn lại đúng là chỉ Owner làm được: phong admin (dòng 579), cấp quyền quản trị ứng dụng (dòng 1222), tắt 2FA (dòng 1024). Chuyển cờ Owner cũng chỉ Owner làm được (dòng 922).
  - **Cần quyết:** (a) sửa code: chỉ Owner được cấp quyền đặc biệt; báo cáo dùng câu đề xuất ở trên. (b) Giữ code: báo cáo phải viết "đổi email: Owner, hoặc người được Quản trị viên cấp quyền đặc biệt".
- **Đã sửa code — phương án (a)** (commit `41d9fc6`): chỉ Owner cấp được quyền đặc biệt; Admin thường nhận 403. Trên giao diện, nút "Cấp quyền đổi Email" ở tab App Admin bị khóa với người không phải Owner.
- **Cần sửa trong Word** (ba chỗ: mục 1.4.2, Bảng 3-1, mục 4.2.1):
  - Viết thành: "chỉ Owner được phong quản trị viên, cấp quyền quản trị ứng dụng, cấp quyền đặc biệt, tắt xác thực hai lớp và đổi email tài khoản (hoặc người được Owner cấp quyền đặc biệt đổi email)".
  - Mục 4.2.1 có câu "Quản trị viên quản lý trạng thái, vai trò, email, quản lý trực tiếp, quyền ứng dụng, quyền đặc biệt và đặt lại mật khẩu." Bỏ "email" và "quyền đặc biệt" khỏi danh sách đó, vì cả hai thuộc Owner; ngay câu sau đã liệt kê thao tác riêng của Owner.
- **Đã cập nhật vào Word (19/10):** Mục 1.4.2, Bảng 3-1 và mục 4.2.1 thêm "cấp quyền đặc biệt" vào quyền riêng của Owner, ghi "(hoặc người được Owner cấp quyền đặc biệt đổi email)"; bỏ "email, quyền đặc biệt" khỏi danh sách quyền của Quản trị viên ở 4.2.1.
- **Trả lời:** Đồng ý sửa code (19/10).

### C6. Hình 3-2 – Mô hình dữ liệu khái quát (em vẽ lại)

- [ ] Các mũi tên là quan hệ **khái quát**, không phải khóa ngoại chính xác:
  - "gán Task → Resource" vẽ từ OptimizationResult sang Task.
  - "job ghi" nối JobRun với WorkloadSnapshot dù hai collection không tham chiếu nhau.
  - Notification, ActivityLog và CompanySetting không có đường nối, chỉ được ghi chú ở chân hình.
- **Cần anh xác nhận:** cách vẽ này có ổn cho hội đồng không.
- **Kiểm tra:** không cần kiểm code; đây là quyết định trình bày.
- **Cần sửa trong Word:** giữ hình. Thêm vào chú thích hoặc dòng ghi chú ngay dưới Hình 3-2: "Mũi tên biểu diễn luồng dữ liệu giữa các nhóm mô hình, không phải khóa ngoại; quan hệ tham chiếu chính xác xem Bảng 3-2."
- **Đã cập nhật vào Word (lần 3, 19/10):** Thêm đoạn ngay dưới Hình 3-2: "Ghi chú Hình 3-2: mũi tên biểu diễn luồng dữ liệu giữa các nhóm mô hình, không phải khóa ngoại; quan hệ tham chiếu chính xác xem Bảng 3-2."
- **Trả lời:** Giữ cách vẽ, thêm ghi chú (19/10).

---

## D. 🔵 Cần nhóm quyết định

### D1. Phạm vi đề tài nói không có quy trình tùy biến

- [ ] **Vị trí:** mục 1.3: "Không hiện thực quy trình làm việc tùy biến theo từng dự án; hệ thống dùng một bộ trạng thái công việc cố định."
- **Vướng:** nay mỗi dự án có công tắc quyền (`Project.permissions`), bật/tắt đánh giá kết quả, và FEATURES.md có nhắc "cấu hình luồng". Bộ trạng thái vẫn cố định, nên câu này về cơ bản vẫn đúng.
- **Cần quyết:** giữ nguyên, hay viết lại thành "bộ trạng thái cố định, cho phép bật/tắt bước duyệt theo dự án"?
- **Kiểm tra:** bộ trạng thái cố định gồm 6 giá trị: `todo`, `in_progress`, `review`, `done`, `blocked`, `failed` (`server/src/models/Task.js` dòng 63). Mỗi dự án có ba nhóm công tắc: `reviewConfig.enabled` (bước duyệt kết quả), `failureConfig.enabled` (đánh dấu thất bại) và `permissions` (quyền thao tác của thành viên). Chữ "cấu hình luồng" ở FEATURES.md dòng 230 nằm trong bảng đối chiếu tính năng mobile. Câu viết lại đề xuất khớp code; có thể viết đầy đủ hơn: "dùng một bộ sáu trạng thái cố định; mỗi dự án chỉ bật/tắt được bước duyệt kết quả và bước đánh dấu thất bại".
- **Cần sửa trong Word:** mục 1.3, thay câu hiện tại bằng: "Không hiện thực quy trình làm việc tùy biến theo từng dự án: hệ thống dùng một bộ sáu trạng thái công việc cố định; mỗi dự án chỉ bật/tắt được bước duyệt kết quả và bước đánh dấu thất bại."
- **Đã cập nhật vào Word (lần 3, 19/10):** Mục 1.3 thay bằng câu đề xuất (sáu trạng thái cố định; bật/tắt bước duyệt kết quả và bước đánh dấu thất bại).
- **Trả lời:** Viết lại câu (19/10).

### D2. Mục tiêu "so sánh với phân bổ thủ công" chưa có thực nghiệm

- [ ] **Vị trí:** mục 1.2, gạch đầu dòng cuối: "so sánh kết quả phân bổ tự động với phân bổ thủ công, và so sánh ba phương pháp giải với nhau".
- **Vướng:** chương 4 chỉ so GA với Hybrid và CSP bản cũ với bản mới; **không** có thực nghiệm so với phân bổ thủ công. Hội đồng dễ hỏi đúng chỗ này.
- **Cần quyết:** bỏ vế "thủ công" khỏi mục tiêu, hay bổ sung một thực nghiệm (ví dụ so với Greedy hoặc với dữ liệu mẫu phân công tay)?
- **Kiểm tra:** Benchmark Studio đã chạy sẵn Greedy làm mốc so sánh, cùng lúc với GA, CSP và Hybrid (`server/src/algorithms/benchmark/benchmarkRunner.js` dòng 14–18). Bổ sung thực nghiệm so với Greedy chỉ cần chạy Benchmark và ghi số. Nếu chọn hướng này, nên đổi chữ "thủ công" thành "phân bổ theo quy tắc đơn giản (Greedy)" cho đúng với thực nghiệm.
- **Đã đo** (script `server/src/utils/measure-baselines.js`, lệnh `npm run measure:baselines`; số và nhận xét cũng ghi ở ALGORITHMS.md mục 3.4). Chạy đúng bộ của Benchmark Studio trên 30 bộ dữ liệu mỗi cỡ, seed và ngày mốc cố định; chạy hai lần ra cùng số (trừ thời gian). Đo ngày 19/10/2026:

  | Cỡ | Thuật toán | Fitness | Khớp kỹ năng (%) | σ tải (giờ) | Người quá tải | Thời gian (ms) | Số bộ |
  |---|---|---|---|---|---|---|---|
  | small | Greedy (mốc) | 0,767 | 94,8 | 16,8 | 1,07 | 1 | 30/30 |
  | small | CSP | 0,800 | 92,9 | 15,8 | 0,00 | 2 | 23/30 |
  | small | GA | 0,824 | 87,0 | 3,5 | 0,03 | 2.057 | 30/30 |
  | small | Hybrid | 0,819 | 93,2 | 9,6 | 0,23 | 1.226 | 30/30 |
  | medium | Greedy (mốc) | 0,751 | 98,0 | 34,2 | 7,77 | 2 | 30/30 |
  | medium | CSP | 0,828 | 94,5 | 17,3 | 0,07 | 28 | 14/30 |
  | medium | GA | 0,697 | 61,7 | 38,2 | 1,73 | 19.022 | 30/30 |
  | medium | Hybrid | 0,803 | 91,7 | 36,3 | 1,60 | 15.882 | 30/30 |

  - Kết luận chính: **Hybrid hơn Greedy ở cả hai cỡ** (fitness +0,052) và giảm mạnh số người quá tải (small 1,07 → 0,23; medium 7,77 → 1,60). Greedy khớp kỹ năng cao nhất nhưng dồn việc cho người giỏi nhất tới khi quá tải.
  - ⚠️ **Một kết quả bất lợi cần nói thẳng trong báo cáo:** ở cỡ medium, **GA chạy một mình kém Greedy** (0,697 so với 0,751; khớp kỹ năng chỉ 61,7%). Đây lại là lập luận tốt cho Hybrid: miền từ CSP bỏ sẵn các cặp thiếu kỹ năng mà GA không kịp tự học trong 250 thế hệ. Hội đồng dễ hỏi đúng chỗ này, nên viết ra trước sẽ tốt hơn để bị phát hiện.
  - CSP cho phương án tốt nhất khi giải được, nhưng chỉ giải được 23/30 (small) và 14/30 (medium) bộ.
- **Cần sửa trong Word:**
  - Mục 1.2, gạch đầu dòng cuối: "Thực nghiệm và đánh giá: so sánh kết quả phân bổ tự động với phân bổ theo quy tắc tham lam (Greedy — giao việc cho người hợp kỹ năng nhất, đang rảnh nhất, mô phỏng cách phân công tay), và so sánh ba phương pháp giải với nhau theo chất lượng lời giải lẫn thời gian chạy."
  - Mục 4.5, sau đoạn của Bảng 4-5: thêm "Thực nghiệm thứ ba" với bảng trên làm **Bảng 4-6 So sánh với phân bổ theo quy tắc Greedy** (có thể bỏ cột thời gian, hoặc giữ kèm ghi chú "phụ thuộc máy"). Đoạn nhận xét lấy từ ba gạch đầu dòng ở trên. Bảng "Đánh giá hệ thống" hiện là 4-6 sẽ thành **4-7**; cập nhật mọi chỗ nhắc tới số bảng đó, rồi F9.
  - Kết luận 5.1: thêm một câu, ví dụ "So với quy tắc phân công tham lam, Hybrid cho fitness cao hơn khoảng 0,05 và giảm số người quá tải từ 7,8 xuống 1,6 ở bộ 100 việc × 20 người."
- **Đã cập nhật vào Word (lần 3, 19/10):** Mục 1.2 dùng câu đề xuất (Greedy). Mục 4.5 thêm "Thực nghiệm thứ ba" với Bảng 4-6 So sánh với phân bổ theo quy tắc Greedy (giữ cột thời gian, ghi "phụ thuộc máy đo") và hai đoạn nhận xét, gồm kết quả bất lợi của GA ở cỡ medium. "Đánh giá hệ thống" thành Bảng 4-7, dòng Thuật toán sửa theo kết quả mới. Kết luận 5.1 thêm câu so với Greedy; mục 5.2 thêm hạn chế "GA chạy một mình kém Greedy ở 100 việc × 20 người". Không có chỗ nào khác trong thân bài nhắc số bảng 4-6/4-7.
- **Trả lời:** Đổi thành so với Greedy và bổ sung số đo (19/10).

### D3. Use case mới chưa có trong bộ UML

- [ ] UC-TH12–14 chưa có sơ đồ activity/sequence, Bảng 3-4 (72 use case) chưa có các chức năng mới, và CLS-01 vẫn là bản 12 mô hình. Báo cáo đã ghi chú các điểm này.
- **Cần quyết:** vẽ bổ sung trong Visual Paradigm, hay giữ ghi chú?
- **Trả lời:** Giữ ghi chú, trừ khi giảng viên yêu cầu bộ UML đầy đủ (19/10). Word không sửa thêm.

### D4. Ngày tháng trên bìa và lời cảm ơn

- [ ] Bìa (tiếng Việt và tiếng Anh) ghi "Tháng 8 năm 2026 / Aug 2026"; lời cảm ơn ghi "ngày 08 tháng 08 năm 2026". Đổi theo ngày nộp chính thức?
- **Kiểm tra:** xác nhận trong file: bìa tiếng Anh "HO CHI MINH CITY – AUG 2026"; lời cảm ơn "TP. Hồ Chí Minh, ngày 08 tháng 08 năm 2026". Các tài liệu tham khảo [8]–[14] ghi "truy cập tháng 8/2026". Nếu đổi ngày nộp, các dòng này có thể giữ nguyên, vì đó là ngày truy cập thật.
- **Trả lời:** Đổi theo ngày nộp chính thức — **chờ anh báo ngày**. Khi có ngày thì sửa ba chỗ: bìa tiếng Việt, bìa tiếng Anh, lời cảm ơn. Giữ "truy cập tháng 8/2026" ở tài liệu tham khảo.

### D5. Tóm tắt (Abstract) và Lời mở đầu

- [ ] Hai phần này em chưa sửa: chúng viết ở mức khái quát, không có số liệu sai. Muốn thêm một câu về kết quả thực nghiệm vào Abstract (ví dụ "Hybrid converges about 32% faster than GA with equal fitness") không?
- **Cần sửa trong Word:** thêm vào cuối đoạn kết quả của Abstract: "Experiments show that the hybrid CSP–GA approach reaches the same fitness as the standalone genetic algorithm while stopping about 32% earlier (51.8 vs 76.3 generations) and reaching 90% of its improvement within two generations." Nếu có Tóm tắt tiếng Việt, thêm câu tương ứng: "Thực nghiệm cho thấy Hybrid CSP–GA đạt cùng mức fitness với GA nhưng dừng sớm hơn khoảng 32% (51,8 so với 76,3 thế hệ) và đạt 90% mức cải thiện chỉ sau khoảng hai thế hệ."
- **Đã cập nhật vào Word (lần 3, 19/10):** Abstract thêm câu tiếng Anh đề xuất, đặt trước câu "By integrating workflow management…". Báo cáo không có Tóm tắt tiếng Việt nên không thêm câu tiếng Việt.
- **Trả lời:** Thêm một câu (19/10).

### D6. Ảnh chụp giao diện

- [ ] Trang Nhân sự đã đổi (tab mặc định là Năng suất & Cân bằng tải, có thêm tab Chờ duyệt năng lực). Báo cáo hiện không chèn ảnh màn hình nào của trang này. Có cần chụp bổ sung không, và chụp những màn nào?
- **Trả lời:** Chụp 2 màn (19/10): `/resources` tab **Năng suất & Cân bằng tải**, và tab **Chờ duyệt năng lực** có ít nhất một bản đang chờ. **Chưa chụp.**

---

## E. ⚪ Hình thức (cần mở bằng Word để kiểm)

- [ ] **E1. Cập nhật mục lục:** mở file → Word hỏi cập nhật trường → **Yes**, hoặc Ctrl+A rồi F9. Danh mục hình hiện còn dòng "Hình 4-1" trỏ tới hình đã bỏ; danh mục bảng chưa có Bảng 2-3, 3-16 → 3-19, 4-3 → 4-6.
  - **Kiểm tra:** F9 là đủ. Danh mục bảng và danh mục hình là trường `TOC \t "Table Caption,1"` và `TOC \t "Figure Caption,1"`, tức tự lấy mọi đoạn có kiểu Table Caption / Figure Caption. Mọi chú thích trong thân bài, kể cả các bảng mới, đều đã đúng kiểu này. Ngoài các dòng thiếu, danh mục hiện còn **ba dòng mang số cũ**, F9 cũng sửa luôn: "Bảng 3-16 Phạm vi ba sơ đồ lớp" (nay là 3-19), "Bảng 4-3 So sánh GA và Hybrid" (nay là 4-4), "Bảng 4-4 Đánh giá hệ thống" (nay là 4-6). Danh mục hình còn thiếu Hình 2-1. Sau khi F9, kiểm lại một lượt.
- [ ] **E2. Gạch đầu dòng và danh sách đánh số.** Em đã sửa lỗi của bản gốc: kiểu List Bullet dùng nhầm danh sách đánh số chương, nên hiện thành "CHƯƠNG 6, CHƯƠNG 7…"; kiểu List Number thì không có số. Kiểm lại trong Word ở mục 3.2 (bốn luồng nghiệp vụ), 5.2, 5.3 và Phụ lục A.
- [ ] **E3. Tham chiếu [15] (Régin, AAAI-94, 1994):** kiểm định dạng có đúng quy định trích dẫn của khoa không.
- [ ] **E4. Bảng mới em tạo** (2-3, 4-3, 4-4, 4-5, PL-2) dùng cỡ chữ 10,5 pt và màu tiêu đề giống các bảng cũ. Kiểm lại xem có bảng nào bị tràn hoặc ngắt trang xấu không.
- [ ] **E5. File cũ:** giữ hay xóa `218_110_Truong_Tien_TaiLieu_BoSungUML_HoanChinh.docx` và `.pdf`, `218_110_Truong_Tien_TaiLieu_HoanThien.docx` và `.pdf` sau khi chốt bản mới?
  - **Trả lời:** Xóa sau khi nộp bản cuối (19/10); lịch sử git vẫn giữ bản cũ. Chưa xóa.

---

## F. 🔴 Sai so với code — phát hiện thêm khi kiểm lại ngày 19/10

### F1. Bảng 1-1, dòng "Tạo, xóa công việc": Thành viên đang ghi **Không**

- [ ] **Code:** Thành viên dự án **được tạo công việc** theo mặc định. Công tắc `Project.permissions.allowMembersCreateTasks` mặc định bật (`server/src/models/Project.js` dòng 170; `server/src/middleware/taskAccess.js` dòng 160–180). Khách cần `allowGuestCreateTask`.
  - Xóa: Thành viên xóa được việc con do mình tạo hoặc được giao. Việc chính chỉ xóa được khi dự án bật `allowCreatorDeleteTask` (mặc định tắt) hoặc `allowAssigneeDeleteTask` (`taskAccess.js` dòng 447–480).
- **Đề xuất:** tách thành hai dòng.
  - "Tạo công việc": QTV Có, QLDA Có, Thành viên "Có (thành viên dự án; QLDA tắt được)".
  - "Xóa công việc": QTV Có, QLDA Có, Thành viên "Không (trừ việc con của mình, hoặc khi dự án cho phép)".
- **Đã cập nhật vào Word (19/10):** Bảng 1-1 tách "Tạo công việc" (Thành viên "Có (5)") và "Xóa công việc" (Thành viên "Không (6)"); mục 1.4.4 thêm gạch đầu dòng tạo công việc.
- **Trả lời:**

### F2. Bảng 1-1, dòng "Tạo, sửa phòng ban": QLDA đang ghi **Có**

- [ ] **Code:** PM **không tạo được** phòng ban. Chỉ Owner, Admin, App Admin `work` tạo được, hoặc mọi người khi công ty đặt `createDepartmentPermission = 'all_members'`. Giá trị mặc định là `only_admin` (`server/src/controllers/department.controller.js` dòng 146–168; `server/src/models/CompanySetting.js` dòng 17–20). PM chỉ **sửa** được (`server/src/routes/department.routes.js` dòng 40).
- **Đề xuất:** tách thành "Tạo phòng ban" (QTV Có, QLDA "Không (trừ khi công ty cho phép mọi người)", Thành viên tương tự) và "Sửa phòng ban" (QTV Có, QLDA Có, Thành viên Không). Mục 1.4.2 (Quản trị viên) ghi "Tạo, sửa và xóa phòng ban" là đúng. Kiểm thêm mục Quản lý dự án xem có câu nào nói PM tạo được phòng ban không.
- **Đã cập nhật vào Word (19/10):** Bảng 1-1 tách "Tạo phòng ban" (QLDA, Thành viên "Không (4)") và "Sửa phòng ban"; mục 1.4.3 thành "Sửa phòng ban; tạo phòng ban khi công ty cho phép mọi người tạo".
- **Trả lời:**

### F3. Bảng 4-1: Mongoose ghi 8.5, bản cài là 8.24.2

- [ ] Xem B4. Nếu B4 chọn ghi theo `package.json` thì giữ 8.5; nếu chọn theo bản đang cài thì đổi thành 8.24.
- **Đã cập nhật vào Word (lần 3, 19/10):** Mongoose 8.24 (cùng lượt với B4).
- **Trả lời:** Theo bản đang cài → 8.24 (19/10, theo B4).

### F4. Mục 4.5: số bộ CSP giải được không khớp giữa Bảng 4-5 và đoạn văn ngay dưới

- [ ] **Vị trí:** đoạn sau Bảng 4-5: "số bộ CSP giải được ở ngưỡng 0,5 tăng lên **16/30 (small) và 19/30 (medium)**". Bảng 4-5 ngay trên lại ghi cột "Giải được" ở ngưỡng 0,5 là **15/30 (small)** và **18/30 (medium)**.
- **Nguồn:** 16 và 19 lấy từ ALGORITHMS.md dòng 230–232, là một lần đo khác, vào thời điểm khác, khi so bộ sinh cũ với bộ sinh mới. Vì bộ sinh phụ thuộc ngày chạy (xem B1), hai lần đo cho số khác nhau.
- **Đề xuất:** sửa đoạn văn theo Bảng 4-5: "…tăng lên 15/30 (small) và 18/30 (medium) với thứ tự S1/S3 (đo ngày 08/10)". Hoặc nói rõ đây là số của lần so bộ sinh cũ và mới.
- **Đã cập nhật vào Word (19/10):** Đoạn sau Bảng 4-5 nói rõ 16/30 và 19/30 là lần đo so sánh riêng hai bộ sinh (từ 0/30 và 5/30), khác lần đo của bảng.
- **Trả lời:**

### F5. Bảng 4-2: số ca kiểm thử đổi sau ba bản sửa A3, C4, C5

- [ ] Ba bản sửa thêm 15 ca test server và 1 file test web (2 ca). Đã chạy lại toàn bộ ngày 19/10, sau commit `d7bacda`: tất cả đạt.

  | Dòng trong Bảng 4-2 | Báo cáo đang ghi | Số mới |
  |---|---|---|
  | Server: đơn vị + API | 39/39 bộ đạt, 1.381 ca kiểm tra | 39/39 bộ đạt, **1.396** ca kiểm tra |
  | Web: logic + component | … và 92/92 ca component trong 18 file đạt | … và **94/94** ca component trong **19** file đạt |
  | Mobile: logic + giao diện | 68 ca logic (38 + 14 + 3 + 13) và 40/40 ca jest trong 7 file đạt | **không đổi**: đã chạy lại 19/10 sau `d7bacda`, đạt đúng các số đó |
  | End-to-end | 93/93 bài đạt, khoảng 12 phút với 1 worker | **93/93 bài đạt**: chạy lại 19/10 sau `d7bacda`, 13,3 phút, không bài nào phải chạy lại. Có thể giữ "khoảng 12 phút" hoặc đổi thành "khoảng 13 phút" |

- Nếu báo cáo có nhắc tổng số ca ở chỗ khác (Kết luận 5.1, Phụ lục), sửa theo.
- **Đã cập nhật vào Word (19/10):** Bảng 4-2: server 1.396 ca, web 94/94 ca trong 19 file, e2e "khoảng 13 phút"; câu dưới bảng nhắc ba bản sửa; thêm đoạn sau Bảng 4-3 về ba lỗi phân quyền (41d9fc6, db2b875, d7bacda).
- **Cần sửa thêm trong Word:** sau commit `aa849f4` (B1), bộ `benchmark-dataset` có thêm 1 ca, nên dòng Server của Bảng 4-2 thành **39/39 bộ đạt, 1.397 ca kiểm tra**. TESTING.md đã ghi 1.397. Đã chạy lại trọn bộ server sau `aa849f4`: 39/39 bộ đạt, 1.397 ca.
- **Đã cập nhật vào Word (lần 3, 19/10):** Bảng 4-2 dòng Server: 39/39 bộ đạt, 1.397 ca kiểm tra; câu dưới bảng đổi "ba bản sửa phân quyền" thành "các bản sửa".
- **Trả lời:**

---

## G. 🔴 Luật mới: PM chỉ có quyền PM trên dự án mình quản lý (19/10/2026 tối)

> Anh chốt hai nguyên tắc: (1) **thao tác không thuộc quyền thì không hiện**, không để bấm rồi nhận lỗi; (2) **PM chỉ có quyền của PM trên dự án mình là người quản lý. Ở dự án khác, kể cả khi có tên trong dự án, PM chỉ như một thành viên.**
> Đã sửa code, test và chạy lại toàn bộ: commit `aa3aac3`, `0f7d8bd`, `752c95b`, `4b9be57`. Các mục G1–G4 dưới đây là việc cần làm trong Word.

### G1. Hành vi mới (để đối chiếu khi sửa Word)

- [ ] Trước đây server chỉ kiểm **vai trò** PM, nên mọi PM làm được trên **mọi** dự án trong công ty: sửa, xóa dự án; thêm, sửa, gỡ thành viên; toàn quyền với công việc (tạo, sửa, xóa, đổi trạng thái, kéo thả Gantt, duyệt kết quả); bàn giao hàng loạt; cấu hình việc lặp lại. Ngoài ra, **ai trong công ty**, kể cả Thành viên và Khách, cũng tạo, sửa, xóa được nhóm công việc của mọi dự án.
- Nay mọi thao tác trên đều dùng chung một luật: **Admin/Owner, hoặc PM là `manager` của chính dự án đó** (`server/src/services/projectAccess.js`; `PRIVILEGED_ROLES` trong `taskAccess.js` chỉ còn `admin`). Ở dự án khác, PM theo luật thành viên: được tạo việc nếu dự án bật `allowMembersCreateTasks`, và được cập nhật việc giao cho mình.
- **Giữ nguyên:** nhân bản dự án, lưu thành mẫu và tạo dự án từ mẫu dùng được cho mọi PM trên mọi dự án trong công ty, vì các thao tác này chỉ đọc dự án nguồn. Tạo dự án mới: PM luôn tạo được, và trở thành người quản lý dự án đó (cập nhật sau: App Admin `work` cũng vậy, xem G6).
- **Giao diện:** trang Dự án, chi tiết dự án, Công việc và Gantt chỉ hiện nút sửa, xóa, nhóm công việc, thành viên, lưu trữ, tab Trường tùy chỉnh / Phân quyền thao tác, và kéo thả lịch cho người có quyền theo đúng luật trên.
- **Trả lời:** Đồng ý (19/10).

### G2. Bảng 1-1 và mục 1.4.3

- [ ] **Bảng 1-1, cột Quản lý dự án:** đổi thành **"Có (2)"** ở các dòng: "Tạo, sửa, xóa dự án", "Thêm, sửa, gỡ thành viên dự án", "Tạo công việc", "Xóa công việc", "Sửa toàn bộ thông tin công việc", "Thiết lập phụ thuộc và kỹ năng yêu cầu của công việc", "Khai báo trường dữ liệu tùy chỉnh của dự án", "Áp dụng phương án phân bổ vào hệ thống", "Kéo thả điều chỉnh lịch công việc trên biểu đồ Gantt". Giữ "Có (2)" ở "Lưu trữ, mở lại dự án" và hai dòng tối ưu hóa. Dòng "Nhân bản dự án, tạo dự án từ mẫu" giữ **"Có"**.
- **Ghi chú (2)** dưới bảng đổi thành: "(2) chỉ trên dự án mình quản lý; ở dự án khác — kể cả khi có tên trong dự án — quản lý dự án chỉ có quyền như thành viên".
- **Mục 1.4.3 (Quản lý dự án)**, câu mở đầu đổi thành: "Ngoài các chức năng chung, quản lý dự án có thêm các chức năng dưới đây **trên dự án mình quản lý**; ở dự án khác, kể cả khi có tên trong dự án, quản lý dự án chỉ có quyền như thành viên. Riêng nhân bản dự án và tạo dự án từ mẫu dùng được với mọi dự án trong công ty."
- Gạch đầu dòng "Tạo, sửa và xóa dự án; …" giữ nguyên, vì câu mở đầu đã giới hạn phạm vi.
- **Trả lời:**

### G3. Bảng 3-1 và mục 4.2

- [ ] **Bảng 3-1, dòng Quản lý dự án, cột "Ranh giới quyền":** đang ghi "Chỉ thao tác trong phạm vi được giao và quyền ứng dụng". Đổi thành: "Chỉ thao tác trên dự án mình là người quản lý; ở dự án khác chỉ như thành viên; thêm giới hạn của quyền ứng dụng."
- **Mục 4.2** (đoạn về phân quyền, nếu có câu "quản lý dự án chạy, xem… trong phạm vi dự án mình quản lý" hoặc tương tự): thêm "Luật này áp dụng chung cho mọi thao tác quản lý dự án và công việc (`services/projectAccess.js` và `middleware/taskAccess.js`), không chỉ tối ưu hóa."
- **Đặc tả use case:** rà UC-TH02 (Tạo dự án và quản lý thành viên), UC-TH03 (Tạo, cập nhật công việc), UC-TH07 (Việc lặp lại) và UC-TH06 (Áp dụng phương án). Chỗ nào tác nhân hoặc tiền điều kiện ghi "Quản lý dự án" chung chung thì thêm "của dự án đó". Thêm luồng ngoại lệ: "Người dùng không phải Admin/Owner hay quản lý của dự án: hệ thống không hiện thao tác; nếu gọi thẳng API, server trả 403."
- **Trả lời:**

### G4. Bảng 4-2, đoạn build và đoạn lỗi phân quyền

- [ ] **Bảng 4-2** — chạy lại trọn bộ ngày 19/10 tối, sau `d56b8cf` (bản cuối, gồm G5–G7), tất cả đạt:

  | Dòng | Báo cáo đang ghi | Số mới |
  |---|---|---|
  | Server: đơn vị + API | 39/39 bộ đạt, 1.397 ca kiểm tra | **40/40** bộ đạt, **1.448** ca kiểm tra |
  | Web: logic + component | 7 bộ logic (123 ca) … 94/94 ca component trong 19 file | **8** bộ logic (**152** ca) … **107/107** ca component trong **22** file |
  | Mobile: logic + giao diện | 68 ca logic (38 + 14 + 3 + 13), 40/40 ca jest trong 7 file | **70** ca logic (38 + 14 + **5** + 13), **59/59** ca jest trong **10** file |
  | End-to-end | 93/93 bài, khoảng 13 phút | 93/93 bài, không bài nào chạy lại, **11,8 phút**; có thể giữ "khoảng 12 phút" (các lượt trong ngày dao động 11,8–19,2 phút tùy tải máy) |

- **Đoạn dưới Bảng 4-2:** "4.248 module" đổi thành **"4.249 module"**, vì có thêm file `client/src/utils/projectAccess.js`. Cảnh báo chunk vẫn còn.
- **Đoạn sau Bảng 4-3** (đang kể ba lỗi phân quyền 41d9fc6, db2b875, d7bacda): thêm hai lỗi cùng loại.
  - `aa3aac3`: PM sửa, xóa được dự án và thành viên của dự án người khác; ai trong công ty cũng tạo, sửa, xóa được nhóm công việc.
  - `752c95b`: PM toàn quyền với công việc của mọi dự án.
  - `56d729e` (mobile, xem G5).
  - `8ec776b` (App Admin `work`, xem G6).
  - `b127a04` (tự duyệt kết quả việc của mình, xem G7).
  - Câu gợi ý: "Năm lỗi này có chung một gốc: server chỉ kiểm vai trò mà không kiểm người gọi có phải quản lý của chính dự án đó; nay mọi thao tác dùng chung một luật, và giao diện ẩn những thao tác người dùng không có quyền."
- **Trả lời:**

### G5. Mobile cũng theo luật mới (commit `56d729e`)

- [ ] Trước đây mobile bày nút ghi cho mọi người: đổi trạng thái, checklist, nộp kết quả, duyệt / trả lại, đánh dấu thất bại, tạo việc, sửa / tạo dự án, thêm / sửa nhân sự. Bấm vào thì nhận 403.
  - Nay mobile dùng chung luật quyền với web: hai file `utils/projectAccess.js` và `utils/taskPermissions.js` được chép nguyên từ web, và test `shared-copies` khóa để hai bản không lệch nhau.
  - Cũng sửa hai lỗi có từ trước:
    - Nút **Phê duyệt / Trả lại** trên mobile gửi `approved`/`rejected`, trong khi server chỉ nhận `approve`/`reject`, nên **chưa từng chạy được**.
    - Ở dạng danh sách, chạm nhãn trạng thái gọi một hàm không tồn tại, nên **app báo lỗi**. Nay chạm vào sẽ chuyển việc sang bước kế tiếp.
- **Cần sửa trong Word:**
  - Bảng 4-2 dòng Mobile: xem bảng ở G4.
  - Đoạn sau Bảng 4-3: thêm một gạch đầu dòng về `56d729e`, nêu riêng lỗi nút duyệt trên mobile. Đây là ví dụ tốt cho câu "lỗi không làm request nào báo đỏ", vì nút có hiện, bấm có phản hồi, nhưng chưa lần nào thành công.
  - Nếu báo cáo có câu nói mobile "đồng bộ quyền với web" hoặc tương tự, ghi thêm "dùng chung mã luật quyền với web".
- **Trả lời:**

### G6. App Admin `work` tạo được dự án; người quản lý dự án không bị chặn theo vai trò (commit `8ec776b`)

- [ ] **App Admin** là quyền "quản trị một ứng dụng" do Owner cấp riêng cho từng người (`User.appAdmins`). Người được cấp không đổi vai trò. `work` là ứng dụng Base Wework (dự án và công việc).
  - Trước đây, Thành viên là App Admin `work` sửa được cấu hình công ty và tạo được phòng ban, nhưng **không** tạo được dự án. Server tính quyền `work` rồi ghi đè ngay sau đó, trái với chính thông báo lỗi "chỉ Admin & App Admin".
  - Nay App Admin `work` tạo được dự án và trở thành người quản lý dự án đó, như anh chốt.
- Cũng sửa: các route sửa, xóa, thành viên, lưu trữ dự án và việc lặp lại còn chặn **vai trò** (admin/PM) trước khi kiểm người quản lý. Người quản lý có vai trò Thành viên vì thế bị 403 trên chính dự án mình. Nay các route đó chỉ kiểm "Admin/Owner hoặc người quản lý của dự án". Nhân bản / mẫu vẫn chỉ dành cho Admin và PM.
- **Cần sửa trong Word:**
  - **Bảng 1-1, dòng "Tạo, sửa, xóa dự án", cột Thành viên:** đổi "Không" thành **"Không (8)"**. Ghi chú (8): "trừ khi được cấp quyền quản trị ứng dụng Wework hoặc công ty cho phép mọi người tạo dự án; người tạo dự án trở thành quản lý của dự án đó và có quyền như quản lý dự án trên dự án ấy".
  - **Mục 1.4.4 (Thành viên):** thêm gạch đầu dòng: "Nếu được cấp quyền quản trị ứng dụng Wework, hoặc công ty cho phép mọi người tạo dự án, thành viên tạo được dự án và trở thành quản lý của dự án đó."
  - **Bảng 3-1:** nếu có dòng hoặc ghi chú về quyền ứng dụng / App Admin, thêm "quản trị ứng dụng Wework tạo được dự án, cấu hình công ty và phòng ban".
- **Trả lời:** Đồng ý (19/10): người được chỉ định tạo dự án thì là PM của dự án đó.

### G7. Người thực hiện không tự duyệt kết quả việc của mình (commit `b127a04`); web chỉ cho tạo việc ở dự án được phép (`d56b8cf`)

- [ ] **Tự duyệt:** web và mobile ẩn nút duyệt với người thực hiện, nhưng server vẫn cho admin, quản lý dự án và người có tên trong danh sách đánh giá duyệt cả việc chính họ làm, nếu gọi thẳng API. Ví dụ: PM tự giao việc cho mình, làm xong rồi tự duyệt. Nay người thực hiện **không bao giờ** duyệt được việc mình (403), và việc đó không hiện trong hàng chờ duyệt của họ. Lỗi này cùng loại với C4 (tự duyệt năng lực).
- **Form tạo việc trên web:** form liệt kê mọi dự án, chọn dự án không được phép thì nhận 403. Ô chọn dự án cũng bị khóa với thành viên dù họ được phép tạo việc. Nay form chỉ liệt kê dự án tạo được; nút Tạo công việc chỉ hiện khi tạo được ở ít nhất một dự án, và không hiện trên dự án đã lưu trữ.
- **Cần sửa trong Word:**
  - **Đặc tả use case về duyệt kết quả công việc** (UC có bước "Duyệt / trả lại", nếu có; thường nằm trong UC-TH03): thêm ngoại lệ "Người thực hiện không tự duyệt kết quả việc của mình, kể cả khi là quản lý dự án hoặc người đánh giá; server trả 403."
  - **Mục 5.2 (hạn chế), nếu muốn:** "Dự án chỉ có một người quản lý và không khai người đánh giá thì việc người quản lý tự làm không có ai duyệt, trừ Quản trị viên." Ghi chú: Admin vẫn duyệt được việc của người khác.
  - **Đoạn sau Bảng 4-3:** thêm `b127a04` vào danh sách lỗi phân quyền (đã thêm sẵn ở G4).
- **Trả lời:** Đồng ý sửa (19/10).
