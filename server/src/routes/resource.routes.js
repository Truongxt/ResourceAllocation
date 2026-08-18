const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  updateSkills,
  recalculateWorkload,
  getResourceSummary,
} = require('../controllers/resource.controller');

const router = express.Router();

const resourceIdValidation = [
  param('id').isMongoId().withMessage('ID nhân sự không hợp lệ'),
];

const listValidation = [
  query('department').optional().isString(),
  query('availability')
    .optional()
    .isIn(['available', 'partially_available', 'unavailable'])
    .withMessage('Trạng thái khả dụng không hợp lệ'),
  query('skill').optional().isString(),
  query('skillLevel').optional().isInt({ min: 1, max: 4 }).withMessage('Level kỹ năng phải từ 1 đến 4'),
];

const createValidation = [
  body()
    .custom((value) => {
      if (value?.user || value?.newUser) return true;
      throw new Error('Vui lòng chọn tài khoản có sẵn hoặc tạo tài khoản mới');
    }),
  body('user')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('ID tài khoản không hợp lệ'),
  body('newUser.name')
    .if((value, { req }) => Boolean(req.body.newUser))
    .trim()
    .notEmpty()
    .withMessage('Họ tên tài khoản là bắt buộc'),
  body('newUser.email')
    .if((value, { req }) => Boolean(req.body.newUser))
    .trim()
    .notEmpty()
    .withMessage('Email tài khoản là bắt buộc')
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('newUser.password')
    .if((value, { req }) => Boolean(req.body.newUser))
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('newUser.role')
    .optional()
    .isIn(['project_manager', 'member'])
    .withMessage('Role không hợp lệ'),
  body('position')
    .trim()
    .notEmpty()
    .withMessage('Vị trí là bắt buộc'),
  body('department').trim().notEmpty().withMessage('Phòng ban là bắt buộc'),
  body('maxCapacity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Capacity phải >= 0'),
  body('fte')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('FTE phải từ 0 đến 1'),
  body('hourlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate phải >= 0'),
  body('skills').optional().isArray().withMessage('Skills phải là mảng'),
];

const updateValidation = [
  body('position').optional().trim().notEmpty().withMessage('Vị trí không được để trống'),
  body('department').optional().trim().notEmpty().withMessage('Phòng ban không được để trống'),
  body('maxCapacity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Capacity phải >= 0'),
  body('fte')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('FTE phải từ 0 đến 1'),
  body('hourlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate phải >= 0'),
  body('isActive').optional().isBoolean(),
  body('skills').optional().isArray().withMessage('Skills phải là mảng'),
  body('availability')
    .optional()
    .isIn(['available', 'partially_available', 'unavailable'])
    .withMessage('Trạng thái khả dụng không hợp lệ'),
];

const skillsValidation = [
  body('skills')
    .isArray({ min: 0 })
    .withMessage('Skills phải là mảng'),
  body('skills.*.name')
    .notEmpty()
    .withMessage('Tên kỹ năng là bắt buộc'),
  body('skills.*.level')
    .isInt({ min: 1, max: 4 })
    .withMessage('Level kỹ năng phải từ 1 đến 4'),
];

router.use(protect);

router.get('/stats/summary', getResourceSummary);
router.post('/recalculate-workload', authorize('admin'), recalculateWorkload);
router.get('/', listValidation, validate, getResources);
router.get('/:id', resourceIdValidation, validate, getResourceById);
router.post('/', authorize('admin', 'project_manager'), createValidation, validate, createResource);
router.put('/:id', authorize('admin', 'project_manager'), resourceIdValidation, updateValidation, validate, updateResource);
router.put('/:id/skills', resourceIdValidation, skillsValidation, validate, updateSkills);
router.delete('/:id', authorize('admin'), resourceIdValidation, validate, deleteResource);

module.exports = router;
