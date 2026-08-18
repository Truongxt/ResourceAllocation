const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getActivityLogs,
  getActivityStats,
  clearActivityLogs,
} = require('../controllers/activityLog.controller');

const router = express.Router();

router.use(protect);

router.get('/', getActivityLogs);
router.get('/stats', getActivityStats);
router.delete('/', authorize('admin'), clearActivityLogs);

module.exports = router;
