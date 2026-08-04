const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getUsers,
} = require('../controllers/auth.controller');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Tên là bắt buộc')
    .isLength({ max: 100 })
    .withMessage('Tên không vượt quá 100 ký tự'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email là bắt buộc')
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('role')
    .optional()
    .isIn(['admin', 'project_manager', 'member'])
    .withMessage('Role không hợp lệ'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email là bắt buộc')
    .isEmail()
    .withMessage('Email không hợp lệ'),
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc'),
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Tên không vượt quá 100 ký tự'),
  body('department')
    .optional()
    .trim(),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mật khẩu hiện tại là bắt buộc'),
  body('newPassword')
    .notEmpty()
    .withMessage('Mật khẩu mới là bắt buộc')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu mới phải có ít nhất 6 ký tự'),
];

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfileValidation, validate, updateProfile);
router.put('/password', protect, changePasswordValidation, validate, changePassword);

// Admin only
router.get('/users', protect, authorize('admin'), getUsers);

module.exports = router;
