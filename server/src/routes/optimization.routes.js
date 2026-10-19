const express = require('express');
const { param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { resolveOptimizeScope } = require('../services/optimizeScope');
const {
  runGeneticAlgorithm,
  runCSPSolver,
  runHybrid,
  getHistory,
  compareResults,
  getResultById,
  applyResult,
  rollbackResult,
  runBenchmark,
  getOptimizationReadiness,
} = require('../controllers/optimization.controller');

const router = express.Router();

const resultIdValidation = [
  param('id').isMongoId().withMessage('ID kết quả không hợp lệ'),
];

// Quyền áp dụng / hoàn tác kết quả tối ưu: Owner, Admin, PM, hoặc App Admin của Base Optimize+
const authorizeApplyOptimization = (req, res, next) => {
  const isOwner = Boolean(req.user?.isOwner);
  const isAdminOrPm = ['admin', 'project_manager'].includes(req.user?.role);
  const isAppAdmin = Array.isArray(req.user?.appAdmins) && req.user.appAdmins.includes('optimize');

  if (!isOwner && !isAdminOrPm && !isAppAdmin) {
    return res.status(403).json({
      success: false,
      message: `Vai trò '${req.user?.role}' không có quyền áp dụng hoặc hoàn tác kết quả tối ưu hóa.`,
    });
  }
  next();
};

router.use(protect);
// Owner, Admin, App Admin của Base Optimize+: toàn công ty. PM: chỉ dự án mình quản lý —
// phạm vi gắn vào `req.optimizeScope` và được kiểm ở từng handler. Còn lại: 403.
router.use(async (req, res, next) => {
  try {
    req.optimizeScope = await resolveOptimizeScope(req.user);
    if (!req.optimizeScope) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chưa được cấp quyền dùng Base Optimize+. Vui lòng liên hệ Owner hoặc Admin.',
      });
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Run algorithms & benchmark
router.post('/run/genetic', runGeneticAlgorithm);
router.post('/run/csp', runCSPSolver);
router.post('/run/hybrid', runHybrid);
router.post('/benchmark', runBenchmark);

// History & detail
// `/compare` phải đứng trước `/:id`, nếu không Express khớp "compare" vào :id và
// request chết ở tầng validate với thông báo "ID không hợp lệ".
router.get('/history', getHistory);
router.get('/compare', compareResults);
router.get('/readiness', getOptimizationReadiness);
router.get('/:id', resultIdValidation, validate, getResultById);

// Apply & Rollback result
router.post('/:id/apply', authorizeApplyOptimization, resultIdValidation, validate, applyResult);
router.post('/:id/rollback', authorizeApplyOptimization, resultIdValidation, validate, rollbackResult);

module.exports = router;