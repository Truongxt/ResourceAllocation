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
    Task.find(taskFilter).select('title estimatedHours requiredSkills startDate endDate project status'),
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
    resultRecord.constraintReport = result.constraintReport
      ? { satisfied: result.constraintReport.satisfied, violated: result.constraintReport.violated }
      : undefined;
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

    // Phase 1: CSP to validate feasibility
    const csp = new CSPSolver();
    const cspResult = await csp.solve(tasks, resources);

    // Phase 2: GA optimization (runs regardless, but CSP validates constraints)
    const ga = new GeneticAlgorithm(gaParams);
    const gaResult = await ga.optimize(tasks, resources);

    const totalTime = Date.now() - startTime;

    resultRecord.status = gaResult.success ? 'completed' : 'failed';
    resultRecord.fitness = gaResult.fitness || 0;
    resultRecord.assignments = gaResult.assignments || [];
    resultRecord.metrics = gaResult.metrics || {};
    resultRecord.convergenceHistory = gaResult.convergenceHistory || [];
    resultRecord.executionTime = totalTime;
    resultRecord.generations = gaResult.generations || 0;
    resultRecord.constraintReport = cspResult.constraintReport
      ? { satisfied: cspResult.constraintReport.satisfied, violated: cspResult.constraintReport.violated }
      : undefined;
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
  getResultById,
  applyResult,
};
