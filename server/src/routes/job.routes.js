const express = require('express');
const { protect } = require('../middleware/auth');
const { jobStatus } = require('../services/jobs.service');

const router = express.Router();

router.use(protect);

/**
 * Trạng thái job định kỳ — Owner/Admin. Job được gọi từ cron bên ngoài, nên đây là chỗ
 * duy nhất thấy được "cron chưa được cấu hình" (`stale` khi chưa từng chạy thành công).
 */
router.get('/status', async (req, res, next) => {
  try {
    if (!req.user.isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ Owner hoặc Admin xem được trạng thái job' });
    }
    res.json({ success: true, data: { jobs: await jobStatus() } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
