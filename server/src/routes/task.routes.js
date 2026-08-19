const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { canModifyTask } = require('../middleware/taskAccess');
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTaskSummary,
} = require('../controllers/task.controller');

const router = express.Router();

const taskIdValidation = [
  param('id').isMongoId().withMessage('ID công việc không hợp lệ'),
];

const listValidation = [
  query('project').optional().isMongoId().withMessage('ID dự án không hợp lệ'),
  query('status')
    .optional()
    .isIn(['todo', 'in_progress', 'review', 'done', 'blocked'])
    .withMessage('Trạng thái không hợp lệ'),
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Độ ưu tiên không hợp lệ'),
  query('assignee').optional().isMongoId().withMessage('ID nhân sự không hợp lệ'),
];

const createValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Tiêu đề công việc là bắt buộc')
    .isLength({ max: 300 })
    .withMessage('Tiêu đề không vượt quá 300 ký tự'),
  body('project')
    .notEmpty()
    .withMessage('Dự án là bắt buộc')
    .isMongoId()
    .withMessage('ID dự án không hợp lệ'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Mô tả không vượt quá 5000 ký tự'),
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'review', 'done', 'blocked'])
    .withMessage('Trạng thái không hợp lệ'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Độ ưu tiên không hợp lệ'),
  body('startDate').optional().isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  body('endDate').optional().isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Giờ ước tính phải >= 0'),
  body('assignee').optional({ nullable: true }).isMongoId().withMessage('ID nhân sự không hợp lệ'),
  body('dependencies').optional().isArray().withMessage('Dependencies phải là mảng'),
  body('dependencies.*').optional().isMongoId().withMessage('ID công việc tiền nhiệm không hợp lệ'),
  body('requiredSkills').optional().isArray().withMessage('Required skills phải là mảng'),
];

const updateValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Tiêu đề không được để trống')
    .isLength({ max: 300 })
    .withMessage('Tiêu đề không vượt quá 300 ký tự'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Mô tả không vượt quá 5000 ký tự'),
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'review', 'done', 'blocked'])
    .withMessage('Trạng thái không hợp lệ'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Độ ưu tiên không hợp lệ'),
  body('startDate').optional().isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  body('endDate').optional().isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Giờ ước tính phải >= 0'),
  body('actualHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Giờ thực tế phải >= 0'),
  body('progress')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tiến độ phải từ 0 đến 100'),
  body('assignee').optional({ nullable: true }).isMongoId().withMessage('ID nhân sự không hợp lệ'),
  body('dependencies').optional().isArray().withMessage('Dependencies phải là mảng'),
  body('dependencies.*').optional().isMongoId().withMessage('ID công việc tiền nhiệm không hợp lệ'),
  body('requiredSkills').optional().isArray().withMessage('Required skills phải là mảng'),
];

const statusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Trạng thái là bắt buộc')
    .isIn(['todo', 'in_progress', 'review', 'done', 'blocked'])
    .withMessage('Trạng thái không hợp lệ'),
];

router.use(protect);

router.get('/stats/summary', getTaskSummary);
router.get('/', listValidation, validate, getTasks);
router.get('/:id', taskIdValidation, validate, getTaskById);

router.post('/', authorize('admin', 'project_manager'), createValidation, validate, createTask);

// Member sửa được task của chính mình, nhưng chỉ các trường về tiến độ
router.put(
  '/:id',
  taskIdValidation,
  updateValidation,
  validate,
  canModifyTask({ restrictFields: true }),
  updateTask
);
router.patch('/:id/status', taskIdValidation, statusValidation, validate, canModifyTask(), updateTaskStatus);

router.delete('/:id', authorize('admin', 'project_manager'), taskIdValidation, validate, deleteTask);

module.exports = router;