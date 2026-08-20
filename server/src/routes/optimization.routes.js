const express = require('express');
const { param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const {
  runGeneticAlgorithm,
  runCSPSolver,
  runHybrid,
  getHistory,
  compareResults,
  getResultById,
  applyResult,
} = require('../controllers/optimization.controller');

const router = express.Router();

const resultIdValidation = [
  param('id').isMongoId().withMessage('ID kết quả không hợp lệ'),
];

router.use(protect);

// Run algorithms
router.post('/run/genetic', runGeneticAlgorithm);
router.post('/run/csp', runCSPSolver);
router.post('/run/hybrid', runHybrid);

// History & detail
// `/compare` phải đứng trước `/:id`, nếu không Express khớp "compare" vào :id và
// request chết ở tầng validate với thông báo "ID không hợp lệ".
router.get('/history', getHistory);
router.get('/compare', compareResults);
router.get('/:id', resultIdValidation, validate, getResultById);

// Apply result
router.post('/:id/apply', authorize('admin', 'project_manager'), resultIdValidation, validate, applyResult);

module.exports = router;