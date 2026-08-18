const ActivityLog = require('../models/ActivityLog');

/**
 * Ghi lại nhật ký hoạt động hệ thống
 */
const logActivity = async ({
  req,
  user,
  action,
  entityType = 'system',
  entityId,
  entityTitle,
  description,
  details = {},
}) => {
  try {
    const activeUser = user || req?.user;
    const ipAddress = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip;
    const userAgent = req?.headers['user-agent'];

    await ActivityLog.create({
      user: activeUser?._id,
      userName: activeUser?.name || 'Hệ thống',
      userEmail: activeUser?.email,
      action,
      entityType,
      entityId,
      entityTitle,
      description,
      details,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error('Lỗi khi ghi ActivityLog:', error.message);
  }
};

module.exports = {
  logActivity,
};
