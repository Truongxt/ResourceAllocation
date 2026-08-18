const express = require('express');
const { param } = require('express-validator');

const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require('../controllers/notification.controller');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.patch('/read-all', markAllNotificationsAsRead);
router.patch(
  '/:id/read',
  [param('id').isMongoId().withMessage('ID thông báo không hợp lệ')],
  validate,
  markNotificationAsRead
);

module.exports = router;