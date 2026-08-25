const {
  buildSkillMatrix,
  computeMaxCost,
  computeFitness,
  computeMetrics,
} = require('../scoring');

/**
 * Thuật toán phân bổ Tham lam (Greedy Baseline Algorithm)
 * 
 * Nguyên lý:
 *   1. Sắp xếp danh sách công việc theo độ ưu tiên / số giờ ước tính giảm dần.
 *   2. Với mỗi công việc, đánh giá tất cả nhân sự khả dụng và chọn nhân sự có điểm kết hợp:
 *      Score = (SkillMatch * 0.6) + ((1 - CurrentWorkload / MaxCapacity) * 0.4) cao nhất.
 *   3. Gán công việc và cập nhật tải của nhân sự đó.
 *   4. Chấm điểm toàn diện bằng scoring.js để có cùng thang đo với GA và CSP.
 */
class GreedyAllocator {
  constructor(options = {}) {
    this.weights = options.weights || {
      workloadBalance: 0.30,
      skillMatch: 0.35,
      cost: 0.15,
      overallocation: 0.20,
    };
  }

  optimize(tasks, resources) {
    const startTime = process.hrtime.bigint();

    if (!tasks || !tasks.length || !resources || !resources.length) {
      return {
        fitness: 0,
        assignments: [],
        metrics: null,
        executionTime: 0,
      };
    }

    const numTasks = tasks.length;
    const numResources = resources.length;
    const skillMatrix = buildSkillMatrix(tasks, resources);
    const maxCost = computeMaxCost(tasks, resources);

    // Track dynamic workload during greedy assignment
    const currentWorkloads = new Array(numResources).fill(0);
    const solution = new Array(numTasks).fill(0);

    // Index tasks and sort by estimated hours descending (hardest tasks first)
    const sortedTaskIndices = Array.from({ length: numTasks }, (_, i) => i)
      .sort((a, b) => (tasks[b].estimatedHours || 1) - (tasks[a].estimatedHours || 1));

    for (const tIndex of sortedTaskIndices) {
      const task = tasks[tIndex];
      const effort = task.estimatedHours || 1;

      let bestResourceIndex = 0;
      let bestScore = -Infinity;

      for (let rIndex = 0; rIndex < numResources; rIndex++) {
        const resource = resources[rIndex];
        const capacity = (resource.maxCapacity || 40) * (resource.fte || 1);
        const skillMatch = skillMatrix[tIndex][rIndex];

        // Capacity utilization factor: prefer resources with available headroom
        const loadRatio = currentWorkloads[rIndex] / (capacity || 1);
        const headroomScore = Math.max(0, 1 - loadRatio);

        // Greedy composite score: prioritize high skill match and balanced workload
        const score = skillMatch * 0.6 + headroomScore * 0.4;

        if (score > bestScore) {
          bestScore = score;
          bestResourceIndex = rIndex;
        }
      }

      solution[tIndex] = bestResourceIndex;
      currentWorkloads[bestResourceIndex] += effort;
    }

    const endTime = process.hrtime.bigint();
    const executionTime = Number((endTime - startTime) / 1_000_000n); // ms

    // Evaluate solution with unified scoring system
    const fitness = computeFitness(
      solution,
      tasks,
      resources,
      skillMatrix,
      maxCost,
      this.weights
    );

    const detailedMetrics = computeMetrics(
      solution,
      tasks,
      resources,
      skillMatrix,
      maxCost
    );

    const assignments = tasks.map((task, tIdx) => {
      const rIdx = solution[tIdx];
      const res = resources[rIdx];
      return {
        taskId: task._id || `task-${tIdx}`,
        taskTitle: task.title,
        resourceId: res._id || `res-${rIdx}`,
        resourceName: res.userName || res.name || `Nhân sự ${rIdx + 1}`,
        skillMatch: skillMatrix[tIdx][rIdx],
      };
    });

    return {
      algorithm: 'greedy',
      fitness,
      bestFitness: fitness,
      solution,
      assignments,
      metrics: detailedMetrics,
      executionTime,
    };
  }
}

module.exports = GreedyAllocator;
