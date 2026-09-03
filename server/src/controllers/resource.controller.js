const Resource = require('../models/Resource');
const Task = require('../models/Task');
const User = require('../models/User');
const Project = require('../models/Project');
const Department = require('../models/Department');
const { logActivity } = require('../services/activityLog.service');
const { syncResourceWorkload } = require('../services/workload.service');
const { generateEmployeeId } = require('../utils/employeeId.util');

const validateDepartment = async (departmentName) => {
  if (!departmentName) return null;
  return Department.findOne({ name: departmentName, isActive: true }).select('_id name');
};

/**
 * @desc    Lấy danh sách nhân sự (filter, search, pagination)
 * @route   GET /api/resources
 * @access  Private
 */
const getResources = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user && req.user.role !== 'admin') {
      const userProjects = await Project.find({
        $or: [
          { manager: req.user._id },
          { 'members.user': req.user._id },
          { createdBy: req.user._id },
        ],
      }).select('members');

      const allowedUserIds = new Set();
      allowedUserIds.add(req.user._id.toString());
      userProjects.forEach((p) => {
        if (p.members) {
          p.members.forEach((m) => {
            if (m.user) allowedUserIds.add(m.user.toString());
          });
        }
      });

      filter.$or = [
        { user: { $in: Array.from(allowedUserIds) } },
        { createdBy: req.user._id },
      ];
    }

    if (req.query.department) filter.department = req.query.department;
    if (req.query.availability) filter.availability = req.query.availability;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    // Skill search: ?skill=React&skillLevel=3
    if (req.query.skill) {
      const skillFilter = { 'skills.name': new RegExp(req.query.skill, 'i') };
      if (req.query.skillLevel) {
        skillFilter['skills.level'] = { $gte: parseInt(req.query.skillLevel, 10) };
      }
      Object.assign(filter, skillFilter);
    }

    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      const searchOr = [
        { position: regex },
        { department: regex },
        { employeeId: regex },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const skip = (page - 1) * limit;
    const sort = req.query.sort || '-createdAt';

    const [resources, total] = await Promise.all([
      Resource.find(filter)
        .populate('user', 'name email avatar role')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Resource.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: resources.length,
      total,
      pagination: { page, limit, pages: Math.ceil(total / limit) || 1 },
      data: { resources },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy chi tiết nhân sự theo ID (kèm assignments)
 * @route   GET /api/resources/:id
 * @access  Private
 */
const getResourceById = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('user', 'name email avatar role');

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân sự',
      });
    }

    // Get current assignments
    const assignments = await Task.find({
      assignee: resource.user,
      status: { $in: ['todo', 'in_progress', 'review'] },
    })
      .populate('project', 'name code')
      .select('title status priority startDate endDate estimatedHours project');

    res.json({
      success: true,
      data: {
        resource,
        assignments,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tạo nhân sự mới
 * @route   POST /api/resources
 * @access  Private (Admin, PM)
 */
const createResource = async (req, res, next) => {
  let createdUser = null;
  let resourceCreated = false;

  try {
    const { user, newUser, ...resourceData } = req.body;
    let linkedUserId = user;

    const department = await validateDepartment(resourceData.department);
    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Phòng ban không hợp lệ hoặc chưa được tạo',
      });
    }

    if (!linkedUserId && newUser) {
      const existingUser = await User.findOne({ email: newUser.email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được sử dụng',
        });
      }

      createdUser = await User.create({
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role || 'member',
        department: resourceData.department,
      });
      linkedUserId = createdUser._id;
    }

    const linkedUser = await User.findById(linkedUserId);
    if (!linkedUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản liên kết',
      });
    }

    const existing = await Resource.findOne({ user: linkedUserId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Nhân sự đã tồn tại cho tài khoản này',
      });
    }

    delete resourceData.employeeId;
    resourceData.employeeId = await generateEmployeeId();
    const resource = await Resource.create({ ...resourceData, user: linkedUserId, createdBy: req.user._id });
    resourceCreated = true;

    const populated = await Resource.findById(resource._id)
      .populate('user', 'name email avatar role');

    res.status(201).json({
      success: true,
      data: { resource: populated },
      message: 'Thêm nhân sự thành công',
    });
  } catch (error) {
    if (createdUser?._id && !resourceCreated) {
      await User.findByIdAndDelete(createdUser._id).catch(() => null);
    }
    next(error);
  }
};

/**
 * @desc    Cập nhật nhân sự
 * @route   PUT /api/resources/:id
 * @access  Private (Admin, PM)
 */
const updateResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân sự',
      });
    }

    const updateData = { ...req.body };
    delete updateData.user; // Cannot change user link
    delete updateData.employeeId; // Employee code is system-generated

    if (updateData.department !== undefined) {
      const department = await validateDepartment(updateData.department);
      if (!department) {
        return res.status(400).json({
          success: false,
          message: 'Phòng ban không hợp lệ hoặc chưa được tạo',
        });
      }
    }

    const updated = await Resource.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('user', 'name email avatar role');

    res.json({
      success: true,
      data: { resource: updated },
      message: 'Cập nhật nhân sự thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa nhân sự
 * @route   DELETE /api/resources/:id
 * @access  Private (Admin)
 */
const deleteResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân sự',
      });
    }

    const deletedName = resource.employeeId || resource.position;

    // Hủy phân công ở các task đang được gán cho nhân sự này để tránh dữ liệu mồ côi
    if (resource.user) {
      await Task.updateMany({ assignee: resource.user }, { assignee: null });
    }

    await resource.deleteOne();

    await logActivity({
      req,
      action: 'DELETE_RESOURCE',
      entityType: 'resource',
      entityId: req.params.id,
      entityTitle: deletedName,
      description: `Xóa nhân sự ${deletedName}`,
      details: { department: resource.department, position: resource.position },
    });

    res.json({
      success: true,
      data: { id: req.params.id },
      message: 'Xóa nhân sự thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật skills cho nhân sự
 * @route   PUT /api/resources/:id/skills
 * @access  Private
 */
const updateSkills = async (req, res, next) => {
  try {
    const { skills } = req.body;
    if (!Array.isArray(skills)) {
      return res.status(400).json({
        success: false,
        message: 'Skills phải là một mảng',
      });
    }

    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { skills },
      { new: true, runValidators: true }
    ).populate('user', 'name email avatar role');

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân sự',
      });
    }

    res.json({
      success: true,
      data: { resource },
      message: 'Cập nhật kỹ năng thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tính toán workload cho tất cả nhân sự
 * @route   POST /api/resources/recalculate-workload
 * @access  Private (Admin)
 */
const recalculateWorkload = async (req, res, next) => {
  try {
    const count = await syncResourceWorkload();

    await logActivity({
      req,
      action: 'RECALCULATE_WORKLOAD',
      entityType: 'resource',
      description: `Tính lại workload cho ${count} nhân sự`,
      details: { resourceCount: count },
    });

    res.json({
      success: true,
      message: `Đã tính toán lại workload cho ${count} nhân sự`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy thống kê tổng quan nhân sự
 * @route   GET /api/resources/stats/summary
 * @access  Private
 */
const getResourceSummary = async (req, res, next) => {
  try {
    const [availabilityStats, departmentStats, totals] = await Promise.all([
      Resource.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$availability', count: { $sum: 1 } } },
      ]),
      Resource.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
      ]),
      Resource.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalResources: { $sum: 1 },
            totalCapacity: { $sum: '$maxCapacity' },
            totalWorkload: { $sum: '$currentWorkload' },
            avgFte: { $avg: '$fte' },
          },
        },
      ]),
    ]);

    const t = totals[0] || { totalResources: 0, totalCapacity: 0, totalWorkload: 0, avgFte: 0 };
    const avgUtilization = t.totalCapacity > 0 ? Math.round((t.totalWorkload / t.totalCapacity) * 100) : 0;

    res.json({
      success: true,
      data: {
        totals: { ...t, avgUtilization },
        byAvailability: availabilityStats,
        byDepartment: departmentStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy lịch nghỉ phép của user hiện tại
 * @route   GET /api/resources/me/leaves
 * @access  Private
 */
const getMyLeaves = async (req, res, next) => {
  try {
    const resource = await Resource.findOne({ user: req.user._id });
    if (!resource) {
      return res.json({ success: true, data: { leaves: [] } });
    }

    const leaves = (resource.unavailablePeriods || [])
      .slice()
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    res.json({
      success: true,
      data: { leaves },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đăng ký lịch nghỉ phép mới cho user hiện tại
 * @route   POST /api/resources/me/leaves
 * @access  Private
 */
const addMyLeave = async (req, res, next) => {
  try {
    const { startDate, endDate, reason } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ngày bắt đầu và ngày kết thúc',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Định dạng ngày không hợp lệ' });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'Ngày kết thúc không được nhỏ hơn ngày bắt đầu',
      });
    }

    let resource = await Resource.findOne({ user: req.user._id });
    if (!resource) {
      resource = await Resource.create({
        user: req.user._id,
        position: req.user.role === 'project_manager' ? 'Project Manager' : 'Developer',
        department: 'Kỹ thuật',
        maxCapacity: 40,
        fte: 1.0,
        currentWorkload: 0,
        availability: 'available',
        createdBy: req.user._id,
      });
    }

    resource.unavailablePeriods.push({
      startDate: start,
      endDate: end,
      reason: reason?.trim() || 'Nghỉ phép',
    });

    resource.unavailablePeriods.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    await resource.save();

    await logActivity({
      req,
      action: 'ADD_LEAVE',
      entityType: 'resource',
      entityId: resource._id,
      description: `Đăng ký nghỉ phép từ ${start.toLocaleDateString('vi-VN')} đến ${end.toLocaleDateString('vi-VN')}`,
      details: { reason },
    });

    res.status(201).json({
      success: true,
      message: 'Đăng ký lịch nghỉ phép thành công',
      data: { leaves: resource.unavailablePeriods },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Hủy/xóa lịch nghỉ phép của user hiện tại
 * @route   DELETE /api/resources/me/leaves/:leaveId
 * @access  Private
 */
const deleteMyLeave = async (req, res, next) => {
  try {
    const { leaveId } = req.params;
    const resource = await Resource.findOne({ user: req.user._id });

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhân sự' });
    }

    const initialLength = resource.unavailablePeriods.length;
    resource.unavailablePeriods = resource.unavailablePeriods.filter(
      (p) => p._id && p._id.toString() !== leaveId
    );

    if (resource.unavailablePeriods.length === initialLength) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ nghỉ cần xóa' });
    }

    await resource.save();

    res.json({
      success: true,
      message: 'Hủy lịch nghỉ phép thành công',
      data: { leaves: resource.unavailablePeriods },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  updateSkills,
  recalculateWorkload,
  getResourceSummary,
  getMyLeaves,
  addMyLeave,
  deleteMyLeave,
};
