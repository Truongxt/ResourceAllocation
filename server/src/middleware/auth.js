const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../config/jwt');

/**
 * Middleware: Xác thực JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Không có quyền truy cập. Vui lòng đăng nhập.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, getJwtSecret());
    
    // Get user from token
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ hoặc tài khoản đã bị vô hiệu hóa.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn.',
    });
  }
};

/**
 * Middleware: Phân quyền theo role
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user.isOwner && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Vai trò '${req.user.role}' không có quyền thực hiện hành động này.`,
      });
    }
    next();
  };
};

/**
 * Middleware: Phân quyền Quản trị ứng dụng (App Admin)
 * Cho phép:
 * 1. Quản trị cấp cao (Owner: isOwner === true)
 * 2. Quản trị viên hệ thống (Admin: role === 'admin')
 * 3. Người dùng được cấp quyền App Admin cho ứng dụng tương ứng (appAdmins.includes(appKey))
 */
const authorizeApp = (appKey) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Không có quyền truy cập. Vui lòng đăng nhập.',
      });
    }

    const isOwner = Boolean(req.user.isOwner);
    const isAdmin = req.user.role === 'admin';
    const isAppAdmin = Array.isArray(req.user.appAdmins) && req.user.appAdmins.includes(appKey);

    if (!isOwner && !isAdmin && !isAppAdmin) {
      const appName = appKey === 'optimize' ? 'Base Optimize+' : `ứng dụng ${appKey}`;
      return res.status(403).json({
        success: false,
        message: `Bạn chưa được cấp quyền Quản trị ứng dụng (App Admin) cho ${appName}. Vui lòng liên hệ Quản trị viên cấp cao (Owner) để được cấp quyền.`,
      });
    }

    next();
  };
};

const APP_PERMISSION_RANK = { none: 0, view: 1, manage: 2 };

/**
 * Middleware: Quyền truy cập theo phân hệ (`User.appPermissions`, chỉnh ở tab
 * "Phân quyền Thao tác & Ứng dụng"). Khác với `authorizeApp` (dựa trên
 * `appAdmins`) — đây là quyền xem/sửa theo từng phân hệ nghiệp vụ
 * (projects/tasks/reports…), áp dụng cho mọi người dùng chứ không riêng App Admin.
 *
 * Không set giá trị cho `moduleKey` (tài khoản tạo trước khi có UI này) được coi
 * như 'manage' — không đổi hành vi của tài khoản hiện có, chỉ khi Admin chủ động
 * hạ quyền qua UI thì hạn chế mới có tác dụng.
 */
const requireAppPermission = (moduleKey) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Không có quyền truy cập. Vui lòng đăng nhập.',
      });
    }
    if (req.user.isOwner) return next();

    const level = req.user.appPermissions?.[moduleKey] ?? 'manage';
    const rank = APP_PERMISSION_RANK[level] ?? APP_PERMISSION_RANK.manage;
    const needed = ['GET', 'HEAD'].includes(req.method) ? APP_PERMISSION_RANK.view : APP_PERMISSION_RANK.manage;

    if (rank < needed) {
      return res.status(403).json({
        success: false,
        message: needed === APP_PERMISSION_RANK.manage
          ? 'Bạn chỉ được xem ở phân hệ này, không có quyền chỉnh sửa.'
          : 'Bạn không có quyền truy cập phân hệ này.',
      });
    }
    next();
  };
};

module.exports = { protect, authorize, authorizeApp, requireAppPermission };

