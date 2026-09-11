const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Resource = require('../models/Resource');
const Department = require('../models/Department');
const RefreshToken = require('../models/RefreshToken');
const { getJwtSecret, getAccessTokenExpire, getRefreshTokenDays } = require('../config/jwt');
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeToken,
  revokeAllForUser,
} = require('../services/refreshToken.service');
const { generateEmployeeId } = require('../utils/employeeId.util');

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
    const {
      name,
      email,
      password,
      role,
      phone,
      companyName,
      jobTitle,
      companySize,
      interestedProduct,
      location,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng',
      });
    }

    // Khi người dùng đăng ký Demo Doanh Nghiệp (có companyName):
    // Họ chính là Quản trị cấp cao (Owner) & Admin hệ thống của công ty đó!
    let userRole = role;
    let isOwner = false;
    const finalCompanyName = (companyName && companyName.trim()) ? companyName.trim() : 'Công ty Công nghệ RAO';

    if (companyName && companyName.trim()) {
      userRole = 'admin';
      isOwner = true;
    } else if (!userRole) {
      if (
        jobTitle &&
        (jobTitle.includes('CEO') ||
          jobTitle.includes('Giám đốc') ||
          jobTitle.includes('Manager') ||
          jobTitle.includes('Quản lý'))
      ) {
        userRole = 'project_manager';
      } else {
        userRole = 'member';
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      phone,
      companyName: finalCompanyName,
      jobTitle,
      companySize,
      interestedProduct,
      location,
      isOwner,
    });

    // Tự động tạo hồ sơ nhân sự mặc định cho tài khoản mới trong công ty đó
    try {
      const defaultDept = await Department.findOne({ isActive: true, companyName: finalCompanyName }).select('name')
        || await Department.findOne({ isActive: true }).select('name');
      const departmentName = defaultDept?.name || 'Ban Giám Đốc';
      const employeeId = await generateEmployeeId();

      await Resource.create({
        user: user._id,
        employeeId,
        position:
          jobTitle ||
          (userRole === 'project_manager'
            ? 'Project Manager'
            : userRole === 'admin'
            ? 'Quản trị viên'
            : 'Developer'),
        department: departmentName,
        companyName: finalCompanyName,
        maxCapacity: 40,
        fte: 1.0,
        currentWorkload: 0,
        availability: 'available',
        createdBy: user._id,
      });
    } catch (resourceErr) {
      console.error('Lỗi khi tự động tạo hồ sơ Resource cho user mới:', resourceErr.message);
    }

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
    const user = await User.findOne({ email })
      .select('+password')
      .populate('manager', 'name email avatar jobTitle');
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
    const user = await User.findById(req.user._id).populate('manager', 'name email avatar jobTitle');

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
    const { name, department, avatar, phone, jobTitle, companyName, manager, twoFactorEnabled } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (department !== undefined) updateData.department = department;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (phone !== undefined) updateData.phone = phone;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (manager !== undefined) updateData.manager = manager || null;
    if (twoFactorEnabled !== undefined) updateData.twoFactorEnabled = Boolean(twoFactorEnabled);

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    }).populate('manager', 'name email avatar jobTitle');

    // Đồng bộ chức danh và phòng ban sang Resource nếu có
    if (jobTitle || department) {
      const resUpdate = {};
      if (jobTitle) resUpdate.position = jobTitle;
      if (department) resUpdate.department = department;
      await Resource.findOneAndUpdate({ user: req.user._id }, resUpdate);
    }

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

// Tiện ích kiểm tra hai người dùng có thuộc cùng công ty không
const isSameCompany = (userA, userB) => {
  const compA = userA?.companyName || 'Công ty Công nghệ RAO';
  const compB = userB?.companyName || 'Công ty Công nghệ RAO';
  return compA === compB;
};

/**
 * @desc    Lấy danh sách tất cả users thuộc công ty của người đăng nhập (Admin only)
 * @route   GET /api/auth/users
 * @access  Private/Admin
 */
const getUsers = async (req, res, next) => {
  try {
    const userCompany = req.user.companyName || 'Công ty Công nghệ RAO';
    const filter = { companyName: userCompany };
    if (req.query.role) filter.role = req.query.role;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      filter.$and = [
        { companyName: userCompany },
        { $or: [{ name: regex }, { email: regex }, { phone: regex }, { jobTitle: regex }] },
      ];
      delete filter.companyName;
    }

    const users = await User.find(filter)
      .populate('manager', 'name email avatar jobTitle')
      .sort('-createdAt');

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
 * @desc    Admin tạo tài khoản thành viên mới trong công ty của mình
 * @route   POST /api/auth/users
 * @access  Private/Admin
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, position, phone, jobTitle, manager } = req.body;
    const userCompany = req.user.companyName || 'Công ty Công nghệ RAO';

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng',
      });
    }

    const finalRole = role || 'member';
    const finalJobTitle = jobTitle || position || (finalRole === 'project_manager' ? 'Project Manager' : 'Developer');

    const user = await User.create({
      name,
      email,
      password: password || '123456',
      role: finalRole,
      department: department || 'Kỹ thuật',
      phone: phone || '',
      jobTitle: finalJobTitle,
      companyName: userCompany,
      manager: manager || null,
      isActive: true,
    });

    try {
      const employeeId = await generateEmployeeId();
      await Resource.create({
        user: user._id,
        employeeId,
        position: finalJobTitle,
        department: department || 'Kỹ thuật',
        companyName: userCompany,
        maxCapacity: 40,
        fte: 1.0,
        currentWorkload: 0,
        availability: 'available',
        createdBy: req.user._id,
      });
    } catch (err) {
      console.error('Lỗi khi tự động tạo Resource cho user:', err.message);
    }

    res.status(201).json({
      success: true,
      data: { user },
      message: 'Tạo tài khoản thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật vai trò người dùng (Chỉ Owner mới phân quyền Admin - help.base.vn/articles/63000253291)
 * @route   PUT /api/auth/users/:id/role
 * @access  Private/Admin
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'project_manager', 'member'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ' });
    }

    // Theo chuẩn Base Account: Cần là Quản trị cấp cao (Owner) mới có thể phân quyền tài khoản thành Quản trị hệ thống (Admin)
    if (role === 'admin' && !req.user.isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Quản trị cấp cao (Owner) mới có quyền phân quyền Quản trị hệ thống (Admin)',
      });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // Kiểm tra phân lập doanh nghiệp: Admin chỉ quản lý nhân sự cùng công ty
    if (!isSameCompany(req.user, targetUser)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thay đổi vai trò nhân sự của công ty khác',
      });
    }

    // Chỉ Owner mới có thể thay đổi vai trò của một tài khoản đang là Owner
    if (targetUser.isOwner && !req.user.isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Quản trị cấp cao (Owner) mới có quyền thay đổi vai trò của Quản trị cấp cao',
      });
    }

    targetUser.role = role;
    // Nếu bị hạ từ Admin xuống PM hoặc Member thì tự động gỡ cờ isOwner
    if (role !== 'admin' && targetUser.isOwner) {
      targetUser.isOwner = false;
    }
    await targetUser.save();

    res.json({ success: true, data: { user: targetUser }, message: 'Cập nhật vai trò thành công' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Vô hiệu hóa hoặc kích hoạt lại tài khoản (Admin only)
 * @route   PUT /api/auth/users/:id/status
 * @access  Private/Admin
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    if (!isSameCompany(req.user, targetUser)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên tài khoản của công ty khác' });
    }

    targetUser.isActive = Boolean(isActive);
    await targetUser.save();

    // Nếu vô hiệu hóa, thu hồi toàn bộ token phiên đăng nhập
    if (!isActive) {
      await revokeAllForUser(targetUser._id);
    }

    res.json({
      success: true,
      data: { user: targetUser },
      message: isActive ? 'Đã kích hoạt lại tài khoản' : 'Đã vô hiệu hóa tài khoản thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin đặt lại mật khẩu cho thành viên
 * @route   PUT /api/auth/users/:id/reset-password
 * @access  Private/Admin
 */
const adminResetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải từ 6 ký tự trở lên' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    if (!isSameCompany(req.user, user)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên tài khoản của công ty khác' });
    }

    user.password = newPassword;
    await user.save();
    await revokeAllForUser(user._id);

    res.json({ success: true, message: 'Đã đặt lại mật khẩu thành công' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật người quản lý trực tiếp (Admin only)
 * @route   PUT /api/auth/users/:id/manager
 * @access  Private/Admin
 */
const updateUserManager = async (req, res, next) => {
  try {
    const { managerId } = req.body;
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    if (!isSameCompany(req.user, targetUser)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên tài khoản của công ty khác' });
    }

    targetUser.manager = managerId || null;
    await targetUser.save();
    await targetUser.populate('manager', 'name email avatar jobTitle');

    res.json({ success: true, data: { user: targetUser }, message: 'Đã cập nhật quản lý trực tiếp' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật quyền truy cập phân hệ / ứng dụng (Admin only)
 * @route   PUT /api/auth/users/:id/app-permissions
 * @access  Private/Admin
 */
const updateAppPermissions = async (req, res, next) => {
  try {
    const { appPermissions } = req.body;
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    if (!isSameCompany(req.user, targetUser)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên tài khoản của công ty khác' });
    }

    targetUser.appPermissions = appPermissions;
    await targetUser.save();
    res.json({ success: true, data: { user: targetUser }, message: 'Đã cập nhật quyền phân hệ' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật thông tin cơ bản của thành viên (Admin/Owner - help.base.vn)
 * @route   PUT /api/auth/users/:id/profile
 * @access  Private/Admin
 */
const adminUpdateUserProfile = async (req, res, next) => {
  try {
    const { name, department, phone, jobTitle, companyName } = req.body;
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    if (!isSameCompany(req.user, targetUser)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên tài khoản của công ty khác' });
    }

    if (name) targetUser.name = name;
    if (department !== undefined) targetUser.department = department;
    if (phone !== undefined) targetUser.phone = phone;
    if (jobTitle !== undefined) targetUser.jobTitle = jobTitle;
    if (companyName !== undefined) targetUser.companyName = companyName;

    await targetUser.save();
    await targetUser.populate('manager', 'name email avatar jobTitle');

    if (jobTitle || department || name) {
      const resUpdate = {};
      if (jobTitle) resUpdate.position = jobTitle;
      if (department) resUpdate.department = department;
      if (name) resUpdate.name = name;
      await Resource.findOneAndUpdate({ user: targetUser._id }, resUpdate);
    }

    res.json({
      success: true,
      data: { user: targetUser },
      message: 'Cập nhật thông tin thành viên thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật quyền Quản trị cấp cao (Owner) (Chỉ Owner - help.base.vn/articles/63000253291)
 * @route   PUT /api/auth/users/:id/owner
 * @access  Private/Admin
 */
const updateUserOwnerStatus = async (req, res, next) => {
  try {
    const { isOwner } = req.body;
    // Cần là tài khoản Quản trị cấp cao (Owner) mới có thể phân quyền Owner
    if (!req.user.isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Quản trị cấp cao (Owner) mới có quyền phân quyền Quản trị cấp cao (Owner)',
      });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    if (!isSameCompany(req.user, targetUser)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên tài khoản của công ty khác' });
    }

    // Bảo vệ không cho phép hủy quyền Owner cuối cùng trong tổ chức/công ty đó
    if (!isOwner && req.user._id.toString() === req.params.id) {
      const otherOwner = await User.findOne({
        _id: { $ne: req.params.id },
        companyName: req.user.companyName || 'Công ty Công nghệ RAO',
        isOwner: true,
        isActive: true,
      });
      if (!otherOwner) {
        return res.status(400).json({
          success: false,
          message: 'Không thể hủy quyền của Quản trị cấp cao cuối cùng trong công ty',
        });
      }
    }

    targetUser.isOwner = Boolean(isOwner);
    if (isOwner) {
      targetUser.role = 'admin'; // Owner luôn đi kèm vai trò admin
    }
    await targetUser.save();

    res.json({
      success: true,
      data: { user: targetUser },
      message: isOwner ? 'Đã chọn làm Quản trị cấp cao (Owner)' : 'Đã hủy quyền Quản trị cấp cao',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Owner thay đổi email tài khoản (Chỉ Owner hoặc phân quyền đặc biệt 🔑 - help.base.vn)
 * @route   PUT /api/auth/users/:id/email
 * @access  Private/Admin
 */
const updateUserEmail = async (req, res, next) => {
  try {
    if (!req.user.isOwner && !(req.user.specialGrants || []).includes('can_change_email')) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Quản trị cấp cao (Owner) hoặc người được cấp quyền 🔑 mới có thể thay đổi email nhân sự',
      });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    if (!isSameCompany(req.user, targetUser)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên tài khoản của công ty khác' });
    }

    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Email không hợp lệ' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email này đã được sử dụng bởi tài khoản khác' });
    }

    targetUser.email = email.toLowerCase().trim();
    await targetUser.save();
    await Resource.updateOne({ user: targetUser._id }, { email: targetUser.email });

    res.json({
      success: true,
      data: { user: targetUser },
      message: 'Thay đổi email tài khoản thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Vô hiệu hóa bảo mật hai lớp (2FA) cho tài khoản (Chỉ Owner - help.base.vn)
 * @route   PUT /api/auth/users/:id/disable-2fa
 * @access  Private/Admin
 */
const disableUser2FA = async (req, res, next) => {
  try {
    if (!req.user.isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Quản trị cấp cao (Owner) mới có quyền vô hiệu hóa bảo mật 2 lớp của thành viên',
      });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    if (!isSameCompany(req.user, targetUser)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên tài khoản của công ty khác' });
    }

    targetUser.twoFactorEnabled = false;
    await targetUser.save();

    res.json({
      success: true,
      data: { user: targetUser },
      message: 'Đã vô hiệu hóa bảo mật 2 lớp cho tài khoản này',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy danh sách các phiên đăng nhập đang hoạt động của user hiện tại
 * @route   GET /api/auth/sessions
 * @access  Private
 */
const getSessions = async (req, res, next) => {
  try {
    const sessions = await RefreshToken.find({
      userId: req.user._id,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort('-createdAt');

    res.json({
      success: true,
      data: {
        sessions: sessions.map((s) => ({
          _id: s._id,
          ipAddress: s.ipAddress || '127.0.0.1',
          userAgent: s.userAgent || 'Unknown browser',
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Thu hồi 1 phiên đăng nhập cụ thể
 * @route   DELETE /api/auth/sessions/:id
 * @access  Private
 */
const revokeSession = async (req, res, next) => {
  try {
    const session = await RefreshToken.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên đăng nhập' });
    }

    session.revokedAt = new Date();
    session.revokedReason = 'user_revoked';
    await session.save();

    res.json({ success: true, message: 'Đã đăng xuất khỏi thiết bị thành công' });
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

    const user = await User.findById(result.userId).populate('manager', 'name email avatar jobTitle');
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

const { BASE_OPERATION_PERMISSIONS, BASE_APPS_CATALOG } = require('../utils/permissionMatrix');

/**
 * @desc    Lấy bảng ma trận phân quyền thao tác chi tiết (Base Account Matrix)
 * @route   GET /api/auth/permissions/matrix
 * @access  Private
 */
const getPermissionsMatrix = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        matrix: BASE_OPERATION_PERMISSIONS,
        catalog: BASE_APPS_CATALOG,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật danh sách ứng dụng mà người dùng làm App Admin (Chỉ Owner - help.base.vn)
 * @route   PUT /api/auth/users/:id/app-admin
 * @access  Private/Admin
 */
const updateUserAppAdmin = async (req, res, next) => {
  try {
    if (!req.user.isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Quản trị cấp cao (Owner) mới có quyền phân quyền Quản trị ứng dụng (App Admin)',
      });
    }

    const { appAdmins } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { appAdmins: Array.isArray(appAdmins) ? appAdmins : [] },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
    res.json({
      success: true,
      data: { user },
      message: 'Cập nhật quyền Quản trị Ứng dụng (App Admin) thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật quyền đặc biệt (Chìa khóa 🔑) cho người dùng
 * @route   PUT /api/auth/users/:id/special-grants
 * @access  Private/Admin
 */
const updateUserSpecialGrants = async (req, res, next) => {
  try {
    const { specialGrants } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { specialGrants: Array.isArray(specialGrants) ? specialGrants : [] },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
    res.json({
      success: true,
      data: { user },
      message: 'Cập nhật phân quyền đặc biệt thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tạo tài khoản khách (Guest Account)
 * @route   POST /api/auth/guests
 * @access  Private (Admin hoặc PM)
 */
const createGuest = async (req, res, next) => {
  try {
    const { name, email, password, companyName } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đủ họ tên, email và mật khẩu' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email đã được sử dụng' });
    }

    const guest = await User.create({
      name,
      email,
      password,
      role: 'member',
      isGuest: true,
      department: 'Đối tác / Khách mời',
      companyName: companyName || 'Khách hàng đối tác',
      jobTitle: 'Khách mời dự án (Guest)',
      isActive: true,
    });

    res.status(201).json({
      success: true,
      data: { guest },
      message: 'Đã tạo tài khoản khách thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy danh sách tài khoản khách (Guest Accounts)
 * @route   GET /api/auth/guests
 * @access  Private
 */
const getGuests = async (req, res, next) => {
  try {
    const guests = await User.find({ isGuest: true }).select('-password').sort({ createdAt: -1 });
    res.json({
      success: true,
      data: { guests, count: guests.length },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy danh sách các nhân sự/quản lý trong cùng công ty để gán Quản lý trực tiếp
 * @route   GET /api/auth/company-managers
 * @access  Private
 */
const getCompanyManagers = async (req, res, next) => {
  try {
    const userCompany = req.user?.companyName || 'Công ty Công nghệ RAO';
    const users = await User.find({
      companyName: userCompany,
      isActive: true,
    }).select('_id name email role jobTitle avatar department');

    res.json({
      success: true,
      data: { managers: users },
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
};
