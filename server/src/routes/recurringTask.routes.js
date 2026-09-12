const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getRecurringTasks,
  createRecurringTask,
  updateRecurringTask,
  deleteRecurringTask,
  previewSchedule,
  triggerRunNow,
} = require('../controllers/recurringTask.controller');

const router = express.Router();

router.use(protect);

router.get('/', getRecurringTasks);
router.post('/preview', previewSchedule);
router.post('/', authorize('admin', 'project_manager'), createRecurringTask);
router.put('/:id', authorize('admin', 'project_manager'), updateRecurringTask);
router.delete('/:id', authorize('admin', 'project_manager'), deleteRecurringTask);
router.post('/:id/run-now', authorize('admin', 'project_manager'), triggerRunNow);

module.exports = router;
