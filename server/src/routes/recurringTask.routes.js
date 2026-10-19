const express = require('express');
const { protect } = require('../middleware/auth');
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
// Admin/Owner hoặc người quản lý của dự án — kiểm ở controller (managesProjectId).
router.post('/', createRecurringTask);
router.put('/:id', updateRecurringTask);
router.delete('/:id', deleteRecurringTask);
router.post('/:id/run-now', triggerRunNow);

module.exports = router;
