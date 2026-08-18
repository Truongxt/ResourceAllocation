const Notification = require('../models/Notification');
const { emitToUser } = require('./socket.service');

/**
 * Persist a notification and immediately deliver it to the recipient's
 * authenticated Socket.IO room when they are online.
 */
const createAndEmitNotification = async ({
  recipient,
  actor,
  type,
  title,
  message,
  entityType = 'system',
  entityId,
  link = '/',
}) => {
  if (!recipient) return null;

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

  const payload = notification.toObject();
  emitToUser(recipient, 'notification:new', payload);

  return payload;
};

module.exports = {
  createAndEmitNotification,
};