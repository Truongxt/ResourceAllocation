const mongoose = require('mongoose');
const Task = require('../models/Task');
const Resource = require('../models/Resource');
const OptimizationResult = require('../models/OptimizationResult');
const GeneticAlgorithm = require('../algorithms/genetic/GeneticAlgorithm');
const CSPSolver = require('../algorithms/csp/CSPSolver');
const { sendNotification } = require('../services/socket.service');
const { logActivity } = require('../services/activityLog.service');

/**
 * Helper: Load tasks & resources for optimization
 */
const loadOptimizationData = async (projectId) => {
  const taskFilter = { status: { $in: ['todo', 'in_progress', 'review'] } };
  if (projectId) taskFilter.project = projectId;

  const [tasks, resources] = await Promise.all([
    Task.find(taskFilter).select('title estimatedHours requiredSkills startDate endDate project status dependencies'),
    Resource.find({ isActive: true })
      .populate('user', 'name email')
      .select('user position department skills maxCapacity fte hourlyRate availability unavailablePeriods currentWorkload'),
  ]);

  // Flatten resource data for algorithm
  const flatResources = resources.map((r) => ({
    _id: r._id,
    userId: r.user?._id,
    userName: r.user?.name || r.position,
    position: r.position,
    department: r.department,
    skills: r.skills || [],
    maxCapacity: r.maxCapacity || 40,
    fte: r.fte || 1,
    hourlyRate: r.hourlyRate || 0,
    availability: r.availability || 'available',
    unavailablePeriods: r.unavailablePeriods || [],
    currentWorkload: r.currentWorkload || 0,
  }));

  return { tasks, resources: flatResources };
};

/**
 * @desc    Chạy Genetic Algorithm optimization
 * @route   POST /api/optimization/run/genetic
 * @access  Private
 */
const runGeneticAlgorithm = async (req, res, next) => {
  try {
    const {
      projectId,
      populationSize,
      maxGenerations,
      crossoverRate,
      mutationRate,
      workloadWeight,
      skillWeight,
      costWeight,
      overallocationWeight,
    } = req.body;

    const { tasks, resources } = await loadOptimizationData(projectId);

    if (!tasks.length) {
      return res.status(400).json({ success: false, message: 'Không có công việc cần tối ưu hóa (tasks phải ở trạng thái todo/in_progress/review)' });
    }
    if (!resources.length) {
      return res.status(400).json({ success: false, message: 'Không có nhân sự nào trong hệ thống' });
    }

    // Create result record
    const resultRecord = await OptimizationResult.create({
      algorithm: 'genetic',
      status: 'running',
      parameters: {
        populationSize: populationSize || 100,
        maxGenerations: maxGenerations || 500,
        crossoverRate: crossoverRate || 0.8,
        mutationRate: mutationRate || 0.1,
        weights: {
          workloadBalance: workloadWeight ?? 0.30,
          skillMatch: skillWeight ?? 0.35,
          cost: costWeight ?? 0.15,
          overallocation: overallocationWeight ?? 0.20,
        },
      },
      projectFilter: projectId || undefined,
      taskCount: tasks.length,
      resourceCount: resources.length,
      runBy: req.user._id,
    });

    // Run GA
    const ga = new GeneticAlgorithm({
      populationSize, maxGenerations, crossoverRate, mutationRate,
      workloadWeight, skillWeight, costWeight, overallocationWeight,
    });

    const result = await ga.optimize(tasks, resources);

    // Update record
    resultRecord.status = result.success ? 'completed' : 'failed';
    resultRecord.fitness = result.fitness || 0;
    resultRecord.assignments = result.assignments || [];
    resultRecord.metrics = result.metrics || {};
    resultRecord.convergenceHistory = result.convergenceHistory || [];
    resultRecord.executionTime = result.executionTime || 0;
    resultRecord.generations = result.generations || 0;
    resultRecord.errorMessage = result.message || undefined;
    await resultRecord.save();

    res.json({
      success: true,
      data: {
        result: resultRecord,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Chạy CSP Solver
 * @route   POST /api/optimization/run/csp
 * @access  Private
 */
const runCSPSolver = async (req, res, next) => {
  try {
    const { projectId, maxIterations, timeout, minSkillMatchThreshold } = req.body;

    const { tasks, resources } = await loadOptimizationData(projectId);

    if (!tasks.length) {
      return res.status(400).json({ success: false, message: 'Không có công việc cần tối ưu hóa' });
    }
    if (!resources.length) {
      return res.status(400).json({ success: false, message: 'Không có nhân sự nào' });
    }

    const resultRecord = await OptimizationResult.create({
      algorithm: 'csp',
      status: 'running',
      taskCount: tasks.length,
      resourceCount: resources.length,
      runBy: req.user._id,
      projectFilter: projectId || undefined,
    });

    const solver = new CSPSolver({ maxIterations, timeout, minSkillMatchThreshold });
    const result = await solver.solve(tasks, resources);

    resultRecord.status = result.success ? 'completed' : 'failed';
    resultRecord.assignments = result.assignments || [];
    resultRecord.constraintReport = result.constraintReport || undefined;
    // Chấm điểm bằng cùng thang đo với GA để hai thuật toán so sánh được trong lịch sử
    resultRecord.fitness = result.fitness || 0;
    resultRecord.metrics = result.metrics || {};
    resultRecord.executionTime = result.solveTime || 0;
    resultRecord.iterations = result.iterations || 0;
    resultRecord.errorMessage = result.message || undefined;
    await resultRecord.save();

    res.json({
      success: true,
      data: { result: resultRecord },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Chạy Hybrid (CSP → GA)
 * @route   POST /api/optimization/run/hybrid
 * @access  Private
 */
const runHybrid = async (req, res, next) => {
  try {
    const { projectId, ...gaParams } = req.body;
    const { tasks, resources } = await loadOptimizationData(projectId);

    if (!tasks.length || !resources.length) {
      return res.status(400).json({ success: false, message: 'Không đủ dữ liệu' });
    }

    const resultRecord = await OptimizationResult.create({
      algorithm: 'hybrid',
      status: 'running',
      taskCount: tasks.length,
      resourceCount: resources.length,
      runBy: req.user._id,
      projectFilter: projectId || undefined,
    });

    const startTime = Date.now();

    // Pha 1: CSP lọc miền giá trị (H2 skill, H3 availability, capacity) và kiểm tra
    // tính khả thi. `buildFeasibleDomains` chạy độc lập với backtracking nên miền
    // vẫn dùng được ngay cả khi CSP không tìm ra lời giải đầy đủ.
    const csp = new CSPSolver();
    const cspResult = await csp.solve(tasks, resources);
    const domains = csp.buildFeasibleDomains(tasks, resources);

    // Pha 2: GA tối ưu hóa TRÊN MIỀN ĐÃ THU HẸP — đây là chỗ khiến Hybrid khác với
    // việc chạy hai thuật toán rời rạc.
    const ga = new GeneticAlgorithm(gaParams);
    const gaResult = await ga.optimize(tasks, resources, { domains });

    const totalTime = Date.now() - startTime;

    resultRecord.status = gaResult.success ? 'completed' : 'failed';
    resultRecord.fitness = gaResult.fitness || 0;
    resultRecord.assignments = gaResult.assignments || [];
    resultRecord.metrics = gaResult.metrics || {};
    resultRecord.convergenceHistory = gaResult.convergenceHistory || [];
    resultRecord.executionTime = totalTime;
    resultRecord.generations = gaResult.generations || 0;
    resultRecord.constraintReport = cspResult.constraintReport || undefined;
    resultRecord.domainReduction = gaResult.domainReduction || undefined;
    resultRecord.errorMessage = gaResult.message || undefined;
    await resultRecord.save();

    res.json({
      success: true,
      data: {
        result: resultRecord,
        cspFeasible: cspResult.feasible,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy lịch sử optimization
 * @route   GET /api/optimization/history
 * @access  Private
 */
const getHistory = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.algorithm) filter.algorithm = req.query.algorithm;
    if (req.query.status) filter.status = req.query.status;

    const results = await OptimizationResult.find(filter)
      .populate('runBy', 'name email')
      .populate('projectFilter', 'name code')
      .sort('-createdAt')
      .limit(50)
      .select('-assignments -convergenceHistory -metrics.resourceUtilization');

    res.json({
      success: true,
      count: results.length,
      data: { results },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Các chỉ số đặt cạnh nhau khi so sánh nhiều phương án.
 *
 * `higherIsBetter: null` nghĩa là chỉ số chỉ để tham khảo, không có bên thắng — tỉ lệ
 * sử dụng nhân sự 40% là để phí người, 100% là vắt kiệt, không con số nào "tốt hơn"
 * con số kia nếu chỉ nhìn một mình nó.
 *
 * `workloadVariance` giữ nguyên tên field vì dữ liệu cũ đã lưu như vậy, nhưng giá trị
 * thực tế là ĐỘ LỆCH CHUẨN (scoring.js lấy căn bậc hai của phương sai), nên nhãn ở đây
 * ghi đúng bản chất thay vì dịch sát tên field.
 */
const COMPARISON_METRICS = [
  { key: 'fitness', label: 'Điểm fitness', unit: '', digits: 4, higherIsBetter: true, pick: (r) => r.fitness },
  { key: 'assignedCount', label: 'Công việc được phân công', unit: '', digits: 0, higherIsBetter: true, pick: (r) => (r.assignments || []).length },
  { key: 'averageSkillMatch', label: 'Độ khớp kỹ năng trung bình', unit: '%', digits: 0, higherIsBetter: true, pick: (r) => r.metrics?.averageSkillMatch },
  { key: 'workloadVariance', label: 'Độ lệch chuẩn khối lượng', unit: 'giờ', digits: 2, higherIsBetter: false, pick: (r) => r.metrics?.workloadVariance },
  { key: 'overallocatedResources', label: 'Nhân sự quá tải', unit: 'người', digits: 0, higherIsBetter: false, pick: (r) => r.metrics?.overallocatedResources },
  { key: 'totalCost', label: 'Tổng chi phí ước tính', unit: '', digits: 0, higherIsBetter: false, pick: (r) => r.metrics?.totalCost },
  { key: 'averageUtilization', label: 'Tỉ lệ sử dụng trung bình', unit: '%', digits: 0, higherIsBetter: null, pick: (r) => r.metrics?.averageUtilization },
  { key: 'violatedConstraints', label: 'Ràng buộc bị vi phạm', unit: '', digits: 0, higherIsBetter: false, pick: (r) => r.constraintReport?.violated },
  { key: 'executionTime', label: 'Thời gian chạy', unit: 'ms', digits: 0, higherIsBetter: false, pick: (r) => r.executionTime },
];

/**
 * Chọn phương án tốt nhất cho một chỉ số.
 * Trả về null khi không có bên thắng rõ ràng: chỉ số vô hướng (higherIsBetter null),
 * dưới hai phương án có số liệu, hoặc nhiều phương án cùng đạt giá trị tốt nhất.
 * Thà không tô đậm ai còn hơn trao giải cho phương án đứng trước trong danh sách.
 */
const bestIndexOf = (values, higherIsBetter) => {
  if (higherIsBetter === null) return null;

  const present = values
    .map((value, index) => ({ value, index }))
    .filter((entry) => typeof entry.value === 'number' && Number.isFinite(entry.value));
  if (present.length < 2) return null;

  const bestValue = present.reduce(
    (best, entry) => (higherIsBetter ? Math.max(best, entry.value) : Math.min(best, entry.value)),
    present[0].value
  );

  const winners = present.filter((entry) => entry.value === bestValue);
  return winners.length === 1 ? winners[0].index : null;
};

/**
 * Ghép phân công của các phương án theo từng công việc.
 * Một công việc chỉ được tính là "đồng thuận" khi MỌI phương án đều phân công nó và
 * đều chọn cùng một nhân sự; công việc mà có phương án bỏ trống thì không so được,
 * nên bị loại khỏi mẫu số của tỉ lệ đồng thuận thay vì bị tính là bất đồng.
 */
const buildAssignmentDiff = (results) => {
  const rows = new Map();

  results.forEach((result, index) => {
    (result.assignments || []).forEach((assignment) => {
      if (!assignment.task) return;
      const key = String(assignment.task);

      if (!rows.has(key)) {
        rows.set(key, {
          task: key,
          taskTitle: assignment.taskTitle || 'Công việc đã bị xóa',
          cells: results.map(() => null),
        });
      }

      rows.get(key).cells[index] = {
        resource: assignment.resource ? String(assignment.resource) : null,
        resourceName: assignment.resourceName || null,
        skillMatch: typeof assignment.skillMatch === 'number' ? assignment.skillMatch : null,
      };
    });
  });

  let comparable = 0;
  let agreed = 0;

  const list = [...rows.values()].map((row) => {
    const covered = row.cells.every((cell) => cell && cell.resource);
    const sameResource = covered && row.cells.every((cell) => cell.resource === row.cells[0].resource);

    if (covered) {
      comparable++;
      if (sameResource) agreed++;
    }

    return { ...row, comparable: covered, agreed: sameResource };
  });

  // Chỗ các phương án khác nhau mới là chỗ đáng đọc, nên đẩy lên đầu.
  list.sort(
    (a, b) => Number(a.agreed) - Number(b.agreed) || a.taskTitle.localeCompare(b.taskTitle, 'vi')
  );

  return {
    total: list.length,
    comparable,
    agreed,
    agreementRate: comparable ? Math.round((agreed / comparable) * 100) : null,
    rows: list,
  };
};

/**
 * Cảnh báo khi các phương án không thực sự đặt cạnh nhau được.
 * So một lần chạy trên 20 công việc với một lần chạy trên 8 công việc rồi kết luận
 * thuật toán nào hơn là kết luận sai; người đọc cần biết điều đó trước khi nhìn số.
 */
const comparisonWarnings = (results) => {
  const warnings = [];

  const scopes = new Set(
    results.map((r) => String(r.projectFilter?._id || r.projectFilter || 'Toàn hệ thống'))
  );
  if (scopes.size > 1) {
    warnings.push(
      'Các phương án chạy trên phạm vi dự án khác nhau — chỉ số của chúng không so trực tiếp được.'
    );
  }

  const taskCounts = [...new Set(results.map((r) => r.taskCount))];
  if (taskCounts.length > 1) {
    warnings.push(
      `Số công việc đầu vào khác nhau (${taskCounts.join(' / ')}). Các chỉ số cộng dồn như tổng chi phí sẽ lệch theo quy mô chứ không theo chất lượng lời giải.`
    );
  }

  const unfinished = results.filter((r) => r.status !== 'completed');
  if (unfinished.length) {
    warnings.push(
      `${unfinished.length} phương án không ở trạng thái "completed", số liệu có thể thiếu.`
    );
  }

  return warnings;
};

/**
 * @desc    So sánh song song 2-4 phương án tối ưu hóa
 * @route   GET /api/optimization/compare?ids=id1,id2,id3
 * @access  Private
 */
const compareResults = async (req, res, next) => {
  try {
    const ids = [
      ...new Set(
        String(req.query.ids || '')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      ),
    ];

    if (ids.length < 2) {
      return res.status(400).json({ success: false, message: 'Cần ít nhất 2 phương án khác nhau để so sánh' });
    }
    if (ids.length > 4) {
      return res.status(400).json({ success: false, message: 'Chỉ so sánh được tối đa 4 phương án cùng lúc' });
    }
    if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ success: false, message: 'ID kết quả không hợp lệ' });
    }

    const found = await OptimizationResult.find({ _id: { $in: ids } })
      .populate('runBy', 'name email')
      .populate('projectFilter', 'name code')
      .lean();

    if (found.length !== ids.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy một hoặc nhiều phương án cần so sánh' });
    }

    // Giữ đúng thứ tự người dùng chọn — Mongo trả về theo thứ tự lưu trữ, và các cột
    // trong bảng so sánh phải khớp với thứ tự đó thì người đọc mới lần được.
    const byId = new Map(found.map((r) => [String(r._id), r]));
    const results = ids.map((id) => byId.get(id));

    const summaries = results.map((r) => ({
      _id: r._id,
      algorithm: r.algorithm,
      status: r.status,
      createdAt: r.createdAt,
      fitness: r.fitness,
      taskCount: r.taskCount,
      resourceCount: r.resourceCount,
      assignedCount: (r.assignments || []).length,
      executionTime: r.executionTime,
      generations: r.generations,
      iterations: r.iterations,
      isApplied: r.isApplied,
      projectFilter: r.projectFilter || null,
      runBy: r.runBy || null,
      // Bỏ resourceUtilization và constraintReport.details: bảng so sánh không dùng tới,
      // mà 4 phương án kèm đủ hai mảng đó là một payload rất nặng.
      metrics: {
        workloadVariance: r.metrics?.workloadVariance ?? null,
        averageSkillMatch: r.metrics?.averageSkillMatch ?? null,
        totalCost: r.metrics?.totalCost ?? null,
        overallocatedResources: r.metrics?.overallocatedResources ?? null,
        averageUtilization: r.metrics?.averageUtilization ?? null,
      },
      // GA không kiểm tra ràng buộc, nhưng Mongoose vẫn dựng sẵn nested path rỗng cho
      // nó. Chỉ coi là có báo cáo khi thực sự có con số, để cột GA hiển thị "—" thay
      // vì "0 vi phạm" — hai điều đó khác hẳn nhau.
      constraintReport:
        typeof r.constraintReport?.violated === 'number'
          ? {
              satisfied: r.constraintReport.satisfied ?? null,
              violated: r.constraintReport.violated,
            }
          : null,
      domainReduction:
        r.domainReduction && typeof r.domainReduction.totalPairs === 'number' ? r.domainReduction : null,
    }));

    const metrics = COMPARISON_METRICS.map(({ pick, ...meta }) => {
      const values = results.map((r) => {
        const value = pick(r);
        return typeof value === 'number' && Number.isFinite(value) ? value : null;
      });

      return { ...meta, values, bestIndex: bestIndexOf(values, meta.higherIsBetter) };
    });

    res.json({
      success: true,
      data: {
        comparison: {
          results: summaries,
          metrics,
          assignments: buildAssignmentDiff(results),
          warnings: comparisonWarnings(results),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy chi tiết kết quả optimization
 * @route   GET /api/optimization/:id
 * @access  Private
 */
const getResultById = async (req, res, next) => {
  try {
    const result = await OptimizationResult.findById(req.params.id)
      .populate('runBy', 'name email')
      .populate('projectFilter', 'name code');

    if (!result) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kết quả' });
    }

    res.json({
      success: true,
      data: { result },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Áp dụng kết quả tối ưu hóa (assign tasks)
 * @route   POST /api/optimization/:id/apply
 * @access  Private (Admin, PM)
 */
const applyResult = async (req, res, next) => {
  try {
    const result = await OptimizationResult.findById(req.params.id);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kết quả' });
    }

    if (result.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể áp dụng kết quả đã hoàn thành' });
    }

    if (result.isApplied) {
      return res.status(400).json({ success: false, message: 'Kết quả này đã được áp dụng trước đó' });
    }

    // Apply assignments: Update task assignees
    let appliedCount = 0;
    for (const assignment of result.assignments) {
      if (assignment.task && assignment.resource) {
        // Find the resource to get its user ID
        const resource = await Resource.findById(assignment.resource);
        if (resource) {
          await Task.findByIdAndUpdate(assignment.task, {
            assignee: resource.user,
          });
          appliedCount++;
        }
      }
    }

    result.isApplied = true;
    result.appliedAt = new Date();
    result.appliedBy = req.user._id;
    await result.save();

    // Gửi thông báo realtime đến tất cả user trong hệ thống
    sendNotification({
      recipient: null,
      actor: req.user._id,
      type: 'optimization_applied',
      title: 'Đã áp dụng phân bổ nhân sự',
      message: `Phương án tối ưu hóa (${result.algorithm.toUpperCase()}) đã được áp dụng cho ${appliedCount} công việc.`,
      entityType: 'optimization',
      entityId: result._id,
      link: '/tasks',
    });

    logActivity({
      req,
      action: 'APPLY_OPTIMIZATION',
      entityType: 'optimization',
      entityId: result._id,
      entityTitle: `${result.algorithm.toUpperCase()} Optimization`,
      description: `Áp dụng phương án phân bổ ${result.algorithm.toUpperCase()} cho ${appliedCount} công việc`,
      details: { algorithm: result.algorithm, fitness: result.fitness, appliedCount },
    });

    res.json({
      success: true,
      data: { result, appliedCount },
      message: `Đã áp dụng kết quả tối ưu hóa thành công cho ${appliedCount} công việc`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  runGeneticAlgorithm,
  runCSPSolver,
  runHybrid,
  getHistory,
  compareResults,
  getResultById,
  applyResult,
};
