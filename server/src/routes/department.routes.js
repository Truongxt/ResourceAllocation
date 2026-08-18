const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/department.controller');

const router = express.Router();

const departmentIdValidation = [
  param('id').isMongoId().withMessage('ID phòng ban không hợp lệ'),
];

const listValidation = [
  query('isActive').optional().isBoolean().withMessage('Trạng thái phòng ban không hợp lệ'),
  query('search').optional().isString(),
];

const departmentValidation = [
  body('name').trim().notEmpty().withMessage('Tên phòng ban là bắt buộc'),
  body('code').optional({ values: 'falsy' }).trim().isLength({ max: 12 }).withMessage('Mã phòng ban không vượt quá 12 ký tự'),
  body('description').optional().trim(),
  body('managerName').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('Trạng thái phòng ban không hợp lệ'),
];

router.use(protect);

router.get('/', listValidation, validate, getDepartments);
router.post('/', authorize('admin', 'project_manager'), departmentValidation, validate, createDepartment);
router.put('/:id', authorize('admin', 'project_manager'), departmentIdValidation, departmentValidation, validate, updateDepartment);
router.delete('/:id', authorize('admin'), departmentIdValidation, validate, deleteDepartment);

module.exports = router;
