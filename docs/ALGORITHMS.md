# 🧬 Thuật toán Tối ưu hóa - Algorithms Documentation

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

```
skill_match(task, resource) = 
  Σ min(resource_skill_level, required_level) / Σ required_level

Ví dụ:
  Task yêu cầu: React(3), Node.js(2)
  Resource có: React(4), Node.js(3)
  Match = (min(4,3) + min(3,2)) / (3 + 2) = (3 + 2) / 5 = 1.0 (100%)
```

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

### 2.2 Hard Constraints (Bắt buộc thỏa mãn)

| # | Constraint | Mô tả | Formulation |
|---|-----------|-------|-------------|
| H1 | Capacity | Tổng workload ≤ max capacity | Σ effort(tasks assigned to rᵢ) ≤ C[rᵢ] × FTE |
| H2 | Skill | Resource phải có đủ skill | ∀s ∈ required_skills(tⱼ): S[rᵢ][s] ≥ Q[tⱼ][s] |
| H3 | Availability | Resource phải available | available(rᵢ, period(tⱼ)) = true |
| H4 | Dependency | Predecessor phải hoàn thành trước | ∀(tₐ → tᵦ): end(tₐ) ≤ start(tᵦ) |

### 2.3 Soft Constraints (Ưu tiên thỏa mãn)

| # | Constraint | Mô tả |
|---|-----------|-------|
| S1 | Prefer higher skill match | Ưu tiên resource có skill level cao hơn |
| S2 | Prefer balanced workload | Ưu tiên phân bổ đều |
| S3 | Minimize context switching | Ưu tiên gán liên tiếp cho cùng project |

### 2.4 Algorithm: Backtracking + AC-3

```
function BACKTRACK(assignment):
    if assignment is complete:
        return assignment
    
    var = SELECT-UNASSIGNED-VARIABLE(variables)  // MRV heuristic
    for value in ORDER-DOMAIN-VALUES(var, assignment):  // LCV heuristic
        if value is consistent with assignment:
            assignment[var] = value
            if AC-3(csp, var):  // Arc consistency
                result = BACKTRACK(assignment)
                if result ≠ failure:
                    return result
            remove assignment[var]
    return failure
```

### 2.5 Heuristics

| Heuristic | Mô tả |
|-----------|-------|
| **MRV** (Minimum Remaining Values) | Chọn variable có ít domain values nhất trước |
| **LCV** (Least Constraining Value) | Chọn value ít ảnh hưởng đến domain khác nhất |
| **AC-3** (Arc Consistency) | Loại bỏ giá trị inconsistent khỏi domains |

---

## 3. Hybrid Approach (Kết hợp)

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  CSP     │────▶│  Feasible    │────▶│  GA          │
│  Solver  │     │  Solutions   │     │  Optimization│
└──────────┘     └──────────────┘     └──────────────┘
  Phase 1:          Phase 2:            Phase 3:
  Lọc bỏ các       Tập solutions       Tối ưu hóa
  assignments       thỏa mãn           multi-objective
  vi phạm hard     hard constraints    trên tập feasible
  constraints
```

**Ưu điểm:**
- CSP đảm bảo solution luôn hợp lệ (thỏa mãn hard constraints)
- GA tối ưu hóa trên không gian đã thu hẹp → hội tụ nhanh hơn
- Kết hợp ưu điểm của cả hai approach

---

## 4. Metrics đánh giá

| Metric | Mô tả | Formula |
|--------|-------|---------|
| **Utilization Rate** | Tỷ lệ sử dụng nhân sự | workload / capacity × 100% |
| **Workload Variance** | Độ lệch chuẩn workload | σ(workload_all_resources) |
| **Skill Match Score** | Độ phù hợp kỹ năng trung bình | avg(skill_match_per_task) |
| **Overallocation Count** | Số nhân sự bị quá tải | count(resources where workload > capacity) |
| **Execution Time** | Thời gian chạy thuật toán | ms |
| **Convergence Speed** | Số generation đạt 90% fitness | generations_to_90_percent |

---

## 5. Tham khảo

- Holland, J.H. (1975). *Adaptation in Natural and Artificial Systems*
- Russell, S. & Norvig, P. (2020). *Artificial Intelligence: A Modern Approach*
- Deb, K. (2001). *Multi-Objective Optimization Using Evolutionary Algorithms*
