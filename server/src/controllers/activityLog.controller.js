const ActivityLog = require('../models/ActivityLog');
const { logActivity } = require('../services/activityLog.service');

/**
 * @desc    Lấy danh sách nhật ký hoạt động có lọc và phân trang
 * @route   GET /api/activity-logs
 * @access  Private
 */
const getActivityLogs = async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const filter = {};

    if (req.query.entityType) {
      filter.entityType = req.query.entityType;
    }

    if (req.query.action) {
      filter.action = req.query.action;
    }

    if (req.query.user) {
      filter.user = req.query.user;
    }

    if (req.query.search) {
      filter.$or = [
        { description: new RegExp(req.query.search, 'i') },
        { entityTitle: new RegExp(req.query.search, 'i') },
        { userName: new RegExp(req.query.search, 'i') },
      ];
    }

    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate('user', 'name email avatar role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: logs.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.max(Math.ceil(total / limit), 1),
      },
      data: { logs },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy thống kê tổng quan hoạt động
 * @route   GET /api/activity-logs/stats
 * @access  Private
 */
const getActivityStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, todayCount, byEntityType, topUsers] = await Promise.all([
      ActivityLog.countDocuments(),
      ActivityLog.countDocuments({ createdAt: { $gte: today } }),
      ActivityLog.aggregate([
        { $group: { _id: '$entityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      ActivityLog.aggregate([
        { $match: { user: { $ne: null } } },
        { $group: { _id: '$userName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        total,
        todayCount,
        byEntityType: byEntityType.map((item) => ({
          type: item._id,
          count: item.count,
        })),
        topUsers: topUsers.map((item) => ({
          userName: item._id,
          count: item.count,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa toàn bộ nhật ký (Admin only)
 * @route   DELETE /api/activity-logs
 * @access  Private (Admin)
 */
const clearActivityLogs = async (req, res, next) => {
  try {
    const result = await ActivityLog.deleteMany({});

    // Ghi SAU khi xóa, không phải trước — ghi trước thì chính `deleteMany` ở trên
    // cuốn luôn bản ghi vừa tạo, và việc xóa sạch nhật ký trở thành thao tác duy
    // nhất trong hệ thống không để lại vết. Đây là hành động cần vết nhất.
    await logActivity({
      req,
      action: 'CLEAR_ACTIVITY_LOGS',
      entityType: 'system',
      description: `Xóa toàn bộ nhật ký hoạt động (${result.deletedCount} bản ghi)`,
      details: { deletedCount: result.deletedCount },
    });

    res.json({
      success: true,
      message: `Đã xóa toàn bộ ${result.deletedCount} bản ghi nhật ký hoạt động`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivityLogs,
  getActivityStats,
  clearActivityLogs,
};
