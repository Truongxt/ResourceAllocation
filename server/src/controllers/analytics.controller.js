const Project = require('../models/Project');
const Task = require('../models/Task');
const Resource = require('../models/Resource');
const OptimizationResult = require('../models/OptimizationResult');
const mongoose = require('mongoose');

/**
 * @desc    Dashboard overview — tổng hợp real data
 * @route   GET /api/analytics/dashboard
 * @access  Private
 */
const getDashboardOverview = async (req, res, next) => {
  try {
    const [
      projectStats,
      taskStats,
      resourceStats,
      recentOptimizations,
      recentTasks,
    ] = await Promise.all([
      // Projects
      Project.aggregate([
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
        { $match: { isActive: true } },
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

      // Recent optimizations
      OptimizationResult.find({ status: 'completed' })
        .sort('-createdAt')
        .limit(5)
        .select('algorithm fitness executionTime taskCount resourceCount createdAt isApplied'),

      // Recent tasks activity
      Task.find()
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
    const resources = await Resource.find({ isActive: true })
      .populate('user', 'name email avatar')
      .select('user position department skills maxCapacity fte currentWorkload availability');

    // Get task assignments per resource
    const assignments = await Task.aggregate([
      { $match: { status: { $in: ['todo', 'in_progress', 'review'] } } },
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
    const [byStatus, byPriority, byProject, hoursSummary] = await Promise.all([
      Task.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Task.aggregate([
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
 * @desc    Optimization comparison (before vs after)
 * @route   GET /api/analytics/optimization-comparison/:id
 * @access  Private
 */
const getOptimizationComparison = async (req, res, next) => {
  try {
    const result = await OptimizationResult.findById(req.params.id);
    if (!result || result.status !== 'completed') {
      return res.status(404).json({ success: false, message: 'Kết quả không tìm thấy' });
    }

    // Current state
    const resources = await Resource.find({ isActive: true })
      .populate('user', 'name')
      .select('user maxCapacity fte currentWorkload');

    const currentState = resources.map((r) => {
      const capacity = (r.maxCapacity || 40) * (r.fte || 1);
      return {
        name: r.user?.name || 'N/A',
        workload: r.currentWorkload || 0,
        capacity,
        utilization: capacity > 0 ? Math.round(((r.currentWorkload || 0) / capacity) * 100) : 0,
      };
    });

    // Optimized state (from result)
    const optimizedState = (result.metrics?.resourceUtilization || []).map((r) => ({
      name: r.name,
      workload: r.workload,
      capacity: r.capacity,
      utilization: r.utilization,
    }));

    res.json({
      success: true,
      data: {
        current: currentState,
        optimized: optimizedState,
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
  getOptimizationComparison,
};
