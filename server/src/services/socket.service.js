const Notification = require('../models/Notification');
const { sendNotificationEmail } = require('./email.service');

let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const getIO = () => ioInstance;

const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId.toString()}`).emit(event, payload);
};

const emitToAll = (event, payload) => {
  if (!ioInstance) return;
  ioInstance.emit(event, payload);
};

/**
 * Tạo thông báo mới trong database và bắn Socket.IO event real-time đến người dùng
 */
const sendNotification = async ({
  recipient,
  actor,
  type = 'system',
  title,
  message,
  entityType = 'system',
  entityId,
  link = '/',
}) => {
  try {
    if (!recipient || !title || !message) return null;

    const notification = await Notification.create({
      recipient,
      actor,
      type,
      title,
      message,
      entityType,
      entityId,
      link,
    });

    const populated = await Notification.findById(notification._id)
      .populate('actor', 'name avatar');

    // Emit real-time socket event to the recipient's room
    emitToUser(recipient, 'notification:new', populated);

    // Gửi mail song song, không chờ: người nhận đang mở ứng dụng thì đã thấy
    // thông báo realtime rồi, không việc gì bắt request đứng đợi SMTP. Hàm này
    // tự nuốt mọi lỗi bên trong nên không cần .catch ở đây.
    sendNotificationEmail(populated.toObject ? populated.toObject() : populated);

    return populated;
  } catch (error) {
    console.error('Error creating and sending notification:', error);
    return null;
  }
};

module.exports = {
  setIO,
  getIO,
  emitToUser,
  emitToAll,
  sendNotification,
};