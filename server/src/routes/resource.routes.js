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
  body('user')
    .notEmpty()
    .withMessage('Tài khoản liên kết là bắt buộc')
    .isMongoId()
    .withMessage('ID tài khoản không hợp lệ'),
  body('position')
    .trim()
    .notEmpty()
    .withMessage('Vị trí là bắt buộc'),
  body('department').optional().trim(),
  body('employeeId').optional().trim(),
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
  body('department').optional().trim(),
  body('employeeId').optional().trim(),
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