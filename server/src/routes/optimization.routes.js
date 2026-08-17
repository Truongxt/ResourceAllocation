const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Module 5-6: Optimization - sẽ triển khai đầy đủ sau
router.get('/', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Module Optimization chưa được triển khai',
  });
});

module.exports = router;