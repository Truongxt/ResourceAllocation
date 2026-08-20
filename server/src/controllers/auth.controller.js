const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret, getAccessTokenExpire, getRefreshTokenDays } = require('../config/jwt');
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeToken,
  revokeAllForUser,
} = require('../services/refreshToken.service');

const REFRESH_COOKIE = 'rao_refresh';

/**
 * Generate JWT Token (access token — ngắn hạn, không thu hồi được)
 */
const generateToken = (id) => {
  return jwt.sign({ id }, getJwtSecret(), {
    expiresIn: getAccessTokenExpire(),
  });
};

/**
 * Refresh token đi bằng cookie `httpOnly`, KHÔNG trả trong body.
 *
 * Đây là điểm khác biệt đáng giá nhất so với việc chỉ kéo dài access token:
 * access token vẫn nằm trong `localStorage` như cũ (đánh đổi đã ghi trong tài liệu),
 * nhưng thứ sống lâu nhất — refresh token — thì JavaScript không đọc được, nên một
 * lỗ XSS không lấy được nó.
 *
 * `path` giới hạn ở `/api/auth` để cookie không bị gửi kèm mọi request khác.
 */
const setRefreshCookie = (res, value, expiresAt) => {
  res.cookie(REFRESH_COOKIE, value, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    path: '/api/auth',
    expires: expiresAt,
    maxAge: getRefreshTokenDays() * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    path: '/api/auth',
  });
};

/** Cấp cặp token cho một lần đăng nhập/đăng ký thành công. */
const issueSession = async (res, req, user) => {
  const { value, expiresAt } = await issueRefreshToken(user._id, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
  });
  setRefreshCookie(res, value, expiresAt);
  return generateToken(user._id);
};

/**
 * @desc    Đăng ký tài khoản mới
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'member',
    });

    // Generate token
    const token = await issueSession(res, req, user);

    res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đăng nhập
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu',
      });
    }

    // Check for user (include password for comparison)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng',
      });
    }

    // Generate token
    const token = await issueSession(res, req, user);

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy thông tin user hiện tại
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, department, avatar } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (department !== undefined) updateData.department = department;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      data: { user },
      message: 'Cập nhật profile thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đổi mật khẩu
 * @route   PUT /api/auth/password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Đổi mật khẩu thường là phản ứng với nghi ngờ bị lộ tài khoản. Nếu phiên cũ
    // vẫn sống thì thao tác đó gần như vô nghĩa — kẻ đang ở trong nhà không bị đuổi.
    // Thu hồi mọi refresh token rồi cấp phiên mới cho chính thiết bị đang thao tác.
    await revokeAllForUser(user._id, 'password_changed');
    const token = await issueSession(res, req, user);

    res.json({
      success: true,
      data: { token },
      message: 'Đổi mật khẩu thành công. Các phiên đăng nhập khác đã bị đăng xuất.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy danh sách tất cả users (Admin only)
 * @route   GET /api/auth/users
 * @access  Private/Admin
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort('-createdAt');

    res.json({
      success: true,
      count: users.length,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đổi refresh token lấy access token mới
 * @route   POST /api/auth/refresh
 * @access  Public (xác thực bằng cookie, không cần access token)
 */
const refresh = async (req, res, next) => {
  try {
    const presented = req.cookies?.[REFRESH_COOKIE];

    const result = await rotateRefreshToken(presented, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
    });

    if (!result.ok) {
      // Xóa cookie hỏng để trình duyệt khỏi thử lại vô hạn.
      clearRefreshCookie(res);

      const message =
        result.status === 'reused'
          ? 'Phiên đăng nhập đã bị thu hồi vì phát hiện dấu hiệu token bị đánh cắp. Vui lòng đăng nhập lại.'
          : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';

      return res.status(401).json({ success: false, message, reason: result.status });
    }

    const user = await User.findById(result.userId);
    if (!user || !user.isActive) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Tài khoản không còn hiệu lực' });
    }

    setRefreshCookie(res, result.value, result.expiresAt);

    res.json({
      success: true,
      data: { user: user.toJSON(), token: generateToken(user._id) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đăng xuất thiết bị hiện tại
 * @route   POST /api/auth/logout
 * @access  Public (chỉ cần cookie)
 */
const logout = async (req, res, next) => {
  try {
    await revokeToken(req.cookies?.[REFRESH_COOKIE], 'logout');
    clearRefreshCookie(res);
    res.json({ success: true, message: 'Đã đăng xuất' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đăng xuất khỏi mọi thiết bị
 * @route   POST /api/auth/logout-all
 * @access  Private
 */
const logoutAll = async (req, res, next) => {
  try {
    const result = await revokeAllForUser(req.user._id, 'logout_all');
    clearRefreshCookie(res);
    res.json({
      success: true,
      message: `Đã đăng xuất khỏi ${result.modifiedCount} phiên`,
      data: { revokedCount: result.modifiedCount },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getUsers,
  refresh,
  logout,
  logoutAll,
};
