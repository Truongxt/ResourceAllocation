const ActivityLog = require('../models/ActivityLog');
const { logActivity } = require('../services/activityLog.service');

const DEFAULT_COMPANY = 'Công ty Công nghệ RAO';

/**
 * Bộ lọc phân lập công ty cho nhật ký.
 *
 * `companyName` mới được thêm vào `ActivityLog`, nên bản ghi cũ không có trường
 * đó. Công ty mặc định nhận luôn cả những bản ghi thiếu trường — toàn bộ nhật ký
 * cũ vốn thuộc về nó — còn công ty khác thì lọc khớp chính xác.
 */
const companyFilter = (user) => {
  const company = user?.companyName || DEFAULT_COMPANY;
  return {
    companyName:
      company === DEFAULT_COMPANY ? { $in: [company, null, undefined] } : company,
  };
};

/**
 * @desc    Lấy danh sách nhật ký hoạt động có lọc và phân trang
 * @route   GET /api/activity-logs
 * @access  Private
 */
const getActivityLogs = async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    // Phân lập công ty trước, rồi mới tới phạm vi cá nhân. Nhánh `admin` bên
    // dưới bỏ hẳn bộ lọc theo người dùng — không có dòng này thì admin công ty B
    // đọc được vết hoạt động của mọi công ty.
    const filter = companyFilter(req.user);

    if (req.user && req.user.role !== 'admin') {
      filter.user = req.user._id;
    } else if (req.query.user) {
      filter.user = req.query.user;
    }

    if (req.query.entityType) {
      filter.entityType = req.query.entityType;
    }

    if (req.query.action) {
      filter.action = req.query.action;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { description: searchRegex },
        { entityTitle: searchRegex },
        { userName: searchRegex },
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
    // `topUsers` gom theo `userName`, nên thiếu bộ lọc công ty là bảng xếp hạng
    // hiện thẳng tên người của công ty khác.
    const match = companyFilter(req.user);

    if (req.user && req.user.role !== 'admin') {
      match.user = req.user._id;
    }

    const [total, todayCount, byEntityType, topUsers] = await Promise.all([
      ActivityLog.countDocuments(match),
      ActivityLog.countDocuments({ ...match, createdAt: { $gte: today } }),
      ActivityLog.aggregate([
        { $match: match },
        { $group: { _id: '$entityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      ActivityLog.aggregate([
        { $match: { ...match, user: { $ne: null } } },
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
    // Chỉ nhật ký của công ty người gọi. `deleteMany({})` trước đây xóa sạch vết
    // kiểm toán của **toàn hệ thống** — một admin bất kỳ xóa được lịch sử của mọi
    // công ty khác, và đó đúng là thứ không bao giờ được phép mất.
    const result = await ActivityLog.deleteMany(companyFilter(req.user));

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
