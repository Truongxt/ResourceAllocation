# Thuật toán, phần 1: ràng buộc mềm S1/S3, tốc độ hội tụ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Trạng thái (2026-10-08): đã làm xong Task 1–5.** Ngoài plan, phát hiện và sửa thêm: cột Hybrid
> của Benchmark Studio chưa từng nhận miền của CSP (truyền nhầm vào constructor), và schema
> `OptimizationResult.metrics` strict sẽ lặng lẽ bỏ hai chỉ số mới nếu không khai báo (có test giữ).
> Kết quả đo: S1/S3 nâng khớp kỹ năng và giảm một nửa chuyển ngữ cảnh, nhưng tải kém cân hơn.

**Goal:** CSP chọn nhân sự theo cả ba ràng buộc mềm, không chỉ theo capacity. Đo được chuyển ngữ cảnh và tốc độ hội tụ. Có số đo trước/sau để biết thay đổi có làm phân công tốt lên thật không.

**Spec:** [ALGORITHMS.md mục 2.3 và 4](../../ALGORITHMS.md), lộ trình: [2026-10-07-lo-trinh-hoan-thien.md](./2026-10-07-lo-trinh-hoan-thien.md)

## Quyết định đã chốt (2026-10-08)

1. **Thứ tự ứng viên trong CSP dùng điểm có trọng số**, không xếp theo thứ bậc tuyệt đối:
   `score(r, t) = 0.35 · skill(t, r) + 0.30 · chỗ_trống(r) + 0.15 · cùng_dự_án(r, t)`.
   Hai trọng số đầu lấy đúng tỉ lệ `skillMatch`/`workloadBalance` của fitness, để CSP và GA cùng hiểu thế nào là "phân công tốt". `chỗ_trống` là phần capacity còn lại của tuần nặng nhất, chia cho capacity (0–1). `cùng_dự_án` = 1 nếu người đó đã có việc cùng dự án, trong lần chạy này hoặc trong tải đã cam kết.
2. **S3 chỉ đo, không vào fitness.** Thêm `metrics.contextSwitches` = Σ theo người của max(0, số dự án − 1). Fitness giữ nguyên công thức, nên lịch sử cũ vẫn so được.

## Phát hiện khi đọc code

- `GeneticAlgorithm` báo `generations` bằng **mốc ghi lịch sử cuối cùng** (bội số của 10), không phải thế hệ dừng thật: dừng ở thế hệ 57 thì báo 50. `convergenceHistory` cũng thiếu điểm cuối khi dừng sớm. Bảng "số thế hệ tới khi dừng" trong ALGORITHMS.md mục 3.3 đo bằng chính trường này.
- Bộ sinh dữ liệu benchmark không gắn dự án cho việc nào, nên không đo được S3.

## Global Constraints

- **Tốc độ hội tụ** = thế hệ đầu tiên mà mức cải thiện đạt 90% tổng mức cải thiện của cả lần chạy: `best(g) − best(0) ≥ 0.9 · (best(cuối) − best(0))`. Định nghĩa "đạt 90% fitness" theo nghĩa đen không dùng được: fitness thế hệ 0 thường đã ≥ 0.9 lần fitness cuối, nên chỉ số luôn bằng 0. Không cải thiện gì thì bằng 0.
- Không đổi công thức `computeFitness`.
- Mọi số đo trước/sau phải lấy trên **cùng** bộ dữ liệu (sinh một lần, chạy cả hai phiên bản), trung bình nhiều lần chạy.

---

### Task 1: Hội tụ của GA
- [ ] Test trước (bộ `hybrid` hoặc bộ đơn vị mới): `generations` bằng thế hệ dừng thật; `convergenceHistory` kết thúc ở thế hệ đó; `metrics.convergenceGeneration` ≤ `generations`, và bằng 0 khi không cải thiện.
- [ ] Ghi `best(g)` của mọi thế hệ trong bộ nhớ (không chỉ mỗi 10 thế hệ) để tính chính xác.

### Task 2: Chỉ số chuyển ngữ cảnh
- [ ] `computeMetrics` thêm `contextSwitches`, tính cả dự án của tải đã cam kết (`committedTasks[].project`, thêm trường này trong `loadOptimizationData`).
- [ ] Bộ sinh dữ liệu benchmark gắn mỗi việc vào một trong `⌈n/10⌉` dự án.
- [ ] Test đơn vị trong `scoring`.

### Task 3: Thứ tự ứng viên CSP theo điểm có trọng số
- [ ] Test trước (bộ `csp`): hai người rảnh như nhau thì chọn người khớp kỹ năng hơn (S1); kỹ năng ngang nhau thì chọn người đã có việc cùng dự án (S3); người khớp hơn một chút nhưng gần hết capacity thua người rảnh hẳn (S2 vẫn có tác dụng).
- [ ] `_orderByLCV` → `_orderCandidates`, nhận ma trận kỹ năng tính một lần ở đầu `solve`.

### Task 4: Đo trước/sau
- [ ] Script đo: sinh dữ liệu small/medium một lần, chạy CSP bản cũ và bản mới nhiều lần, so `averageSkillMatch`, `workloadVariance`, `contextSwitches`, `fitness`. Đo lại bảng GA/Hybrid ở mục 3.3 bằng `generations` đã sửa.
- [ ] Ghi kết quả, kể cả khi không đẹp, vào ALGORITHMS.md.

### Task 5: Hiển thị và tài liệu
- [ ] Benchmark Studio và kết quả tối ưu hiện `contextSwitches` và `convergenceGeneration`.
- [ ] ALGORITHMS.md (2.3, 2.5, 3.3, 4), CHANGELOG, lộ trình, README bộ test.
