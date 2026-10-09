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
| H1 | Capacity | Tải **mỗi tuần** ≤ năng lực tuần | `∀ tuần w: load[r][w] + effort(t, w) ≤ C[r] × FTE` — giờ của task được trải lên ngày làm việc rồi gom theo tuần; chỉ những tuần task thật sự chạm tới mới bị kiểm. Xem ghi chú bên dưới |
| H2 | Skill | Điểm khớp kỹ năng đạt ngưỡng | `skill_match(t, r) ≥ minSkillMatchThreshold` (mặc định **0.5**) |
| H3 | Availability | Resource khả dụng trong kỳ | `availability ≠ 'unavailable'` và khoảng thời gian task **không giao** với `unavailablePeriods`. Biên **đóng**: kỳ nghỉ kết thúc đúng ngày task bắt đầu vẫn tính là bận. Nhập lịch nghỉ ở trang Nhân sự → nút lịch → "Lịch nghỉ" |
| H4 | Dependency | Hai task phụ thuộc nhau mà lịch chồng nhau thì không cùng người | `assignment[tₐ] ≠ assignment[tᵦ]` khi `(tₐ, tᵦ)` có quan hệ phụ thuộc và `start(tₐ) < end(tᵦ) ∧ start(tᵦ) < end(tₐ)` |

> ⚠️ **H1 đo theo tuần, không theo tổng giờ cả kỳ.** `C[r]` là số giờ **mỗi tuần**
> (`maxCapacity × fte`), nên thứ đem so với nó cũng phải là giờ mỗi tuần. Trước đây H1 cộng
> dồn `estimatedHours` của mọi task đã gán rồi so với `C[r]` — một lượng tích lũy đem so với
> một tốc độ. Hệ quả: một người không bao giờ nhận nổi quá ~40 giờ cho **cả dự án** dù dự án
> dài 6 tháng, và mục tiêu "phạt quá tải" luôn bằng 0 nên 20% trọng số fitness thành trọng số
> chết. Đo lại trên cùng một lời giải của bộ benchmark 30 việc / 6 người: cách cũ báo **6/6**
> người quá tải (đỉnh tuần thật chỉ 25–40h so với năng lực 40h), cách mới báo **0/6**.
>
> Việc **chưa xếp lịch** (thiếu ngày) không trải lên trục thời gian được nên được coi như dồn
> vào một tuần — mức sàn bảo thủ, để việc thiếu ngày không thành "miễn phí" với thuật toán.
> Nhờ vậy dữ liệu không có ngày vẫn hành xử đúng như trước.

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
`cd server && npm test csp` (52 assertion, gồm thứ tự ứng viên S1/S2/S3).

### 2.3 Soft Constraints

| # | Constraint | Trạng thái |
|---|-----------|-----------|
| S1 | Prefer higher skill match | ✅ Trọng số 0.35 trong thứ tự thử ứng viên |
| S2 | Prefer balanced workload | ✅ Trọng số 0.30: chỗ trống của tuần nặng nhất / capacity |
| S3 | Minimize context switching | ✅ Trọng số 0.15: người đã có việc cùng dự án (trong lần chạy hoặc tải đã cam kết) |

Backtracking trả về **lời giải đầu tiên** tìm được, nên thứ tự thử ứng viên chính là nơi ràng
buộc mềm có tác dụng:

```
score(r, t) = 0.35 · skill(t, r) + 0.30 · chỗ_trống(r) + 0.15 · cùng_dự_án(r, t)
```

Hai trọng số đầu theo đúng tỉ lệ `skillMatch`/`workloadBalance` của fitness (mục 1.2), để CSP và GA
cùng hiểu thế nào là phân công tốt. S3 không nằm trong fitness — nó chỉ được **đo** qua
`metrics.contextSwitches` (mục 4), nên lịch sử fitness cũ vẫn so được. Trọng số 0.15 của S3 chọn
để thắng chênh lệch chỗ trống mà một việc thường gây ra (8h/40h × 0.30 = 0.06), nhưng thua chênh
lệch kỹ năng rõ rệt (0.5 × 0.35 = 0.175).

Trước 08/10, thứ tự này chỉ xét chỗ trống (LCV). Đo bằng `npm run measure:csp-soft` (thư mục
`server`): 30 bộ mỗi cỡ sinh **một lần** bằng bộ sinh hiện tại với seed cố định (chạy lại ra đúng
số này), chạy cả hai bản trên cùng dữ liệu, trung bình trên những bộ mà **cả hai** bản cùng giải
được (cột "Số cặp"). Bản "trước" chỉ khác ở thứ tự thử ứng viên. Đo ngày 08/10, sau `edd9847`:

| | Khớp kỹ năng (%) | Chuyển ngữ cảnh | Fitness | Độ lệch tải σ (giờ) | Giải được | Số cặp |
|---|---|---|---|---|---|---|
| medium, ngưỡng 0.5 (mặc định, như Benchmark Studio) | 85 → **94** | 60.6 → **33.8** | 0.796 → **0.820** | 16.4 → 18.3 | 15 → **18**/30 | 11 |
| small, ngưỡng 0.5 | 92 → **95** | 3.9 → **2.9** | 0.793 → **0.796** | 14.8 → 18.0 | 15 → 15/30 | 15 |
| medium, ngưỡng 0 | 30 → **93** | 60.6 → **34.4** | 0.604 → **0.820** | 15.7 → 16.5 | 25 → **30**/30 | 25 |
| small, ngưỡng 0 | 38 → **87** | 4.3 → **3.4** | 0.619 → **0.784** | 12.5 → 14.4 | 29 → **30**/30 | 29 |

Cái giá là **tải kém cân hơn** (σ tăng 0.8–3.2 giờ ở mọi ô): đó là hệ quả trực tiếp của việc S2
không còn là tiêu chí duy nhất. Fitness vẫn tăng vì khớp kỹ năng có trọng số lớn hơn cân tải.

Ở ngưỡng 0.5, bộ lọc H2 đã loại phần lớn người khớp kém, nên S1 còn ít chỗ để nâng khớp kỹ năng
(85 → 94); phần lớn tác dụng là gom việc cùng dự án (S3: chuyển ngữ cảnh gần giảm một nửa ở
medium). Ngưỡng 0 bỏ hẳn bộ lọc kỹ năng, chỉ còn thứ tự quyết định — đó là chỗ thấy rõ nhất S1
làm gì. Hai bản giải được những tập bộ **khác nhau** ở medium ngưỡng 0.5 (15 và 18 bộ, chỉ 11 bộ
chung): cả hai thất bại ở đây đều do chạm `maxIterations`, và thứ tự khác nhau thì đi lạc ở những
bộ khác nhau.

> Bảng trước bản này đo bằng **bộ sinh dữ liệu cũ**, ở ngưỡng 0.1 và 0 (ngưỡng 0.5 khi đó vô nghiệm
> 0/30 bộ small). Bộ đó làm CSP rất hay vô nghiệm: mỗi việc đòi 1–3 kỹ năng ngẫu nhiên trong 15,
> độc lập với kỹ năng của người, nên thường có việc không ai có kỹ năng và bộ lọc H2 loại sạch.
> Hướng thay đổi giống bảng mới (khớp kỹ năng và chuyển ngữ cảnh tốt lên, σ tăng), nhưng các con số
> không so trực tiếp được với bảng trên.
>
> **Bộ sinh hiện tại** (`datasetGenerator.js`) gắn kỹ năng vào vai trò. Mỗi người nắm trọn cụm kỹ
> năng của vai trò mình (cấp 2–4), cộng 0–2 kỹ năng ngoài cụm (cấp 1–2). Mỗi việc thuộc vai trò của
> một người có thật trong đội và đòi 1–3 kỹ năng (cấp 1–3) từ cụm đó, nên luôn có ít nhất một người
> khớp ≥ 2/3. Đo 30 bộ mỗi ô:
>
> | | Bộ sinh cũ | Bộ sinh mới | Nguyên nhân thất bại còn lại |
> |---|---|---|---|
> | small, ngưỡng 0.5 | 0/30 (30 miền rỗng) | **16/30** | Vô nghiệm thật vì capacity (tìm kiếm cạn sau < 2 300 bước) |
> | small, ngưỡng 0.1 | 9/30 (20 miền rỗng) | **28/30** | Như trên |
> | medium, ngưỡng 0.5 | 5/30 (22 miền rỗng) | **19/30** | Chạm `maxIterations` (10 000), chưa chắc vô nghiệm — nay báo `stopReason: 'maxIterations'` |
> | medium, ngưỡng 0.1 | 29/30 | 22/30 | Như trên. Ít ứng viên hơn: việc thuộc vai trò, nên người ngoài vai trò ít khi đạt dù chỉ 0.1 |
>
> Bảng trước/sau ở đầu mục này đã đo bằng bộ sinh mới. Bảng ở mục 3.3 dùng bài toán dựng tay,
> không qua bộ sinh, nên không bị ảnh hưởng.

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
         if ∀w ∈ tuần(var): load[r][w] + effort(var, w) ≤ capacity[r]   // H1
            ∧ ∀j ∈ conflicts[var]: assignment[j] ≠ r:      // H4
             assign; recurse; nếu thất bại thì undo
     return failure
```

**Điều kiện dừng của backtracking**: `maxIterations` (mặc định 10 000) hoặc
`timeout` (mặc định 30 000 ms). Hết ngân sách **không** có nghĩa là vô nghiệm, nên kết quả thất bại
phân biệt hai trường hợp:

| Trường hợp | `stopReason` | `exhaustive` | `message` |
|---|---|---|---|
| Đã thử hết mọi nhánh | `null` | `true` | "Không tìm thấy giải pháp thỏa mãn tất cả ràng buộc" |
| Chạm trần | `'maxIterations'` hoặc `'timeout'` | `false` | "Hết ngân sách tìm kiếm (…) nên chưa tìm xong — bài toán có thể vẫn có nghiệm" |

Trước đây cả hai cùng một câu báo. Khi đó, chạm trần xong các tầng trên vẫn thử tiếp ứng viên còn lại,
mỗi lần tốn thêm một bước. Vì vậy một lượt "10 000 bước" thực ra dừng ở khoảng 10 250 bước.

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
| **Thứ tự giá trị** (thay LCV từ 08/10) | ✅ | `_orderCandidates()` — điểm ràng buộc mềm S1/S2/S3, xem mục 2.3. LCV cũ (chỉ capacity còn lại) nay là thành phần S2 |
| **Node consistency** theo capacity | ✅ | `_nodeConsistency()` — bước 3 |
| **AC-3** đúng nghĩa | ✅ | `_arcConsistency()` — bước 4, chạy trên đồ thị H4, có đẩy lại cung sau mỗi lần cắt |
| **All-different** (Régin) | — | **Quyết định không làm (08/10)**, xem ghi chú dưới bảng |

**Vì sao không làm all-different.** Régin chỉ lọc được nhiều hơn AC-3 khi có một tập **từ 3 biến trở lên
đôi một khác nhau**, tức clique kích thước ≥ 3 trong đồ thị xung đột H4. Đo trên việc đang mở của từng công
ty, dựng đồ thị đúng như CSP dựng (`_buildDependencyConflicts`):

| Database | Việc đang mở | Việc có phụ thuộc | Cạnh H4 | Clique lớn nhất |
|---|---|---|---|---|
| dev (công ty ABC) | 21 | 13 | 3 | **2** |
| dev (công ty mặc định) | 2 | — | 1 | 2 |
| e2e, test (dữ liệu mẫu) | 2–3 | 2 | 1 | 2 |

Bộ sinh dữ liệu benchmark không tạo phụ thuộc nào. Clique kích thước 2 chính là ràng buộc nhị phân `≠`, và
AC-3 đã lọc nó trọn vẹn. Về cấu trúc, muốn có clique 3 thì phải có ba việc phụ thuộc đôi một **và** chồng
lịch đôi một. Với phụ thuộc finish-to-start, chồng lịch đã là lỗi dữ liệu, nên đó là ba lỗi lịch cùng lúc.
Trường hợp "nhiều việc trùng giờ mà capacity chỉ đủ cho một" cũng không phải all-different: nó phụ thuộc số
giờ của từng việc, tức là ràng buộc tích lũy (cumulative), và đã được kiểm qua capacity theo tuần. Nếu dữ
liệu thật về sau xuất hiện clique ≥ 3 thì đo lại bằng cùng cách.

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

| | Fitness trung bình | Thế hệ dừng | Hội tụ 90% (thế hệ) |
|---|---|---|---|
| GA chạy một mình | 0.8530 | 76.3 | 13.9 |
| Hybrid (miền từ CSP) | 0.8530 | 51.8 | **1.8** |

Thu hẹp miền giúp **hội tụ nhanh hơn hẳn** chứ không nâng fitness lên: GA vốn cũng tự học được
cách tránh nhân sự thiếu kỹ năng, chỉ là phải trả giá bằng nhiều thế hệ. Đo lại ngày 08/10. Bảng
cũ (119 / 90 thế hệ) đo bằng trường `generations` khi trường này còn lỗi: nó lấy **mốc ghi lịch sử
cuối** (bội số của 10) thay vì thế hệ dừng thật. "Hội tụ 90%" là chỉ số mới, định nghĩa ở mục 4.

> **Benchmark Studio trước 08/10 không chạy Hybrid thật.** Cột Hybrid truyền miền của CSP vào
> **constructor** của GA (`feasibleDomains`), nơi không ai đọc. Cột đó thật ra là GA với tỉ lệ lai
> ghép/đột biến khác, nên mọi kết luận "Hybrid tốt hơn GA" rút từ trang này trước ngày đó đều không
> có cơ sở. Nay miền đi qua `optimize(..., { domains })`, và cột Hybrid báo kèm `domainReduction`.

Kiểm thử: `cd server && npm test hybrid` (29 assertion, gồm số thế hệ, tốc độ hội tụ và cột Hybrid
của Benchmark Studio).

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
| **Context Switches** (S3) | `metrics.contextSwitches` | `Σ_người max(0, số dự án − 1)`, tính cả dự án của tải đã cam kết | số nguyên, càng nhỏ càng tốt |
| **Convergence Speed** | `metrics.convergenceGeneration` (GA, Hybrid) | thế hệ đầu tiên có `best(g) − best(0) ≥ 0.9 · (best(cuối) − best(0))`; không cải thiện → 0 | thế hệ |

> `averageSkillMatch` và `assignments[].skillMatch` được nhân 100 trước khi lưu (thang %),
> trong khi `fitness` giữ thang 0-1. Đừng nhầm hai thang này khi hiển thị.

"Hội tụ 90%" đo theo **mức cải thiện**, không theo "đạt 90% fitness cuối". Theo nghĩa đen, fitness
của thế hệ 0 thường đã ≥ 0.9 lần fitness cuối, nên chỉ số luôn bằng 0. Nó được tính trên fitness
tốt nhất của **mọi** thế hệ, giữ trong bộ nhớ lúc chạy, chứ không trên `convergenceHistory`: mảng
đó chỉ ghi thế hệ 0, các thế hệ chia hết cho 10, và thế hệ dừng thật (kể cả khi dừng sớm).

---

## 5. Tham khảo

- Holland, J.H. (1975). *Adaptation in Natural and Artificial Systems*
- Russell, S. & Norvig, P. (2020). *Artificial Intelligence: A Modern Approach*
- Deb, K. (2001). *Multi-Objective Optimization Using Evolutionary Algorithms*
