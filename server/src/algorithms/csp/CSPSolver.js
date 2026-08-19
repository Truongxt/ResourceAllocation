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
 * Algorithm: Backtracking + AC-3 + MRV + LCV heuristics
 */

const {
  DEFAULT_WEIGHTS,
  computeSkillMatch,
  buildSkillMatrix,
  computeMaxCost,
  computeFitness,
  computeMetrics,
  emptyMetrics,
} = require('../scoring');

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

    // Build domains for each task (feasible resources)
    const domains = this._buildDomains(tasks, resources);

    // Check if any task has empty domain
    const emptyDomainTasks = [];
    for (let t = 0; t < tasks.length; t++) {
      if (domains[t].length === 0) {
        emptyDomainTasks.push(tasks[t].title || `Task ${t}`);
      }
    }

    if (emptyDomainTasks.length > 0) {
      return {
        ...this._emptyResult('Một số công việc không có nhân sự phù hợp'),
        infeasibleTasks: emptyDomainTasks,
        solveTime: Date.now() - startTime,
      };
    }

    // Apply AC-3 for domain reduction
    const reducedDomains = this._arcConsistency(tasks, domains, resources);

    // Check again after AC-3
    for (let t = 0; t < tasks.length; t++) {
      if (reducedDomains[t].length === 0) {
        emptyDomainTasks.push(tasks[t].title || `Task ${t}`);
      }
    }

    if (emptyDomainTasks.length > 0) {
      return {
        ...this._emptyResult('Ràng buộc quá chặt, không tìm thấy giải pháp'),
        infeasibleTasks: emptyDomainTasks,
        solveTime: Date.now() - startTime,
      };
    }

    // H4: cặp công việc phụ thuộc nhau và chồng lịch → không được cùng người
    this._conflicts = this._buildDependencyConflicts(tasks);

    // Backtracking search
    this._iterations = 0;
    this._startTime = startTime;
    const assignment = {};
    const workloads = {};
    resources.forEach((r, i) => { workloads[i] = 0; });

    const result = this._backtrack(assignment, tasks, reducedDomains, resources, workloads);

    const solveTime = Date.now() - startTime;

    if (!result) {
      return {
        ...this._emptyResult('Không tìm thấy giải pháp thỏa mãn tất cả ràng buộc'),
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
      domainSizes: reducedDomains.map((d, i) => ({
        task: tasks[i].title,
        originalSize: domains[i] ? domains[i].length : 0,
        reducedSize: d.length,
      })),
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

  _checkCapacityConstraint(resourceIdx, resources, workloads, taskHours) {
    const resource = resources[resourceIdx];
    const capacity = (resource.maxCapacity || 40) * (resource.fte || 1);
    return (workloads[resourceIdx] + taskHours) <= capacity;
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
        const j = indexById.get(String(dep?._id || dep));
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
  // AC-3: Arc Consistency
  // ──────────────────────────────────────────────
  _arcConsistency(tasks, domains, resources) {
    // Deep copy domains
    const reduced = domains.map((d) => [...d]);

    // For capacity constraints, we can prune resources that are clearly
    // unable to handle even the smallest tasks
    // This is a simplified AC-3 for the resource allocation domain
    let changed = true;
    let iterations = 0;

    while (changed && iterations < 100) {
      changed = false;
      iterations++;

      for (let t = 0; t < tasks.length; t++) {
        const taskHours = tasks[t].estimatedHours || 1;
        const newDomain = reduced[t].filter((rIdx) => {
          const capacity = (resources[rIdx].maxCapacity || 40) * (resources[rIdx].fte || 1);
          return taskHours <= capacity; // At minimum, resource can handle this single task
        });

        if (newDomain.length < reduced[t].length) {
          reduced[t] = newDomain;
          changed = true;
        }
      }
    }

    return reduced;
  }

  // ──────────────────────────────────────────────
  // Backtracking with MRV + LCV
  // ──────────────────────────────────────────────
  _backtrack(assignment, tasks, domains, resources, workloads) {
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
    const orderedValues = this._orderByLCV(varIdx, domains, resources, workloads, tasks);

    for (const rIdx of orderedValues) {
      const taskHours = tasks[varIdx].estimatedHours || 1;

      // Check capacity constraint
      if (!this._checkCapacityConstraint(rIdx, resources, workloads, taskHours)) {
        continue;
      }

      // H4: không giao hai việc phụ thuộc nhau, chồng lịch cho cùng một người
      if (!this._checkDependencyConstraint(varIdx, rIdx, assignment)) {
        continue;
      }

      // Assign
      assignment[varIdx] = rIdx;
      workloads[rIdx] += taskHours;

      // Recurse
      const result = this._backtrack(assignment, tasks, domains, resources, workloads);
      if (result) return result;

      // Undo
      delete assignment[varIdx];
      workloads[rIdx] -= taskHours;
    }

    return null;
  }

  // LCV: Order values by how many options they leave for other variables
  _orderByLCV(varIdx, domains, resources, workloads, tasks) {
    const taskHours = tasks[varIdx].estimatedHours || 1;

    return [...domains[varIdx]].sort((a, b) => {
      // Prefer resources with more remaining capacity (less constraining)
      const capA = (resources[a].maxCapacity || 40) * (resources[a].fte || 1) - workloads[a] - taskHours;
      const capB = (resources[b].maxCapacity || 40) * (resources[b].fte || 1) - workloads[b] - taskHours;
      return capB - capA; // Higher remaining capacity first
    });
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
    const workloads = {};
    resources.forEach((_, i) => { workloads[i] = 0; });

    const satisfied = [];
    const violated = [];

    Object.entries(assignment).forEach(([tIdx, rIdx]) => {
      const task = tasks[parseInt(tIdx)];
      workloads[rIdx] += task.estimatedHours || 1;
    });

    // Check capacity for each resource
    resources.forEach((r, i) => {
      const capacity = (r.maxCapacity || 40) * (r.fte || 1);
      if (workloads[i] <= capacity) {
        satisfied.push({ type: 'capacity', subject: r.userName || r.position, detail: `${workloads[i]}/${capacity}h` });
      } else {
        violated.push({ type: 'capacity', subject: r.userName || r.position, detail: `${workloads[i]}/${capacity}h (vượt ${Math.round(workloads[i] - capacity)}h)` });
      }
    });

    // H4: thứ tự theo ngày là dữ liệu đầu vào, thuật toán không sửa được nên chỉ báo lại
    const indexById = new Map(tasks.map((t, i) => [String(t._id), i]));
    tasks.forEach((task, i) => {
      (task.dependencies || []).forEach((dep) => {
        const j = indexById.get(String(dep?._id || dep));
        if (j === undefined || j === i) return;

        const predecessor = tasks[j];
        if (!predecessor.endDate || !task.startDate) return;

        const entry = {
          type: 'dependency',
          subject: `${predecessor.title} → ${task.title}`,
        };

        if (new Date(predecessor.endDate) > new Date(task.startDate)) {
          const days = Math.ceil(
            (new Date(predecessor.endDate) - new Date(task.startDate)) / 86400000
          );
          violated.push({
            ...entry,
            detail: `công việc sau bắt đầu sớm hơn ${days} ngày so với lúc công việc trước kết thúc`,
          });
        } else {
          satisfied.push({ ...entry, detail: 'đúng thứ tự trước/sau' });
        }
      });
    });

    return { satisfied: satisfied.length, violated: violated.length, details: { satisfied, violated } };
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
