# 🧬 Thuật toán Tối ưu hóa - Algorithms Documentation

> Đối chiếu trực tiếp với `server/src/algorithms/genetic/GeneticAlgorithm.js`
> và `server/src/algorithms/csp/CSPSolver.js`.
> Các khối ⚠️ đánh dấu chỗ **hiện trạng code khác với thiết kế lý thuyết**.

## Tổng quan bài toán

### Bài toán Phân bổ Nhân sự (Resource Allocation Problem)

**Input:**
- Tập hợp tasks T = {t₁, t₂, ..., tₙ}
- Tập hợp resources R = {r₁, r₂, ..., rₘ}
- Ma trận kỹ năng S[rᵢ][sₖ] = skill level
- Ma trận yêu cầu Q[tⱼ][sₖ] = required skill level
- Capacity C[rᵢ] = max hours/week
- Effort E[tⱼ] = estimated hours

**Output:**
- Assignment matrix A[tⱼ] = rᵢ (task j được gán cho resource i)

**Mục tiêu (Multi-objective):**
1. **Minimize workload variance**: Cân bằng khối lượng công việc
2. **Maximize skill match**: Nhân sự phù hợp nhất
3. **Minimize cost**: Chi phí thấp nhất
4. **Zero overallocation**: Không nhân sự nào bị quá tải

---

## 1. Genetic Algorithm (GA)

### 1.1 Encoding (Chromosome Representation)

```
Chromosome = [r₃, r₁, r₂, r₁, r₄, ...]
              ↑    ↑    ↑    ↑    ↑
             t₁   t₂   t₃   t₄   t₅

Mỗi gene = index của resource được gán cho task tương ứng
Chromosome length = số lượng tasks
```

### 1.2 Fitness Function

```
F(chromosome) = w₁ × f_workload + w₂ × f_skill + w₃ × f_cost + w₄ × f_overalloc

Trong đó:
- f_workload = 1 - (σ(workload) / max_workload)    // Normalize variance
- f_skill = Σ(skill_match(tⱼ, rᵢ)) / N             // Average skill match
- f_cost = 1 - (total_cost / max_cost)               // Normalize cost
- f_overalloc = 1 - (overallocated_count / M)        // Penalty for overallocation

Default weights: w₁=0.30, w₂=0.35, w₃=0.15, w₄=0.20
```

### 1.3 Skill Match Calculation

Mỗi kỹ năng yêu cầu có thêm **trọng số** `weight` (field `Task.requiredSkills[].weight`, mặc định 1):

```
skill_match(task, resource) =
  Σ (weight × min(resource_skill_level, required_level)) / Σ (weight × required_level)

Ví dụ (weight = 1 cho cả hai):
  Task yêu cầu: React(3), Node.js(2)
  Resource có: React(4), Node.js(3)
  Match = (1×min(4,3) + 1×min(3,2)) / (1×3 + 1×2) = (3 + 2) / 5 = 1.0 (100%)
```

- Task **không** yêu cầu kỹ năng nào → match = 1 (khớp hoàn hảo).
- Resource thiếu hẳn một kỹ năng → `resource_skill_level = 0` cho kỹ năng đó.
- So khớp tên kỹ năng **không phân biệt hoa thường**.
- `weight = 0` loại hẳn kỹ năng đó khỏi công thức; tổng trọng số bằng 0 → trả về 0.
- Đặt `level`/`weight` trong form Task (mục Kỹ năng yêu cầu). Tên kỹ năng có gợi ý lấy từ
  Skill Matrix của nhân sự, vì so khớp theo **tên**: gõ lệch một chữ là điểm về 0 mà không
  có cảnh báo nào.

> **Một thang duy nhất: 1-4.** `Resource.skills[].level` (enum 1-4) và
> `Task.requiredSkills[].level` (max 4) nay dùng chung thang, nên yêu cầu ở mức cao nhất
> vẫn có người khớp tuyệt đối.
>
> Trước đây `requiredSkills.level` nhận tới 5: yêu cầu mức 5 thì nhân sự giỏi nhất cũng chỉ
> đạt `min(4,5)/5 = 0.8`, không bao giờ khớp tuyệt đối, và mọi phương án đều bị trừ điểm như
> nhau ở kỹ năng đó — tức là nó không phân biệt được ai hơn ai. Bản ghi cũ còn mức 5 dọn bằng
> `npm run migrate:skill-level`; hàm chấm điểm vẫn xử lý được chúng nếu chưa dọn. Xem
> `server/tests/scoring.test.mjs`.

### 1.4 GA Operators

| Operator | Method | Mô tả |
|----------|--------|-------|
| **Selection** | Tournament (k=5) | Chọn k cá thể ngẫu nhiên, lấy best |
| **Crossover** | Uniform | Mỗi gene chọn từ parent1 hoặc parent2 (50/50) |
| **Mutation** | Random Reassignment | Thay đổi gene bằng resource ngẫu nhiên hợp lệ |
| **Elitism** | Top 5% | Giữ lại 5% cá thể tốt nhất |

### 1.5 Parameters

| Parameter | Default | Range | Mô tả |
|-----------|---------|-------|-------|
| Population Size | 100 | 50-500 | Kích thước quần thể |
| Max Generations | 500 | 100-2000 | Số thế hệ tối đa |
| Crossover Rate | 0.8 | 0.6-0.95 | Xác suất crossover |
| Mutation Rate | 0.1 | 0.01-0.3 | Xác suất mutation |
| Elitism Rate | 0.05 | 0.01-0.1 | Tỷ lệ elitism |
| Tournament Size | 5 | 3-10 | Kích thước tournament |

### 1.6 Termination Conditions

1. Đạt max generations
2. Fitness không cải thiện sau 50 generations liên tiếp
3. Fitness đạt ngưỡng mục tiêu (e.g., > 0.95)

---

## 2. Constraint Satisfaction Problem (CSP)

### 2.1 Formulation

```
Variables:   X = {x₁, x₂, ..., xₙ}  (mỗi xⱼ = task assignment)
Domains:     Dⱼ = {r₁, r₂, ..., rₘ}  (resources khả dụng cho task j)
Constraints: C = {c₁, c₂, ..., cₖ}   (ràng buộc)
```

### 2.2 Hard Constraints (đang được implement)

| # | Constraint | Mô tả | Cách kiểm tra trong code |
|---|-----------|-------|--------------------------|
| H1 | Capacity | Tổng workload ≤ max capacity | `workload[r] + effort(t) ≤ C[r] × FTE` — kiểm tra khi gán trong backtracking |
| H2 | Skill | Điểm khớp kỹ năng đạt ngưỡng | `skill_match(t, r) ≥ minSkillMatchThreshold` (mặc định **0.5**) |
| H3 | Availability | Resource khả dụng trong kỳ | `availability ≠ 'unavailable'` và khoảng thời gian task **không giao** với `unavailablePeriods`. Biên **đóng**: kỳ nghỉ kết thúc đúng ngày task bắt đầu vẫn tính là bận. Nhập lịch nghỉ ở trang Nhân sự → nút lịch → "Lịch nghỉ" |
| H4 | Dependency | Hai task phụ thuộc nhau mà lịch chồng nhau thì không cùng người | `assignment[tₐ] ≠ assignment[tᵦ]` khi `(tₐ, tᵦ)` có quan hệ phụ thuộc và `start(tₐ) < end(tᵦ) ∧ start(tᵦ) < end(tₐ)` |

> ⚠️ **H2 là ràng buộc ngưỡng tổng hợp, không phải ràng buộc từng kỹ năng.**
> Code dùng cùng công thức có trọng số ở mục 1.3 rồi so với `minSkillMatchThreshold`.
> Nghĩa là một nhân sự thiếu hẳn một kỹ năng vẫn có thể được gán, miễn điểm tổng ≥ 0.5.
> Đây **không** tương đương với `∀s: S[rᵢ][s] ≥ Q[tⱼ][s]`.

#### H4 được phát biểu lại như thế nào và tại sao

Biến quyết định của bài toán này là **"task nào giao cho ai"**; ngày bắt đầu và
kết thúc là dữ liệu đầu vào cố định, thuật toán không sinh ra lịch. Vì vậy dạng
`∀(tₐ→tᵦ): end(tₐ) ≤ start(tᵦ)` **không phải là ràng buộc trên biến quyết định** —
đổi người bao nhiêu lần cũng không làm nó đúng lên. Nếu cài đúng như công thức
đó, mọi bộ dữ liệu có lịch chồng nhau sẽ lập tức vô nghiệm mà không nói được lý do.

Nên H4 tách làm hai phần:

| Phần | Bản chất | Cách xử lý |
|------|----------|-----------|
| Thứ tự ngày `end(tₐ) > start(tᵦ)` | Lỗi **dữ liệu lịch** | Ghi vào `constraintReport.details.violated` với `type: 'dependency'`, nêu rõ cặp công việc và lệch bao nhiêu ngày. Không làm bài toán vô nghiệm |
| Cùng một người làm hai việc phụ thuộc nhau, chồng lịch | Lỗi **phân công** | Ràng buộc cứng trong backtracking: loại giá trị vi phạm khỏi miền đang thử |

Hai task nối tiếp đúng thứ tự (`end(tₐ) = start(tᵦ)`) **không** bị coi là chồng
lịch, nên một người vẫn được làm tuần tự cả hai.

H3 và H4 có bộ kiểm thử đơn vị riêng, chạy thẳng vào `CSPSolver` không qua HTTP:
`cd server && npm test csp` (28 assertion).

### 2.3 Soft Constraints

| # | Constraint | Trạng thái |
|---|-----------|-----------|
| S1 | Prefer higher skill match | ❌ Chưa implement — CSP chỉ lọc theo ngưỡng, không xếp hạng theo điểm khớp |
| S2 | Prefer balanced workload | ✅ Có, gián tiếp qua LCV (ưu tiên resource còn nhiều capacity nhất) |
| S3 | Minimize context switching | ❌ Chưa implement — không xét `project` khi chọn resource |

### 2.4 Algorithm: Backtracking + lọc miền giá trị

Luồng thực tế trong `CSPSolver.solve()`:

```
1. BUILD-CONFLICTS(tasks)                       // đồ thị ràng buộc nhị phân H4
     conflicts[i] = { j | (i,j) phụ thuộc nhau ∧ lịch chồng nhau }

2. BUILD-DOMAINS(tasks, resources)              // ràng buộc đơn phân
     Dⱼ = { r | H2(r, tⱼ) ∧ H3(r, tⱼ) }        // lọc theo skill + availability
     Nếu tồn tại Dⱼ = ∅  →  "một số công việc không có nhân sự phù hợp", dừng

3. NODE-CONSISTENCY(domains)                    // ràng buộc đơn phân theo capacity
     Dⱼ ← { r ∈ Dⱼ | effort(tⱼ) ≤ C[r] × FTE }

4. AC-3(domains, conflicts)                     // lan truyền ràng buộc nhị phân
     queue ← mọi cung (i, j) có ràng buộc
     while queue:
         (i, j) ← queue.pop()
         if REVISE(i, j):
             nếu Dᵢ = ∅  →  "ràng buộc quá chặt", dừng
             đẩy lại mọi cung (k, i) với k ∈ conflicts[i], k ≠ j

     REVISE(i, j) với ràng buộc xᵢ ≠ xⱼ:
         nếu |Dⱼ| = 1 thì bỏ giá trị đó khỏi Dᵢ

5. BACKTRACK(assignment)                        // MRV + LCV + kiểm tra H1, H4
     if |assignment| = |tasks|: return assignment
     var ← MRV(unassigned)
     for r in LCV(Dvar):
         if workload[r] + effort(var) ≤ capacity[r]        // H1
            ∧ ∀j ∈ conflicts[var]: assignment[j] ≠ r:      // H4
             assign; recurse; nếu thất bại thì undo
     return failure
```

**Điều kiện dừng của backtracking**: `maxIterations` (mặc định 10 000) hoặc
`timeout` (mặc định 30 000 ms).

Bước 3 và 4 là hai việc khác nhau và trước đây bị gộp làm một dưới cái tên "AC-3":
node consistency chỉ nhìn **một** biến (task này có vừa capacity của người kia không),
còn arc consistency nhìn **quan hệ giữa hai** biến.

> **Giới hạn của AC-3 trên ràng buộc `≠`.** Một giá trị `x ∈ Dᵢ` chỉ mất chỗ dựa khi
> `Dⱼ = {x}`, nên AC-3 chỉ lan truyền được từ những biến **đã bị ép về một giá trị duy
> nhất**. Nó **không** suy luận kiểu chuồng bồ câu — 8 công việc xung đột nhau từng đôi
> mà chỉ có 5 nhân sự thì AC-3 không phát hiện ra là vô nghiệm. Muốn vậy phải dùng ràng
> buộc **all-different** (thuật toán Régin dựa trên ghép cặp), không phải AC-3.
>
> Trên dữ liệu mẫu hiện tại AC-3 **không cắt được giá trị nào**, vì ngưỡng H2 = 0.5 rất
> hiếm khi ép một task về đúng một nhân sự. Cái được đo lường rõ là **phát hiện vô nghiệm
> sớm**: trường hợp nhiều công việc xung đột nhau cùng chỉ một người làm được, AC-3 kết
> luận với **0 vòng backtracking** và trả về đúng thông báo "ràng buộc quá chặt", thay vì
> để backtracking dò rồi báo chung chung là "không tìm thấy giải pháp".
>
> `solve()` trả thêm `propagation: { prunedValues, revisions, arcs }` để đối chiếu.

### 2.5 Heuristics

| Heuristic | Trạng thái | Cách implement |
|-----------|-----------|----------------|
| **MRV** (Minimum Remaining Values) | ✅ | Sắp xếp biến chưa gán theo `domain.length` tăng dần, lấy biến đầu |
| **LCV** (Least Constraining Value) | ✅ | Sắp xếp resource theo capacity còn lại **giảm dần** |
| **Node consistency** theo capacity | ✅ | `_nodeConsistency()` — bước 3 |
| **AC-3** đúng nghĩa | ✅ | `_arcConsistency()` — bước 4, chạy trên đồ thị H4, có đẩy lại cung sau mỗi lần cắt |
| **All-different** (Régin) | ❌ | Chưa implement — xem giới hạn của AC-3 trên `≠` ở mục 2.4 |

---

## 3. Hybrid Approach (Kết hợp)

### 3.1 Luồng thực tế

```
┌──────────────┐
│  tasks +     │
│  resources   │
└──────┬───────┘
       │
       ▼
┌─────────────────────────┐
│  Pha 1: CSP Solver      │
│  buildFeasibleDomains() │──▶ domains[t] = [chỉ số nhân sự khả thi]
│  solve()                │──▶ constraintReport + cspFeasible
└──────────┬──────────────┘
           │  miền đã lọc theo H2 (skill ≥ ngưỡng),
           │  H3 (availability) và capacity
           ▼
┌─────────────────────────┐
│  Pha 2: GA              │
│  optimize(…, {domains}) │──▶ assignments + fitness + metrics
└──────────┬──────────────┘
           ▼
   OptimizationResult
   (+ domainReduction)
```

GA nhận `domains` và chỉ sinh gen trong miền đó:

| Toán tử | Ảnh hưởng của miền |
|---------|--------------------|
| `_initializePopulation` | Mỗi gen `t` lấy ngẫu nhiên **trong** `domains[t]` |
| `_mutate` | Gán lại cũng chỉ chọn trong `domains[t]` |
| `_crossover` | Không cần sửa: chỉ hoán đổi gen cùng vị trí giữa hai cha mẹ, mà cả hai đều đã hợp lệ |
| Elitism | Không cần sửa: chỉ sao chép cá thể đã có |

Nhờ vậy **mọi cá thể trong quần thể đều thỏa mãn H2/H3 ngay từ đầu** — GA không còn
phí thế hệ để tự tìm ra điều mà CSP đã biết chắc.

### 3.2 Miền rỗng

Nếu không nhân sự nào đủ điều kiện cho một task, `buildFeasibleDomains` trả về miền rỗng
chứ không tự ý nới lỏng. GA không sinh nổi gen cho miền rỗng, nên `_resolveDomains` **mở
lại toàn bộ nhân sự** cho riêng task đó và đếm số lần phải làm vậy vào
`domainReduction.tasksReopened`. Giao diện hiện cảnh báo tương ứng — thà báo là ràng buộc
đã bị nới còn hơn im lặng trả về một phương án trông có vẻ hợp lệ.

### 3.3 Đo được gì

`OptimizationResult.domainReduction` ghi lại: `totalPairs` (số cặp task × nhân sự trước khi
lọc), `feasiblePairs` (sau khi lọc), `tasksReopened`, và cờ `restricted`.

Đo thử trên bài toán 20 công việc × 12 nhân sự, mỗi người chỉ thạo 1 kỹ năng
(240 cặp → 48 cặp khả thi, giảm 80%), trung bình 40 lần chạy mỗi chế độ:

| | Fitness trung bình | Số thế hệ tới khi dừng |
|---|---|---|
| GA chạy một mình | 0.8519 | 119 |
| Hybrid (miền từ CSP) | 0.8532 | 90 |

Thu hẹp miền chủ yếu giúp **hội tụ nhanh hơn** (~24% ít thế hệ hơn) chứ không nâng
fitness lên đáng kể — điều này hợp lý, vì GA vốn cũng tự học được cách tránh nhân sự
thiếu kỹ năng, chỉ là phải trả giá bằng nhiều thế hệ.

Kiểm thử: `cd server && npm test hybrid` (19 assertion).

---

## 4. Metrics đánh giá

| Metric | Field trong `OptimizationResult` | Formula | Thang đo |
|--------|----------------------------------|---------|----------|
| **Utilization Rate** | `metrics.resourceUtilization[].utilization` | `workload / (maxCapacity × fte) × 100` | 0-100+ |
| **Workload Variance** | `metrics.workloadVariance` | `σ(workload_all_resources)` — **độ lệch chuẩn**, dù tên field là "variance" | giờ |
| **Average Utilization** | `metrics.averageUtilization` | trung bình utilization của mọi resource | 0-100+ |
| **Skill Match Score** | `metrics.averageSkillMatch` | `avg(skill_match_per_task) × 100` | **0-100 (%)** |
| **Overallocation Count** | `metrics.overallocatedResources` | `count(workload > capacity × fte)` | số nguyên |
| **Total Cost** | `metrics.totalCost` | `Σ (hourlyRate[r] × estimatedHours[t])` | tiền |
| **Fitness** | `fitness` (cấp gốc) | công thức mục 1.2, làm tròn 4 chữ số | 0-1 |
| **Execution Time** | `executionTime` | thời gian chạy | ms |

> `averageSkillMatch` và `assignments[].skillMatch` được nhân 100 trước khi lưu (thang %),
> trong khi `fitness` giữ thang 0-1. Đừng nhầm hai thang này khi hiển thị.

**Chưa implement**: "Convergence Speed" (số generation đạt 90% fitness) không được tính ở bất kỳ đâu.
Muốn suy ra, phải tự duyệt `convergenceHistory` ở phía client — lưu ý mảng này chỉ ghi lại
generation 0, các generation chia hết cho 10, và generation cuối.

---

## 5. Tham khảo

- Holland, J.H. (1975). *Adaptation in Natural and Artificial Systems*
- Russell, S. & Norvig, P. (2020). *Artificial Intelligence: A Modern Approach*
- Deb, K. (2001). *Multi-Objective Optimization Using Evolutionary Algorithms*
