const crypto = require('crypto');
const express = require('express');
const { isKnownJob, runJob } = require('../services/jobs.service');

const router = express.Router();

/**
 * Khóa của endpoint nội bộ: header `X-Job-Secret` phải khớp `JOB_SECRET`.
 *
 * - Server không đặt `JOB_SECRET` → 503: endpoint TẮT, không bao giờ mở tự do.
 * - Token đăng nhập không thay được khóa này, kể cả của admin: job chạy cho mọi công ty,
 *   không thuộc quyền của người dùng nào.
 * - So sánh constant-time trên băm SHA-256 (cùng độ dài), để thời gian phản hồi không
 *   lộ ra khóa đúng được bao nhiêu ký tự đầu.
 */
const requireJobSecret = (req, res, next) => {
  const expected = process.env.JOB_SECRET;
  if (!expected) {
    return res.status(503).json({ success: false, message: 'Job định kỳ chưa được bật (thiếu JOB_SECRET)' });
  }
  const given = req.get('X-Job-Secret') || '';
  const digest = (value) => crypto.createHash('sha256').update(value).digest();
  if (!given || !crypto.timingSafeEqual(digest(given), digest(expected))) {
    return res.status(401).json({ success: false, message: 'Sai hoặc thiếu X-Job-Secret' });
  }
  next();
};

router.post('/jobs/:name', requireJobSecret, async (req, res, next) => {
  try {
    if (!isKnownJob(req.params.name)) {
      return res.status(404).json({ success: false, message: `Không có job "${req.params.name}"` });
    }
    const result = await runJob(req.params.name);
    res.json({ success: true, data: { job: req.params.name, result } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.requireJobSecret = requireJobSecret;
