const express = require('express');
const { param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const {
  getDashboardOverview,
  getUtilizationBreakdown,
  getTaskAnalytics,
  getOptimizationComparison,
} = require('../controllers/analytics.controller');

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardOverview);
router.get('/utilization', getUtilizationBreakdown);
router.get('/tasks', getTaskAnalytics);
router.get(
  '/optimization-comparison/:id',
  [param('id').isMongoId().withMessage('ID không hợp lệ')],
  validate,
  getOptimizationComparison
);

module.exports = router;
