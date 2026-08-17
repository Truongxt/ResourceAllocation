const express = require('express');
const { param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const {
  runGeneticAlgorithm,
  runCSPSolver,
  runHybrid,
  getHistory,
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
router.get('/history', getHistory);
router.get('/:id', resultIdValidation, validate, getResultById);

// Apply result
router.post('/:id/apply', authorize('admin', 'project_manager'), resultIdValidation, validate, applyResult);

module.exports = router;