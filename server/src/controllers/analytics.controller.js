const Project = require('../models/Project');
const Task = require('../models/Task');
const Resource = require('../models/Resource');
const OptimizationResult = require('../models/OptimizationResult');
const mongoose = require('mongoose');
const { buildWorkloadTrend } = require('../analytics/workloadTrend');
const { getUserAnalyticsScope } = require('../services/analyticsScope.service');

/**
 * @desc    Dashboard overview — tổng hợp real data
 * @route   GET /api/analytics/dashboard
 * @access  Private
 */
const getDashboardOverview = async (req, res, next) => {
  try {
    const {
      projectMatch,
      taskMatch,
      resourceMatch,
      recentOptimizationFilter,
    } = await getUserAnalyticsScope(req.user);

    const [
      projectStats,
      taskStats,
      resourceStats,
      recentOptimizations,
      recentTasks,
    ] = await Promise.all([
      // Projects
      Project.aggregate([
        { $match: projectMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            planning: { $sum: { $cond: [{ $eq: ['$status', 'planning'] }, 1, 0] } },
            avgProgress: { $avg: '$progress' },
            totalBudget: { $sum: '$budget' },
          },
        },
      ]),

      // Tasks
      Task.aggregate([
        { $match: taskMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
            review: { $sum: { $cond: [{ $eq: ['$status', 'review'] }, 1, 0] } },
            done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
            blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
            totalEstimatedHours: { $sum: '$estimatedHours' },
            totalActualHours: { $sum: '$actualHours' },
          },
        },
      ]),

      // Resources
      Resource.aggregate([
        { $match: resourceMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            available: { $sum: { $cond: [{ $eq: ['$availability', 'available'] }, 1, 0] } },
            partial: { $sum: { $cond: [{ $eq: ['$availability', 'partially_available'] }, 1, 0] } },
            unavailable: { $sum: { $cond: [{ $eq: ['$availability', 'unavailable'] }, 1, 0] } },
            totalCapacity: { $sum: { $multiply: ['$maxCapacity', '$fte'] } },
            totalWorkload: { $sum: '$currentWorkload' },
            avgFte: { $avg: '$fte' },
          },
        },
      ]),

      // Recent optimizations (scoped)
      OptimizationResult.find(recentOptimizationFilter)
        .sort('-createdAt')
        .limit(5)
        .select('algorithm fitness executionTime taskCount resourceCount createdAt isApplied'),

      // Recent tasks activity
      Task.find(taskMatch)
        .sort('-updatedAt')
        .limit(8)
        .populate('project', 'name code')
        .populate('assignee', 'name')
        .select('title status priority updatedAt project assignee'),
    ]);

    const ps = projectStats[0] || { total: 0, active: 0, completed: 0, planning: 0, avgProgress: 0, totalBudget: 0 };
    const ts = taskStats[0] || { total: 0, todo: 0, inProgress: 0, review: 0, done: 0, blocked: 0, totalEstimatedHours: 0, totalActualHours: 0 };
    const rs = resourceStats[0] || { total: 0, available: 0, partial: 0, unavailable: 0, totalCapacity: 0, totalWorkload: 0, avgFte: 0 };

    const avgUtilization = rs.totalCapacity > 0 ? Math.round((rs.totalWorkload / rs.totalCapacity) * 100) : 0;
    const overloaded = rs.unavailable + (avgUtilization > 100 ? rs.partial : 0);

    res.json({
      success: true,
      data: {
        projects: { ...ps, _id: undefined },
        tasks: { ...ts, _id: undefined },
        resources: { ...rs, _id: undefined, avgUtilization, overloaded },
        recentOptimizations,
        recentTasks,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resource utilization breakdown (per resource)
 * @route   GET /api/analytics/utilization
 * @access  Private
 */
const getUtilizationBreakdown = async (req, res, next) => {
  try {
    const { resourceMatch, taskMatch } = await getUserAnalyticsScope(req.user);

    const resources = await Resource.find(resourceMatch)
      .populate('user', 'name email avatar')
      .select('user position department skills maxCapacity fte currentWorkload availability');

    // Get task assignments per resource within user scope
    const matchFilters = [{ status: { $in: ['todo', 'in_progress', 'review'] } }];
    if (Object.keys(taskMatch).length > 0) {
      matchFilters.push(taskMatch);
    }

    const assignments = await Task.aggregate([
      { $match: { $and: matchFilters } },
      {
        $group: {
          _id: '$assignee',
          taskCount: { $sum: 1 },
          totalHours: { $sum: '$estimatedHours' },
        },
      },
    ]);

    const assignMap = {};
    assignments.forEach((a) => {
      if (a._id) assignMap[a._id.toString()] = a;
    });

    const breakdown = resources.map((r) => {
      const capacity = (r.maxCapacity || 40) * (r.fte || 1);
      const userId = r.user?._id?.toString();
      const assign = userId ? assignMap[userId] : null;
      const workload = assign ? assign.totalHours : (r.currentWorkload || 0);
      const utilization = capacity > 0 ? Math.round((workload / capacity) * 100) : 0;

      return {
        _id: r._id,
        name: r.user?.name || r.position,
        department: r.department,
        position: r.position,
        capacity,
        workload: Math.round(workload * 10) / 10,
        utilization,
        taskCount: assign ? assign.taskCount : 0,
        availability: r.availability,
        isOverloaded: utilization > 100,
        burnoutRisk: utilization > 120 ? 'high' : utilization > 90 ? 'medium' : 'low',
        skillCount: (r.skills || []).length,
      };
    });

    // Department aggregation
    const byDepartment = {};
    for (const r of breakdown) {
      const dept = r.department || 'Khác';
      if (!byDepartment[dept]) {
        byDepartment[dept] = { name: dept, totalCapacity: 0, totalWorkload: 0, count: 0 };
      }
      byDepartment[dept].totalCapacity += r.capacity;
      byDepartment[dept].totalWorkload += r.workload;
      byDepartment[dept].count++;
    }

    const departments = Object.values(byDepartment).map((d) => ({
      ...d,
      utilization: d.totalCapacity > 0 ? Math.round((d.totalWorkload / d.totalCapacity) * 100) : 0,
    }));

    res.json({
      success: true,
      data: {
        resources: breakdown.sort((a, b) => b.utilization - a.utilization),
        departments,
        summary: {
          totalResources: breakdown.length,
          overloaded: breakdown.filter((r) => r.isOverloaded).length,
          highBurnout: breakdown.filter((r) => r.burnoutRisk === 'high').length,
          avgUtilization: breakdown.length > 0
            ? Math.round(breakdown.reduce((s, r) => s + r.utilization, 0) / breakdown.length)
            : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Task distribution analytics (status, priority, by project)
 * @route   GET /api/analytics/tasks
 * @access  Private
 */
const getTaskAnalytics = async (req, res, next) => {
  try {
    const { taskMatch } = await getUserAnalyticsScope(req.user);
    const matchStage = Object.keys(taskMatch).length > 0 ? [{ $match: taskMatch }] : [];

    const [byStatus, byPriority, byProject, hoursSummary] = await Promise.all([
      Task.aggregate([
        ...matchStage,
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        ...matchStage,
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        ...matchStage,
        {
          $group: {
            _id: '$project',
            count: { $sum: 1 },
            done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
            totalHours: { $sum: '$estimatedHours' },
          },
        },
        {
          $lookup: {
            from: 'projects',
            localField: '_id',
            foreignField: '_id',
            as: 'project',
          },
        },
        { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            projectName: { $ifNull: ['$project.name', 'Không xác định'] },
            projectCode: '$project.code',
            count: 1,
            done: 1,
            totalHours: 1,
            completion: {
              $cond: [{ $gt: ['$count', 0] }, { $multiply: [{ $divide: ['$done', '$count'] }, 100] }, 0],
            },
          },
        },
      ]),
      Task.aggregate([
        ...matchStage,
        {
          $group: {
            _id: null,
            totalEstimated: { $sum: '$estimatedHours' },
            totalActual: { $sum: '$actualHours' },
          },
        },
      ]),
    ]);

    const hours = hoursSummary[0] || { totalEstimated: 0, totalActual: 0 };

    res.json({
      success: true,
      data: {
        byStatus,
        byPriority,
        byProject: byProject.sort((a, b) => b.count - a.count),
        hours: {
          estimated: hours.totalEstimated,
          actual: hours.totalActual,
          efficiency: hours.totalEstimated > 0
            ? Math.round((hours.totalActual / hours.totalEstimated) * 100)
            : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xu hướng khối lượng công việc theo thời gian
 * @route   GET /api/analytics/workload-trend
 * @access  Private
 *
 * Query: `from`, `to` (ISO date), `granularity` = day|week, `projectId`.
 * Bỏ trống from/to thì tự lấy trọn khoảng thời gian các công việc đang chiếm.
 */
const getWorkloadTrend = async (req, res, next) => {
  try {
    const { from, to, granularity, projectId } = req.query;

    if (projectId && !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: 'ID dự án không hợp lệ' });
    }
    const parseDate = (value) => {
      if (!value) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? undefined : date;
    };
    const fromDate = parseDate(from);
    const toDate = parseDate(to);
    if (fromDate === undefined || toDate === undefined) {
      return res.status(400).json({ success: false, message: 'Khoảng thời gian không hợp lệ' });
    }

    const { taskMatch, resourceMatch } = await getUserAnalyticsScope(req.user);

    const taskFilter = {};
    if (projectId) {
      taskFilter.project = projectId;
    } else if (Object.keys(taskMatch).length > 0) {
      Object.assign(taskFilter, taskMatch);
    }

    const [tasks, resources] = await Promise.all([
      Task.find(taskFilter).select('title estimatedHours startDate endDate assignee status').lean(),
      Resource.find(resourceMatch)
        .populate('user', 'name')
        .select('user position maxCapacity fte unavailablePeriods')
        .lean(),
    ]);

    const flatResources = resources.map((r) => ({
      _id: r._id,
      userId: r.user?._id,
      userName: r.user?.name || r.position,
      position: r.position,
      maxCapacity: r.maxCapacity,
      fte: r.fte,
      unavailablePeriods: r.unavailablePeriods || [],
    }));

    const trend = buildWorkloadTrend(tasks, flatResources, {
      from: fromDate,
      to: toDate,
      granularity,
    });

    res.json({ success: true, data: { trend } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Optimization comparison (before vs after)
 * @route   GET /api/analytics/optimization-comparison/:id
 * @access  Private
 */
/** Độ lệch chuẩn của một mảng số — cùng công thức với metrics.workloadVariance của thuật toán */
const stdDev = (values) => {
  if (!values.length) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.round(Math.sqrt(variance) * 100) / 100;
};

const getOptimizationComparison = async (req, res, next) => {
  try {
    const result = await OptimizationResult.findById(req.params.id);
    if (!result || result.status !== 'completed') {
      return res.status(404).json({ success: false, message: 'Kết quả không tìm thấy' });
    }

    const resources = await Resource.find({ isActive: true })
      .populate('user', 'name')
      .select('user position maxCapacity fte currentWorkload');

    // Tải hiện tại tính từ task đang mở (giống /analytics/utilization) thay vì đọc
    // currentWorkload — field đó chỉ được làm mới khi admin gọi recalculate-workload
    // nên thường đã cũ, khiến cột "Trước" không so sánh được với cột "Sau".
    const openTasks = await Task.aggregate([
      { $match: { status: { $in: ['todo', 'in_progress', 'review'] } } },
      { $group: { _id: '$assignee', totalHours: { $sum: '$estimatedHours' } } },
    ]);
    const hoursByUser = {};
    openTasks.forEach((t) => {
      if (t._id) hoursByUser[t._id.toString()] = t.totalHours || 0;
    });

    // Ghép "sau tối ưu" theo resource ID, không ghép theo tên (tên có thể trùng)
    const afterByResource = {};
    (result.metrics?.resourceUtilization || []).forEach((r) => {
      if (r.resource) afterByResource[r.resource.toString()] = r;
    });

    const rows = resources.map((r) => {
      const capacity = (r.maxCapacity || 40) * (r.fte || 1);
      const userId = r.user?._id?.toString();
      const beforeWorkload = userId in hoursByUser ? hoursByUser[userId] : (r.currentWorkload || 0);
      const after = afterByResource[r._id.toString()];

      return {
        resourceId: r._id,
        resourceName: r.user?.name || r.position || 'N/A',
        position: r.position || '',
        capacity,
        beforeWorkload: Math.round(beforeWorkload * 10) / 10,
        beforeUtilization: capacity > 0 ? Math.round((beforeWorkload / capacity) * 100) : 0,
        afterWorkload: after ? after.workload : 0,
        afterUtilization: after ? after.utilization : 0,
      };
    });

    const beforeWorkloads = rows.map((r) => r.beforeWorkload);
    const metrics = {
      before: {
        stdDev: stdDev(beforeWorkloads),
        overloadedCount: rows.filter((r) => r.beforeWorkload > r.capacity).length,
        avgUtilization: rows.length
          ? Math.round(rows.reduce((s, r) => s + r.beforeUtilization, 0) / rows.length)
          : 0,
      },
      after: {
        // workloadVariance của thuật toán vốn đã là độ lệch chuẩn σ
        stdDev: result.metrics?.workloadVariance ?? 0,
        overloadedCount: result.metrics?.overallocatedResources ?? 0,
        avgUtilization: result.metrics?.averageUtilization ?? 0,
        avgSkillMatch: result.metrics?.averageSkillMatch ?? 0,
      },
    };

    res.json({
      success: true,
      data: {
        metrics,
        resources: rows,
        // Giữ lại hai mảng cũ để không phá vỡ client đang dùng shape trước đó
        current: rows.map((r) => ({
          name: r.resourceName,
          workload: r.beforeWorkload,
          capacity: r.capacity,
          utilization: r.beforeUtilization,
        })),
        optimized: rows.map((r) => ({
          name: r.resourceName,
          workload: r.afterWorkload,
          capacity: r.capacity,
          utilization: r.afterUtilization,
        })),
        improvement: {
          fitness: result.fitness,
          skillMatch: result.metrics?.averageSkillMatch || 0,
          workloadVariance: result.metrics?.workloadVariance || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardOverview,
  getUtilizationBreakdown,
  getTaskAnalytics,
  getWorkloadTrend,
  getOptimizationComparison,
};
