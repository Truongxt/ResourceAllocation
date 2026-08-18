const Notification = require('../models/Notification');
const { emitToUser } = require('../services/socket.service');

/**
 * @desc    Lấy notification của user hiện tại
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const filter = { recipient: req.user._id };

    if (req.query.unread === 'true') {
      filter.readAt = null;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('actor', 'name email avatar')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user._id, readAt: null }),
    ]);

    res.json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      pagination: {
        page,
        limit,
        pages: Math.max(Math.ceil(total / limit), 1),
      },
      data: { notifications },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đánh dấu một notification là đã đọc
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { readAt: new Date() },
      { new: true }
    ).populate('actor', 'name email avatar');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo',
      });
    }

    emitToUser(req.user._id, 'notification:read', {
      id: notification._id.toString(),
    });

    res.json({
      success: true,
      data: { notification },
      message: 'Đã đánh dấu thông báo là đã đọc',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đánh dấu toàn bộ notification là đã đọc
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, readAt: null },
      { readAt: new Date() }
    );

    emitToUser(req.user._id, 'notification:read-all', {});

    res.json({
      success: true,
      data: { modifiedCount: result.modifiedCount },
      message: 'Đã đánh dấu tất cả thông báo là đã đọc',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};