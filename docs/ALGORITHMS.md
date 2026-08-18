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

> **Lưu ý thang điểm**: `Resource.skills[].level` giới hạn 1-4, nhưng
> `Task.requiredSkills[].level` cho phép tới 5. Nếu task yêu cầu level 5,
> điểm khớp tối đa chỉ đạt 4/5 = 0.8.

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
| H3 | Availability | Resource khả dụng trong kỳ | `availability ≠ 'unavailable'` và khoảng thời gian task **không giao** với `unavailablePeriods` |

> ⚠️ **H2 là ràng buộc ngưỡng tổng hợp, không phải ràng buộc từng kỹ năng.**
> Code dùng cùng công thức có trọng số ở mục 1.3 rồi so với `minSkillMatchThreshold`.
> Nghĩa là một nhân sự thiếu hẳn một kỹ năng vẫn có thể được gán, miễn điểm tổng ≥ 0.5.
> Đây **không** tương đương với `∀s: S[rᵢ][s] ≥ Q[tⱼ][s]`.

> ⚠️ **Ràng buộc Dependency chưa được implement.** CSPSolver hiện không đọc
> `Task.dependencies`, nên không đảm bảo `end(tₐ) ≤ start(tᵦ)`. Thứ tự phụ thuộc
> giữa các task hoàn toàn không ảnh hưởng tới kết quả phân bổ.

### 2.3 Soft Constraints

| # | Constraint | Trạng thái |
|---|-----------|-----------|
| S1 | Prefer higher skill match | ❌ Chưa implement — CSP chỉ lọc theo ngưỡng, không xếp hạng theo điểm khớp |
| S2 | Prefer balanced workload | ✅ Có, gián tiếp qua LCV (ưu tiên resource còn nhiều capacity nhất) |
| S3 | Minimize context switching | ❌ Chưa implement — không xét `project` khi chọn resource |

### 2.4 Algorithm: Backtracking + lọc miền giá trị

Luồng thực tế trong `CSPSolver.solve()`:

```
1. BUILD-DOMAINS(tasks, resources)
     Dⱼ = { r | H2(r, tⱼ) ∧ H3(r, tⱼ) }        // lọc theo skill + availability
     Nếu tồn tại Dⱼ = ∅  →  trả về infeasibleTasks, dừng

2. REDUCE-DOMAINS(domains)                      // lặp tối đa 100 vòng
     Dⱼ ← { r ∈ Dⱼ | effort(tⱼ) ≤ C[r] × FTE }  // lọc unary theo capacity
     Nếu tồn tại Dⱼ = ∅  →  trả về "ràng buộc quá chặt", dừng

3. BACKTRACK(assignment)                        // MRV + LCV + kiểm tra H1
     if |assignment| = |tasks|: return assignment
     var ← MRV(unassigned)
     for r in LCV(Dvar):
         if workload[r] + effort(var) ≤ capacity[r]:
             assign; recurse; nếu thất bại thì undo
     return failure
```

**Điều kiện dừng của backtracking**: `maxIterations` (mặc định 10 000) hoặc
`timeout` (mặc định 30 000 ms).

> ⚠️ **Bước 2 không phải AC-3 thật.** AC-3 làm việc trên các *cung* (arc) giữa hai biến
> và loại giá trị không có giá trị hỗ trợ ở biến còn lại. Code hiện chỉ áp dụng bộ lọc
> **unary** trên từng biến độc lập (task có vừa capacity của resource đó không), và chạy
> **một lần trước** khi backtrack — không lồng trong vòng lặp tìm kiếm. Comment trong
> `CSPSolver.js` cũng ghi rõ đây là "simplified AC-3".

### 2.5 Heuristics

| Heuristic | Trạng thái | Cách implement |
|-----------|-----------|----------------|
| **MRV** (Minimum Remaining Values) | ✅ | Sắp xếp biến chưa gán theo `domain.length` tăng dần, lấy biến đầu |
| **LCV** (Least Constraining Value) | ✅ | Sắp xếp resource theo capacity còn lại **giảm dần** |
| Lọc miền theo capacity | ✅ | Bộ lọc unary ở bước 2 (được đặt tên "AC-3" trong code) |
| **AC-3** đúng nghĩa | ❌ | Chưa implement |

---

## 3. Hybrid Approach (Kết hợp)

### 3.1 Hiện trạng implement

```
              ┌──────────────┐
              │  tasks +     │
              │  resources   │
              └──┬────────┬──┘
                 │        │          (cùng một tập dữ liệu gốc)
        ┌────────▼──┐  ┌──▼──────────┐
        │ CSP Solver│  │     GA      │
        └────────┬──┘  └──┬──────────┘
                 │        │
     constraintReport   assignments + fitness + metrics
                 │        │
                 └───┬────┘
                     ▼
            OptimizationResult
```

`runHybrid` chạy **CSP và GA độc lập trên cùng dữ liệu gốc**:

- Kết quả phân bổ (`assignments`), `fitness`, `metrics`, `convergenceHistory` — **lấy hoàn toàn từ GA**.
- Kết quả CSP **chỉ** dùng để lấy `constraintReport` (số ràng buộc thỏa mãn/vi phạm)
  và cờ `cspFeasible` trả về cho client.
- `executionTime` là tổng thời gian của cả hai pha.

> ⚠️ **GA không nhận miền giá trị đã lọc từ CSP.** Không có luồng dữ liệu nào từ CSP sang GA,
> nên GA vẫn tìm kiếm trên toàn bộ không gian và **có thể sinh ra phương án vi phạm hard constraints**.
> `constraintReport` đến từ lời giải của CSP, không phải từ phương án GA được lưu.

### 3.2 Thiết kế mục tiêu (chưa implement)

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  CSP     │────▶│  Feasible    │────▶│  GA          │
│  Solver  │     │  Domains     │     │  Optimization│
└──────────┘     └──────────────┘     └──────────────┘
  Phase 1:          Phase 2:            Phase 3:
  Lọc bỏ các       Miền giá trị        Tối ưu hóa
  assignments      đã thu hẹp          multi-objective
  vi phạm hard     cho từng task       trên miền feasible
  constraints
```

Để đạt được thiết kế này cần truyền `reducedDomains` từ CSPSolver vào GA và giới hạn
`_initializePopulation` / `_mutate` chỉ chọn resource nằm trong miền hợp lệ của từng task.

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
