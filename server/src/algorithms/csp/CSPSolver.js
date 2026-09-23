/**
 * CSP Solver - Constraint Satisfaction Problem
 *
 * Giải bài toán phân bổ nhân sự với ràng buộc cứng:
 *   H1: Capacity - Nhân sự không vượt quá FTE capacity
 *   H2: Skill - Nhân sự phải có đủ kỹ năng yêu cầu
 *   H3: Availability - Nhân sự phải available
 *   H4: Dependency - Hai công việc có quan hệ phụ thuộc mà lịch chồng nhau
 *       thì không được giao cho cùng một người
 *
 * Ghi chú về H4: biến quyết định của bài toán này là "task nào giao cho ai",
 * ngày tháng là dữ liệu đầu vào cố định. Vì vậy vi phạm thứ tự thuần túy về
 * ngày — end(A) > start(B) khi B phụ thuộc A — không thể sửa bằng cách đổi
 * người, và được báo trong constraintReport thay vì làm bài toán vô nghiệm.
 * Phần thực sự ràng buộc được lời giải là: một người không thể vừa làm A vừa
 * làm B khi hai việc phụ thuộc nhau và khoảng thời gian chồng lên nhau.
 *
 * Algorithm: lọc miền (H2/H3) → node consistency theo capacity → AC-3 trên đồ thị
 * ràng buộc nhị phân H4 → Backtracking với MRV + LCV.
 */

const {
  DEFAULT_WEIGHTS,
  computeSkillMatch,
  buildSkillMatrix,
  computeMaxCost,
  computeFitness,
  computeMetrics,
  emptyMetrics,
  weeklyDemandOf,
} = require('../scoring');
const {
  dependencyTaskId,
  dependencyType,
} = require('../../services/taskDependency.service');

class CSPSolver {
  constructor(options = {}) {
    this.maxIterations = options.maxIterations || 10000;
    this.timeout = options.timeout || 30000; // 30 seconds
    this.minSkillMatchThreshold = options.minSkillMatchThreshold ?? 0.5;
    // Dùng để chấm điểm lời giải bằng cùng thang đo với GA
    this.weights = options.weights || DEFAULT_WEIGHTS;
  }

  /**
   * Solve the CSP
   * @param {Array} tasks - [{ _id, title, estimatedHours, requiredSkills, startDate, endDate }]
   * @param {Array} resources - [{ _id, maxCapacity, fte, skills, availability, unavailablePeriods }]
   * @returns {Object} Solution
   */
  async solve(tasks, resources) {
    const startTime = Date.now();

    if (!tasks.length || !resources.length) {
      return this._emptyResult('Không có dữ liệu tasks hoặc resources');
    }

    const prepared = this._prepareDomains(tasks, resources);
    this._conflicts = prepared.conflicts;

    // Không nhân sự nào qua được H2/H3 cho một task nào đó
    if (prepared.emptyAfterFiltering.length) {
      return {
        ...this._emptyResult('Một số công việc không có nhân sự phù hợp'),
        infeasibleTasks: prepared.emptyAfterFiltering.map((t) => tasks[t].title || `Task ${t}`),
        diagnostics: this._explainFailure(tasks, resources),
        solveTime: Date.now() - startTime,
      };
    }

    // Còn nhân sự phù hợp, nhưng lan truyền ràng buộc cho thấy không thể xếp được
    if (prepared.emptyAfterPropagation.length) {
      return {
        ...this._emptyResult('Ràng buộc quá chặt, không tìm thấy giải pháp'),
        infeasibleTasks: prepared.emptyAfterPropagation.map((t) => tasks[t].title || `Task ${t}`),
        diagnostics: this._explainFailure(tasks, resources),
        solveTime: Date.now() - startTime,
      };
    }

    const reducedDomains = prepared.domains;

    // Backtracking search
    this._iterations = 0;
    this._startTime = startTime;
    const assignment = {};
    // Sổ tải theo TUẦN thay vì một con số tổng: xem `_checkCapacityConstraint`.
    const loads = {};
    // Khởi tạo bằng tải người đó ĐÃ cam kết ở dự án khác, không phải bằng 0.
    // Bắt đầu từ 0 khiến mỗi lần chạy tưởng cả đội đang rảnh, và H1 Capacity được
    // báo "thỏa mãn" trên một bức tranh chỉ đúng một nửa.
    resources.forEach((r, i) => {
      const committed = (this._committedLoads && this._committedLoads[i]) || null;
      loads[i] = {
        weeks: new Map(committed ? committed.weeks : []),
        unscheduled: committed ? committed.unscheduled : 0,
      };
    });
    // Nhu cầu theo tuần của từng task tính một lần rồi dùng lại suốt quá trình tìm kiếm.
    this._demands = tasks.map((task) => weeklyDemandOf(task));

    const result = this._backtrack(assignment, tasks, reducedDomains, resources, loads);

    const solveTime = Date.now() - startTime;

    if (!result) {
      return {
        ...this._emptyResult('Không tìm thấy giải pháp thỏa mãn tất cả ràng buộc'),
        diagnostics: this._explainFailure(tasks, resources),
        iterations: this._iterations,
        solveTime,
      };
    }

    // Chuyển lời giải {taskIndex: resourceIndex} về dạng mảng để dùng chung hàm chấm điểm
    const solution = tasks.map((_, tIdx) => result[tIdx]);
    const skillMatrix = buildSkillMatrix(tasks, resources);

    const assignments = this._buildAssignments(result, tasks, resources, skillMatrix);
    const constraintReport = this._validateConstraints(result, tasks, resources);
    const fitness = computeFitness(
      solution, tasks, resources, skillMatrix, computeMaxCost(tasks, resources), this.weights
    );
    const metrics = computeMetrics(solution, tasks, resources, skillMatrix);

    return {
      success: true,
      feasible: true,
      assignments,
      constraintReport,
      fitness: Math.round(fitness * 10000) / 10000,
      metrics,
      iterations: this._iterations,
      solveTime,
      propagation: prepared.propagation,
      domainSizes: reducedDomains.map((d, i) => ({
        task: tasks[i].title,
        originalSize: prepared.initialDomains[i].length,
        reducedSize: d.length,
      })),
    };
  }

  /**
   * Miền giá trị khả thi của từng task — `domains[taskIndex] = [resourceIndex, ...]`.
   *
   * Đây là thứ Hybrid cần: GA chỉ sinh gen trong miền này thay vì trên toàn bộ
   * nhân sự. Tách riêng khỏi `solve()` vì miền vẫn dùng được kể cả khi backtracking
   * không tìm ra lời giải đầy đủ (hết thời gian, hoặc ràng buộc quá chặt).
   *
   * Miền rỗng nghĩa là không nhân sự nào đủ điều kiện cho task đó; bên gọi tự
   * quyết định xử lý ra sao chứ hàm này không tự ý mở rộng.
   */
  buildFeasibleDomains(tasks, resources) {
    if (!tasks.length || !resources.length) return [];
    return this._prepareDomains(tasks, resources).domains;
  }

  /**
   * Ba bước thu hẹp miền, dùng chung cho `solve()` và `buildFeasibleDomains()` để
   * hai đường không bao giờ lệch nhau:
   *
   *   1. Lọc theo ràng buộc **đơn phân** trên từng biến: H2 (kỹ năng) và H3 (lịch nghỉ).
   *   2. Node consistency: bỏ nhân sự không đủ capacity cho riêng task đó.
   *   3. **AC-3** trên đồ thị ràng buộc **nhị phân** H4.
   *
   * Trả về cả miền ban đầu và số giá trị bị AC-3 cắt, để báo cáo lại được.
   */
  _prepareDomains(tasks, resources) {
    // Sổ tải mà mỗi nhân sự ĐÃ cam kết ở nơi khác. Tính một lần ở đây để bước lọc
    // miền, quá trình tìm kiếm và phần chẩn đoán lỗi đều nhìn cùng một con số.
    this._committedLoads = resources.map((r) => this._committedLoadOf(r));

    const conflicts = this._buildDependencyConflicts(tasks);

    const initialDomains = this._buildDomains(tasks, resources);
    const emptyAfterFiltering = initialDomains
      .map((d, t) => (d.length ? -1 : t))
      .filter((t) => t >= 0);

    const nodeConsistent = this._nodeConsistency(tasks, initialDomains, resources);
    const { domains, prunedValues, revisions } = this._arcConsistency(nodeConsistent, conflicts);

    const emptyAfterPropagation = domains
      .map((d, t) => (d.length || emptyAfterFiltering.includes(t) ? -1 : t))
      .filter((t) => t >= 0);

    return {
      conflicts,
      initialDomains,
      domains,
      emptyAfterFiltering,
      emptyAfterPropagation,
      propagation: {
        prunedValues,
        revisions,
        arcs: conflicts.reduce((sum, set) => sum + set.size, 0),
      },
    };
  }

  // ──────────────────────────────────────────────
  // Build domains: feasible resources for each task
  // ──────────────────────────────────────────────
  _buildDomains(tasks, resources) {
    return tasks.map((task) => {
      const feasible = [];
      for (let r = 0; r < resources.length; r++) {
        if (this._checkSkillConstraint(resources[r], task) &&
            this._checkAvailabilityConstraint(resources[r], task)) {
          feasible.push(r);
        }
      }
      return feasible;
    });
  }

  // ──────────────────────────────────────────────
  // Constraint Checks
  // ──────────────────────────────────────────────
  _checkSkillConstraint(resource, task) {
    // Dùng chung công thức với GA để hai thuật toán đánh giá kỹ năng như nhau
    return computeSkillMatch(task, resource) >= this.minSkillMatchThreshold;
  }

  _checkAvailabilityConstraint(resource, task) {
    if (resource.availability === 'unavailable') return false;

    if (!task.startDate || !task.endDate) return true;

    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);

    for (const period of (resource.unavailablePeriods || [])) {
      const periodStart = new Date(period.startDate);
      const periodEnd = new Date(period.endDate);

      // Check overlap
      if (taskStart <= periodEnd && taskEnd >= periodStart) {
        return false;
      }
    }
    return true;
  }

  /**
   * H1: thêm task này vào thì có tuần nào của người đó vượt năng lực TUẦN không.
   *
   * Trước đây so `tổng giờ tích lũy + giờ task` với năng lực tuần — một lượng đem
   * so với một tốc độ, khiến một người không bao giờ nhận quá ~40 giờ cho cả dự án
   * dù dự án kéo dài bao lâu. Nay chỉ những TUẦN mà task thật sự chạm tới mới bị
   * kiểm, nên việc trải dài không còn chiếm chỗ của việc khác.
   */
  _checkCapacityConstraint(resourceIdx, resources, loads, demand) {
    const resource = resources[resourceIdx];
    const capacity = (resource.maxCapacity || 40) * (resource.fte || 1);
    const load = loads[resourceIdx];

    for (const [week, hours] of demand.weeks) {
      if ((load.weeks.get(week) || 0) + hours > capacity) return false;
    }
    // Việc chưa xếp lịch: coi như dồn chung một tuần, để nó không "miễn phí".
    if (load.unscheduled + demand.unscheduledHours > capacity) return false;
    return true;
  }

  /** Cộng/trừ nhu cầu theo tuần vào sổ tải của một resource. */
  _applyDemand(load, demand, sign) {
    for (const [week, hours] of demand.weeks) {
      const next = (load.weeks.get(week) || 0) + sign * hours;
      if (next <= 0) load.weeks.delete(week);
      else load.weeks.set(week, next);
    }
    load.unscheduled += sign * demand.unscheduledHours;
  }

  /** Tuần nặng nhất hiện tại của một resource. */
  _peakOf(load) {
    let peak = load.unscheduled;
    for (const hours of load.weeks.values()) {
      if (hours > peak) peak = hours;
    }
    return peak;
  }

  // ──────────────────────────────────────────────
  // H4: Dependency
  // ──────────────────────────────────────────────

  /** Hai khoảng thời gian có phần chung thực sự (chạm nhau ở mốc không tính là chồng). */
  _overlaps(a, b) {
    if (!a.startDate || !a.endDate || !b.startDate || !b.endDate) return false;
    return new Date(a.startDate) < new Date(b.endDate) && new Date(b.startDate) < new Date(a.endDate);
  }

  /** Danh sách các cặp phụ thuộc (chỉ số) mà lịch chồng nhau, tra cứu hai chiều. */
  _buildDependencyConflicts(tasks) {
    const indexById = new Map(tasks.map((t, i) => [String(t._id), i]));
    const conflicts = tasks.map(() => new Set());

    tasks.forEach((task, i) => {
      (task.dependencies || []).forEach((dep) => {
        const j = indexById.get(dependencyTaskId(dep));
        // Bỏ qua tiền nhiệm nằm ngoài tập đang tối ưu (đã xong, hoặc khác dự án)
        if (j === undefined || j === i) return;
        if (!this._overlaps(task, tasks[j])) return;
        conflicts[i].add(j);
        conflicts[j].add(i);
      });
    });

    return conflicts;
  }

  _checkDependencyConstraint(taskIdx, resourceIdx, assignment) {
    for (const other of this._conflicts[taskIdx]) {
      if (assignment[other] === resourceIdx) return false;
    }
    return true;
  }

  // ──────────────────────────────────────────────
  // Node consistency: ràng buộc đơn phân theo capacity
  // ──────────────────────────────────────────────

  /**
   * Bỏ khỏi miền những nhân sự không đủ capacity cho riêng task đó — dù có được
   * giao mỗi việc này thôi thì cũng đã vượt. Đây là **node consistency** (ràng
   * buộc chỉ liên quan tới một biến), không phải arc consistency; trước đây phần
   * này bị đặt nhầm tên là AC-3.
   */
  _nodeConsistency(tasks, domains, resources) {
    return domains.map((domain, t) => {
      // So **nhu cầu tuần cao nhất của riêng task này** với năng lực tuần, chứ không
      // so tổng giờ của nó. Một việc 60h kéo dài 3 tháng chỉ cần ~5h/tuần: so tổng
      // thì nó bị loại khỏi miền của mọi nhân sự 40h/tuần và miền rỗng ngay từ đầu —
      // đó chính là nguồn gốc của những lần "miền rỗng phải mở lại" trước đây.
      const demand = weeklyDemandOf(tasks[t]);
      const needed = Math.max(demand.peakWeekHours, demand.unscheduledHours);
      return domain.filter((rIdx) => {
        const capacity = (resources[rIdx].maxCapacity || 40) * (resources[rIdx].fte || 1);
        if (needed > capacity) return false;

        // Người đã kín lịch vì việc ở dự án khác phải bị loại ngay từ bước lọc miền.
        // Để họ lại thì miền vẫn "có ứng viên", backtracking chạy hết rồi mới thất
        // bại, và kết quả trả về chỉ là câu chung chung "không tìm thấy giải pháp"
        // thay vì chỉ đúng ra công việc nào kẹt và kẹt vì ai.
        const committed = this._committedLoads && this._committedLoads[rIdx];
        if (!committed) return true;
        for (const [week, hours] of demand.weeks) {
          if ((committed.weeks.get(week) || 0) + hours > capacity) return false;
        }
        return committed.unscheduled + demand.unscheduledHours <= capacity;
      });
    });
  }

  // ──────────────────────────────────────────────
  // AC-3: Arc Consistency
  // ──────────────────────────────────────────────

  /**
   * AC-3 trên đồ thị ràng buộc nhị phân H4 (hai công việc phụ thuộc nhau và chồng
   * lịch thì không được cùng người → `x_i ≠ x_j`).
   *
   *   queue ← mọi cung (i, j) có ràng buộc
   *   while queue:
   *     (i, j) ← queue.pop()
   *     if REVISE(i, j):
   *        nếu D_i rỗng → thất bại
   *        đẩy lại mọi cung (k, i) với k là hàng xóm của i, k ≠ j
   *
   * Với ràng buộc `≠`, một giá trị x ∈ D_i mất chỗ dựa khi và chỉ khi D_j = {x}.
   * Nghĩa là AC-3 chỉ lan truyền được từ những biến đã bị ép về một giá trị duy
   * nhất — đó là giới hạn cố hữu của arc consistency trên `≠`, muốn cắt mạnh hơn
   * phải dùng ràng buộc all-different (thuật toán Régin) chứ không phải AC-3.
   * Đổi lại, nó phát hiện sớm những nhánh vô nghiệm mà backtracking phải dò tới
   * lúc hết thời gian mới biết.
   */
  _arcConsistency(domains, conflicts) {
    const reduced = domains.map((d) => [...d]);

    const queue = [];
    conflicts.forEach((neighbours, i) => {
      neighbours.forEach((j) => queue.push([i, j]));
    });

    let prunedValues = 0;
    let revisions = 0;

    while (queue.length) {
      const [i, j] = queue.shift();
      revisions++;

      // REVISE: với ràng buộc ≠, chỉ cắt được khi hàng xóm còn đúng một giá trị
      if (reduced[j].length !== 1) continue;

      const onlyValue = reduced[j][0];
      const before = reduced[i].length;
      reduced[i] = reduced[i].filter((value) => value !== onlyValue);
      if (reduced[i].length === before) continue;

      prunedValues += before - reduced[i].length;
      if (!reduced[i].length) break; // miền rỗng — dừng, bên gọi sẽ báo vô nghiệm

      // Miền của i vừa đổi → xét lại mọi cung trỏ về i
      conflicts[i].forEach((k) => {
        if (k !== j) queue.push([k, i]);
      });
    }

    return { domains: reduced, prunedValues, revisions };
  }

  // ──────────────────────────────────────────────
  // Backtracking with MRV + LCV
  // ──────────────────────────────────────────────
  _backtrack(assignment, tasks, domains, resources, loads) {
    this._iterations++;

    // Check timeout
    if (Date.now() - this._startTime > this.timeout) return null;
    if (this._iterations > this.maxIterations) return null;

    // Check if complete
    if (Object.keys(assignment).length === tasks.length) {
      return { ...assignment };
    }

    // MRV: Select unassigned variable with smallest domain
    const unassigned = [];
    for (let t = 0; t < tasks.length; t++) {
      if (assignment[t] === undefined) {
        unassigned.push({ t, domainSize: domains[t].length });
      }
    }
    unassigned.sort((a, b) => a.domainSize - b.domainSize);
    const varIdx = unassigned[0].t;

    // LCV: Order domain values by least constraining
    const orderedValues = this._orderByLCV(varIdx, domains, resources, loads, tasks);

    for (const rIdx of orderedValues) {
      const demand = this._demands[varIdx];

      // Check capacity constraint
      if (!this._checkCapacityConstraint(rIdx, resources, loads, demand)) {
        continue;
      }

      // H4: không giao hai việc phụ thuộc nhau, chồng lịch cho cùng một người
      if (!this._checkDependencyConstraint(varIdx, rIdx, assignment)) {
        continue;
      }

      // Assign
      assignment[varIdx] = rIdx;
      this._applyDemand(loads[rIdx], demand, +1);

      // Recurse
      const result = this._backtrack(assignment, tasks, domains, resources, loads);
      if (result) return result;

      // Undo
      delete assignment[varIdx];
      this._applyDemand(loads[rIdx], demand, -1);
    }

    return null;
  }

  // LCV: Order values by how many options they leave for other variables
  _orderByLCV(varIdx, domains, resources, loads, tasks) {
    // Chỗ trống còn lại tính theo TUẦN NẶNG NHẤT hiện có của mỗi người, cùng đơn vị
    // với capacity. Xếp người còn nhiều chỗ lên trước để ít ràng buộc các biến sau.
    const remainingOf = (rIdx) => {
      const capacity = (resources[rIdx].maxCapacity || 40) * (resources[rIdx].fte || 1);
      return capacity - this._peakOf(loads[rIdx]);
    };

    return [...domains[varIdx]].sort((a, b) => remainingOf(b) - remainingOf(a));
  }

  // ──────────────────────────────────────────────
  // Build result assignments
  // ──────────────────────────────────────────────
  _buildAssignments(assignment, tasks, resources, skillMatrix) {
    return Object.entries(assignment).map(([tIdx, rIdx]) => {
      const taskIndex = parseInt(tIdx, 10);
      const task = tasks[taskIndex];
      const resource = resources[rIdx];
      return {
        task: task._id,
        taskTitle: task.title,
        resource: resource._id,
        resourceName: resource.userName || resource.position,
        skillMatch: Math.round(skillMatrix[taskIndex][rIdx] * 100),
        estimatedHours: task.estimatedHours || 0,
      };
    });
  }

  // ──────────────────────────────────────────────
  // Validate all constraints on final solution
  // ──────────────────────────────────────────────
  _validateConstraints(assignment, tasks, resources) {
    // Báo cáo theo TUẦN NẶNG NHẤT, cùng đơn vị với capacity — trước đây cộng tổng
    // giờ rồi so với năng lực tuần nên gần như ai cũng bị báo "vượt".
    const loads = {};
    // Cùng điểm xuất phát với search: lệch nhau thì báo cáo ràng buộc sẽ nói
    // "thỏa mãn" trong khi search lại tính trên một mức tải khác.
    resources.forEach((r, i) => {
      const committed = (this._committedLoads && this._committedLoads[i]) || null;
      loads[i] = {
        weeks: new Map(committed ? committed.weeks : []),
        unscheduled: committed ? committed.unscheduled : 0,
      };
    });

    const satisfied = [];
    const violated = [];

    Object.entries(assignment).forEach(([tIdx, rIdx]) => {
      this._applyDemand(loads[rIdx], weeklyDemandOf(tasks[parseInt(tIdx)]), +1);
    });

    // Check capacity for each resource
    resources.forEach((r, i) => {
      const capacity = (r.maxCapacity || 40) * (r.fte || 1);
      const peak = Math.round(this._peakOf(loads[i]) * 10) / 10;
      const detail = `${peak}/${capacity}h mỗi tuần`;
      if (peak <= capacity) {
        satisfied.push({ type: 'capacity', subject: r.userName || r.position, detail });
      } else {
        violated.push({
          type: 'capacity',
          subject: r.userName || r.position,
          detail: `${detail} (vượt ${Math.round(peak - capacity)}h)`,
        });
      }
    });

    // H4: thứ tự theo ngày là dữ liệu đầu vào, thuật toán không sửa được nên chỉ báo lại
    const indexById = new Map(tasks.map((t, i) => [String(t._id), i]));
    tasks.forEach((task, i) => {
      (task.dependencies || []).forEach((dep) => {
        const j = indexById.get(dependencyTaskId(dep));
        if (j === undefined || j === i) return;

        const predecessor = tasks[j];
        const relation = dependencyType(dep);
        // Mốc phải xảy ra trước ← → mốc phải xảy ra sau, theo từng loại quan hệ.
        const earlier = relation.startsWith('finish') ? predecessor.endDate : predecessor.startDate;
        const later = relation.endsWith('start') ? task.startDate : task.endDate;
        if (!earlier || !later) return;

        const entry = {
          type: 'dependency',
          subject: `${predecessor.title} → ${task.title}`,
        };

        if (new Date(earlier) > new Date(later)) {
          const days = Math.ceil((new Date(earlier) - new Date(later)) / 86400000);
          violated.push({
            ...entry,
            detail: `quan hệ ${relation} bị vi phạm ${days} ngày`,
          });
        } else {
          satisfied.push({ ...entry, detail: 'đúng thứ tự trước/sau' });
        }
      });
    });

    return { satisfied: satisfied.length, violated: violated.length, details: { satisfied, violated } };
  }

  /**
   * Sổ tải theo tuần của phần việc nhân sự đã nhận ở nơi khác (ngoài lần chạy này).
   * Cùng cấu trúc với `loads` trong `solve()` để hai bên cộng trừ như nhau.
   */
  _committedLoadOf(resource) {
    const load = { weeks: new Map(), unscheduled: 0 };
    for (const task of (resource && resource.committedTasks) || []) {
      this._applyDemand(load, weeklyDemandOf(task), +1);
    }
    return load;
  }

  /**
   * Vì sao không xếp được — viết ra bằng lời cho người dùng đọc.
   *
   * "Không tìm thấy giải pháp" là một câu đúng nhưng vô dụng: người dùng không biết
   * nên tuyển thêm người, dời hạn, hay hạ yêu cầu kỹ năng. Hàm này chỉ ra ai đã kín
   * chỗ và mỗi công việc kẹt vì thiếu bao nhiêu giờ hoặc thiếu kỹ năng gì.
   */
  _explainFailure(tasks, resources) {
    const lines = [];
    const nameOf = (r, i) => r.userName || r.position || `Nhân sự ${i + 1}`;
    const round1 = (n) => Math.round(n * 10) / 10;
    const capOf = (r) => (r.maxCapacity || 40) * (r.fte || 1);

    // Ai đang bận sẵn vì việc ở nơi khác
    resources.forEach((r, i) => {
      const committed = this._committedLoads && this._committedLoads[i];
      if (!committed) return;
      const peak = this._peakOf(committed);
      if (peak <= 0) return;
      const capacity = capOf(r);
      const left = round1(capacity - peak);
      lines.push(
        `${nameOf(r, i)} đã nhận ${round1(peak)}h/${capacity}h mỗi tuần từ công việc ở dự án khác` +
        (left > 0 ? `, chỉ còn trống ${left}h.` : ', không còn giờ trống.')
      );
    });

    // Từng công việc vướng ở đâu
    tasks.forEach((task, t) => {
      const demand = weeklyDemandOf(task);
      const needed = round1(Math.max(demand.peakWeekHours, demand.unscheduledHours));
      const blockers = [];

      resources.forEach((r, i) => {
        const capacity = capOf(r);
        if (computeSkillMatch(task, r) < this.minSkillMatchThreshold) {
          blockers.push(`${nameOf(r, i)} không đạt yêu cầu kỹ năng`);
          return;
        }
        const committed = this._committedLoads && this._committedLoads[i];
        let shortfall = 0;
        for (const [week, hours] of demand.weeks) {
          const total = ((committed && committed.weeks.get(week)) || 0) + hours;
          if (total - capacity > shortfall) shortfall = total - capacity;
        }
        if (shortfall > 0) blockers.push(`${nameOf(r, i)} thiếu ${round1(shortfall)}h năng lực tuần`);
      });

      // Chỉ báo những việc mà KHÔNG ai nhận nổi — việc còn ứng viên thì không phải nút thắt.
      if (resources.length > 0 && blockers.length === resources.length) {
        lines.push(
          `Công việc "${task.title || `Task ${t + 1}`}" cần ${needed}h trong tuần cao điểm — ` +
          `không ai nhận được: ${blockers.join('; ')}.`
        );
      }
    });

    return lines;
  }

  _emptyResult(message) {
    return {
      success: false,
      feasible: false,
      message,
      assignments: [],
      constraintReport: { satisfied: 0, violated: 0, details: { satisfied: [], violated: [] } },
      fitness: 0,
      metrics: emptyMetrics(),
      iterations: 0,
      solveTime: 0,
    };
  }
}

module.exports = CSPSolver;
