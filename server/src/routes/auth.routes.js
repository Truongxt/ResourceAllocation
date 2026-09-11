const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getUsers,
  createUser,
  updateUserRole,
  updateUserStatus,
  adminResetPassword,
  updateUserManager,
  updateAppPermissions,
  getSessions,
  revokeSession,
  refresh,
  logout,
  logoutAll,
  getPermissionsMatrix,
  updateUserAppAdmin,
  updateUserSpecialGrants,
  createGuest,
  getGuests,
  updateUserOwnerStatus,
  updateUserEmail,
  disableUser2FA,
  adminUpdateUserProfile,
  getCompanyManagers,
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
  body('phone').optional().trim(),
  body('companyName').optional().trim(),
  body('jobTitle').optional().trim(),
  body('companySize').optional().trim(),
  body('interestedProduct').optional().trim(),
  body('location').optional().trim(),
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
  body('phone').optional().trim(),
  body('jobTitle').optional().trim(),
  body('companyName').optional().trim(),
  body('avatar').optional(),
  body('manager').optional(),
  body('twoFactorEnabled').optional().isBoolean(),
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

// Public routes — siết tần suất vì đây là chỗ duy nhất thử sai hàng loạt có giá trị
router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);

// Làm mới và đăng xuất chỉ cần cookie, không cần access token
router.post('/refresh', refresh);
router.post('/logout', logout);

// Protected routes (Dành cho thành viên)
router.get('/me', protect, getMe);
router.get('/company-managers', protect, getCompanyManagers);
router.post('/logout-all', protect, logoutAll);
router.put('/profile', protect, updateProfileValidation, validate, updateProfile);
router.put('/password', protect, changePasswordValidation, validate, changePassword);
router.get('/sessions', protect, getSessions);
router.delete('/sessions/:id', protect, revokeSession);

// Admin only (Quản lý tài khoản toàn hệ thống - Base Account)
router.get('/users', protect, authorize('admin'), getUsers);
router.post('/users', protect, authorize('admin'), createUser);
router.put('/users/:id/role', protect, authorize('admin'), updateUserRole);
router.put('/users/:id/status', protect, authorize('admin'), updateUserStatus);
router.put('/users/:id/reset-password', protect, authorize('admin'), adminResetPassword);
router.put('/users/:id/manager', protect, authorize('admin'), updateUserManager);
router.put('/users/:id/app-permissions', protect, authorize('admin'), updateAppPermissions);
router.put('/users/:id/app-admin', protect, authorize('admin'), updateUserAppAdmin);
router.put('/users/:id/special-grants', protect, authorize('admin'), updateUserSpecialGrants);
router.put('/users/:id/owner', protect, authorize('admin'), updateUserOwnerStatus);
router.put('/users/:id/email', protect, authorize('admin'), updateUserEmail);
router.put('/users/:id/disable-2fa', protect, authorize('admin'), disableUser2FA);
router.put('/users/:id/profile', protect, authorize('admin'), adminUpdateUserProfile);

// Ma trận phân quyền thao tác (Base Account Operation Matrix)
router.get('/permissions/matrix', protect, getPermissionsMatrix);

// Quản lý Tài khoản Khách (Guest Accounts)
router.post('/guests', protect, authorize('admin', 'project_manager'), createGuest);
router.get('/guests', protect, getGuests);

module.exports = router;
