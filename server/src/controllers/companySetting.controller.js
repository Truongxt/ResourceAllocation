const CompanySetting = require('../models/CompanySetting');
const { logActivity } = require('../services/activityLog.service');

/**
 * @desc    Lấy cấu hình hệ thống / phân quyền Base Wework của công ty
 * @route   GET /api/company-settings
 * @access  Private
 */
const getCompanySettings = async (req, res, next) => {
  try {
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';

    let settings = await CompanySetting.findOne({ companyName: userCompany });
    if (!settings) {
      settings = await CompanySetting.create({
        companyName: userCompany,
        createProjectPermission: 'only_admin',
        createDepartmentPermission: 'only_admin',
      });
    }

    res.json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật cấu hình phân quyền Base Wework (Admin / System Owner / App Admin)
 * @route   PUT /api/company-settings
 * @access  Private/Admin
 */
const updateCompanySettings = async (req, res, next) => {
  try {
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';

    const isSystemOwner = Boolean(req.user?.isOwner);
    const isAdmin = req.user?.role === 'admin';
    const isWeworkAdmin = req.user?.appAdmins?.includes('work');

    if (!isSystemOwner && !isAdmin && !isWeworkAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Quản trị hệ thống (System Owner / Admin) hoặc Quản trị ứng dụng Wework mới có quyền tùy chỉnh cài đặt này.',
      });
    }

    const { createProjectPermission, createDepartmentPermission } = req.body;

    const updateData = {};
    if (createProjectPermission && ['only_admin', 'all_members'].includes(createProjectPermission)) {
      updateData.createProjectPermission = createProjectPermission;
    }
    if (createDepartmentPermission && ['only_admin', 'all_members'].includes(createDepartmentPermission)) {
      updateData.createDepartmentPermission = createDepartmentPermission;
    }

    let settings = await CompanySetting.findOneAndUpdate(
      { companyName: userCompany },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    await logActivity({
      req,
      action: 'UPDATE_SYSTEM_SETTINGS',
      entityType: 'system',
      entityId: settings._id,
      entityTitle: 'Phân quyền tạo phòng ban / dự án',
      description: `Cập nhật cấu hình phân quyền tạo dự án (${settings.createProjectPermission}) và phòng ban (${settings.createDepartmentPermission}) cho ${userCompany}`,
    });

    res.json({
      success: true,
      data: { settings },
      message: 'Cập nhật phân quyền tạo phòng ban / dự án thành công',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompanySettings,
  updateCompanySettings,
};
