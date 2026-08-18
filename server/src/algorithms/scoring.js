/**
 * Hàm chấm điểm dùng chung cho mọi thuật toán phân bổ.
 *
 * Trước đây công thức skill match bị viết lặp ở GeneticAlgorithm và CSPSolver, còn
 * fitness/metrics chỉ GA mới tính — nên kết quả CSP luôn hiển thị fitness 0 và không
 * so sánh được với GA. Gom về một chỗ để hai thuật toán dùng chung một thang đo.
 *
 * Quy ước chung:
 *   - "solution" là mảng chỉ số resource theo từng task: solution[taskIndex] = resourceIndex
 *     (chính là chromosome của GA; lời giải CSP được chuyển về cùng dạng này).
 *   - Task không có estimatedHours được tính là 1 giờ để không bị bỏ qua khi cân tải.
 */

const DEFAULT_WEIGHTS = {
  workloadBalance: 0.30,
  skillMatch: 0.35,
  cost: 0.15,
  overallocation: 0.20,
};

/** Capacity thực tế của một nhân sự trong tuần (giờ). */
const capacityOf = (resource) => (resource.maxCapacity || 40) * (resource.fte || 1);

/** Số giờ quy ước của một task. */
const effortOf = (task) => task.estimatedHours || 1;

/**
 * Độ khớp kỹ năng giữa task và resource, thang 0..1.
 *
 *   Σ (weight × min(resource_level, required_level)) / Σ (weight × required_level)
 *
 * Task không yêu cầu kỹ năng nào → 1 (khớp hoàn hảo).
 * Tên kỹ năng so khớp không phân biệt hoa thường.
 */
function computeSkillMatch(task, resource) {
  const required = task.requiredSkills || [];
  if (!required.length) return 1;

  let totalWeight = 0;
  let totalMatch = 0;

  for (const req of required) {
    const weight = req.weight ?? 1;
    totalWeight += weight * req.level;

    const resSkill = (resource.skills || []).find(
      (s) => s.name.toLowerCase() === req.name.toLowerCase()
    );
    const resLevel = resSkill ? resSkill.level : 0;
    totalMatch += weight * Math.min(resLevel, req.level);
  }

  return totalWeight > 0 ? totalMatch / totalWeight : 0;
}

/** Ma trận điểm khớp kỹ năng: matrix[taskIndex][resourceIndex] = 0..1 */
function buildSkillMatrix(tasks, resources) {
  return tasks.map((task) => resources.map((resource) => computeSkillMatch(task, resource)));
}

/** Chi phí tối đa dùng để chuẩn hóa mục tiêu chi phí về 0..1 */
function computeMaxCost(tasks, resources) {
  const maxRate = resources.reduce((max, r) => Math.max(max, r.hourlyRate || 1), 1);
  const totalHours = tasks.reduce((sum, t) => sum + effortOf(t), 0);
  return maxRate * totalHours;
}

/** Tổng số giờ được gán cho từng resource. */
function computeWorkloads(solution, tasks, numResources) {
  const workloads = new Array(numResources).fill(0);
  for (let t = 0; t < solution.length; t++) {
    const r = solution[t];
    if (r === undefined || r === null) continue;
    workloads[r] += effortOf(tasks[t]);
  }
  return workloads;
}

/**
 * Fitness tổng hợp 4 mục tiêu, thang 0..1:
 *   F = w₁·f_workload + w₂·f_skill + w₃·f_cost + w₄·f_overalloc
 */
function computeFitness(solution, tasks, resources, skillMatrix, maxCost, weights = DEFAULT_WEIGHTS) {
  const numResources = resources.length;
  const workloads = computeWorkloads(solution, tasks, numResources);

  // 1. Cân bằng tải: 1 - độ lệch chuẩn đã chuẩn hóa
  const avgWorkload = workloads.reduce((s, w) => s + w, 0) / numResources;
  const variance = workloads.reduce((s, w) => s + (w - avgWorkload) ** 2, 0) / numResources;
  const stdDev = Math.sqrt(variance);
  const maxWorkload = Math.max(...workloads, 1);
  const fWorkload = Math.max(0, 1 - stdDev / maxWorkload);

  // 2. Độ khớp kỹ năng trung bình
  let totalSkillMatch = 0;
  for (let t = 0; t < solution.length; t++) {
    totalSkillMatch += skillMatrix[t][solution[t]];
  }
  const fSkill = totalSkillMatch / solution.length;

  // 3. Chi phí đã chuẩn hóa
  let totalCost = 0;
  for (let t = 0; t < solution.length; t++) {
    totalCost += (resources[solution[t]].hourlyRate || 0) * effortOf(tasks[t]);
  }
  const fCost = maxCost > 0 ? Math.max(0, 1 - totalCost / maxCost) : 1;

  // 4. Phạt quá tải
  let overallocated = 0;
  for (let r = 0; r < numResources; r++) {
    if (workloads[r] > capacityOf(resources[r])) overallocated++;
  }
  const fOveralloc = 1 - overallocated / numResources;

  const fitness =
    weights.workloadBalance * fWorkload +
    weights.skillMatch * fSkill +
    weights.cost * fCost +
    weights.overallocation * fOveralloc;

  return Math.max(0, Math.min(1, fitness));
}

/**
 * Bộ chỉ số báo cáo cho một lời giải.
 * Lưu ý thang đo: skill match trả về theo phần trăm (0-100), fitness giữ thang 0-1.
 */
function computeMetrics(solution, tasks, resources, skillMatrix) {
  const numResources = resources.length;
  const workloads = computeWorkloads(solution, tasks, numResources);

  const avgWorkload = workloads.reduce((s, w) => s + w, 0) / numResources;
  const variance = workloads.reduce((s, w) => s + (w - avgWorkload) ** 2, 0) / numResources;

  let totalSkillMatch = 0;
  let totalCost = 0;
  for (let t = 0; t < solution.length; t++) {
    totalSkillMatch += skillMatrix[t][solution[t]];
    totalCost += (resources[solution[t]].hourlyRate || 0) * effortOf(tasks[t]);
  }

  let overallocated = 0;
  const resourceUtilization = resources.map((r, i) => {
    const capacity = capacityOf(r);
    const util = capacity > 0 ? Math.round((workloads[i] / capacity) * 100) : 0;
    if (workloads[i] > capacity) overallocated++;
    return {
      resource: r._id,
      name: r.userName || r.position,
      workload: Math.round(workloads[i] * 10) / 10,
      capacity,
      utilization: util,
      isOverloaded: workloads[i] > capacity,
    };
  });

  return {
    workloadVariance: Math.round(Math.sqrt(variance) * 100) / 100,
    averageSkillMatch: Math.round((totalSkillMatch / solution.length) * 100),
    totalCost: Math.round(totalCost),
    overallocatedResources: overallocated,
    averageUtilization: Math.round(
      resourceUtilization.reduce((s, r) => s + r.utilization, 0) / numResources
    ),
    resourceUtilization,
  };
}

/** Bộ metrics rỗng, dùng khi thuật toán không tìm được lời giải. */
function emptyMetrics() {
  return {
    workloadVariance: 0,
    averageSkillMatch: 0,
    totalCost: 0,
    overallocatedResources: 0,
    averageUtilization: 0,
    resourceUtilization: [],
  };
}

module.exports = {
  DEFAULT_WEIGHTS,
  capacityOf,
  effortOf,
  computeSkillMatch,
  buildSkillMatrix,
  computeMaxCost,
  computeWorkloads,
  computeFitness,
  computeMetrics,
  emptyMetrics,
};
