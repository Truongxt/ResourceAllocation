const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
  getProjectSummary,
} = require('../controllers/project.controller');

const router = express.Router();

const projectIdValidation = [
  param('id').isMongoId().withMessage('ID dự án không hợp lệ'),
];

const userIdValidation = [
  param('userId').isMongoId().withMessage('ID người dùng không hợp lệ'),
];

const listValidation = [
  query('status')
    .optional()
    .isIn(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'])
    .withMessage('Trạng thái dự án không hợp lệ'),
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Độ ưu tiên không hợp lệ'),
  query('manager').optional().isMongoId().withMessage('ID manager không hợp lệ'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1 đến 100'),
];

const projectValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Tên dự án là bắt buộc')
    .isLength({ max: 200 })
    .withMessage('Tên dự án không vượt quá 200 ký tự'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Mô tả không vượt quá 2000 ký tự'),
  body('code')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 10 })
    .withMessage('Mã dự án không vượt quá 10 ký tự'),
  body('status')
    .optional()
    .isIn(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'])
    .withMessage('Trạng thái dự án không hợp lệ'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Độ ưu tiên không hợp lệ'),
  body('startDate').notEmpty().withMessage('Ngày bắt đầu là bắt buộc').isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  body('endDate').notEmpty().withMessage('Ngày kết thúc là bắt buộc').isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
  body('budget').optional().isFloat({ min: 0 }).withMessage('Ngân sách phải lớn hơn hoặc bằng 0'),
  body('progress').optional().isFloat({ min: 0, max: 100 }).withMessage('Tiến độ phải từ 0 đến 100'),
  body('manager').optional().isMongoId().withMessage('Project Manager không hợp lệ'),
  body('tags').optional().isArray().withMessage('Tags phải là danh sách'),
];

const updateProjectValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Tên dự án không được để trống')
    .isLength({ max: 200 })
    .withMessage('Tên dự án không vượt quá 200 ký tự'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Mô tả không vượt quá 2000 ký tự'),
  body('code')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 10 })
    .withMessage('Mã dự án không vượt quá 10 ký tự'),
  body('status')
    .optional()
    .isIn(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'])
    .withMessage('Trạng thái dự án không hợp lệ'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Độ ưu tiên không hợp lệ'),
  body('startDate').optional().isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  body('endDate').optional().isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
  body('budget').optional().isFloat({ min: 0 }).withMessage('Ngân sách phải lớn hơn hoặc bằng 0'),
  body('progress').optional().isFloat({ min: 0, max: 100 }).withMessage('Tiến độ phải từ 0 đến 100'),
  body('manager').optional().isMongoId().withMessage('Project Manager không hợp lệ'),
  body('tags').optional().isArray().withMessage('Tags phải là danh sách'),
];

const memberValidation = [
  body('user').notEmpty().withMessage('Thành viên là bắt buộc').isMongoId().withMessage('ID thành viên không hợp lệ'),
  body('role')
    .optional()
    .isIn(['lead', 'developer', 'designer', 'tester', 'devops'])
    .withMessage('Vai trò thành viên không hợp lệ'),
  body('allocation')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Allocation phải từ 0 đến 100'),
];

const updateMemberValidation = [
  body('role')
    .optional()
    .isIn(['lead', 'developer', 'designer', 'tester', 'devops'])
    .withMessage('Vai trò thành viên không hợp lệ'),
  body('allocation')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Allocation phải từ 0 đến 100'),
];

router.use(protect);

router.get('/stats/summary', getProjectSummary);
router.get('/', listValidation, validate, getProjects);
router.get('/:id', projectIdValidation, validate, getProjectById);
router.post('/', authorize('admin', 'project_manager'), projectValidation, validate, createProject);
router.put('/:id', authorize('admin', 'project_manager'), projectIdValidation, updateProjectValidation, validate, updateProject);
router.delete('/:id', authorize('admin', 'project_manager'), projectIdValidation, validate, deleteProject);
router.post('/:id/members', authorize('admin', 'project_manager'), projectIdValidation, memberValidation, validate, addProjectMember);
router.put('/:id/members/:userId', authorize('admin', 'project_manager'), projectIdValidation, userIdValidation, updateMemberValidation, validate, updateProjectMember);
router.delete('/:id/members/:userId', authorize('admin', 'project_manager'), projectIdValidation, userIdValidation, validate, removeProjectMember);

module.exports = router;