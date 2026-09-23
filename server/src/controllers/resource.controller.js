const Resource = require('../models/Resource');
const Task = require('../models/Task');
const User = require('../models/User');
const Project = require('../models/Project');
const Department = require('../models/Department');
const { logActivity } = require('../services/activityLog.service');
const { syncResourceWorkload } = require('../services/workload.service');
const { generateEmployeeId } = require('../utils/employeeId.util');

const validateDepartment = async (departmentName, companyName = 'Công ty Công nghệ RAO') => {
  if (!departmentName) return null;
  const isObjectId = mongoose.Types.ObjectId.isValid(departmentName);
  return Department.findOne({
    $or: [
      { name: departmentName },
      ...(isObjectId ? [{ _id: departmentName }] : []),
    ],
    isActive: true,
    companyName: { $in: [companyName, 'Công ty Công nghệ RAO'] },
  }).select('_id name');
};

/**
 * @desc    Lấy danh sách nhân sự (filter, search, pagination)
 * @route   GET /api/resources
 * @access  Private
 */
const getResources = async (req, res, next) => {
  try {
    const filter = {};
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (userCompany === 'Công ty Công nghệ RAO') {
      filter.companyName = { $in: [userCompany, null, undefined] };
    } else {
      filter.companyName = userCompany;
    }

    if (req.user && req.user.role !== 'admin' && !req.user.isOwner) {
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
      const matchedUsers = await User.find({
        companyName: userCompany === 'Công ty Công nghệ RAO' ? { $in: [userCompany, null, undefined] } : userCompany,
        $or: [{ name: regex }, { email: regex }],
      }).select('_id');
      const matchedUserIds = matchedUsers.map((u) => u._id);

      const searchOr = [
        { position: regex },
        { department: regex },
        { employeeId: regex },
        { user: { $in: matchedUserIds } },
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

    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (resource.companyName && resource.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền xem nhân sự của công ty khác',
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
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';

    const department = await validateDepartment(resourceData.department, userCompany);
    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Phòng ban không hợp lệ hoặc chưa được tạo',
      });
    }
    resourceData.department = department.name;

    if (!linkedUserId && (newUser || resourceData.name)) {
      const uName = (newUser && newUser.name) || resourceData.name;
      const uEmail = (newUser && newUser.email) || resourceData.email || `nv_${Date.now()}@rao.com`;
      const uPassword = (newUser && newUser.password) || 'password123';
      const uRole = (newUser && newUser.role) || 'member';

      let existingUser = await User.findOne({ email: uEmail });
      if (existingUser) {
        linkedUserId = existingUser._id;
      } else {
        createdUser = await User.create({
          name: uName,
          email: uEmail,
          password: uPassword,
          role: uRole,
          department: department.name,
          companyName: userCompany,
        });
        linkedUserId = createdUser._id;
      }
    }

    const linkedUser = await User.findById(linkedUserId);
    if (!linkedUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản liên kết',
      });
    }

    if (linkedUser.companyName && linkedUser.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không thể thêm nhân sự từ công ty khác',
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
    const resource = await Resource.create({
      ...resourceData,
      user: linkedUserId,
      companyName: userCompany,
      createdBy: req.user._id,
    });
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

    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (resource.companyName && resource.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thao tác trên nhân sự của công ty khác',
      });
    }

    const updateData = { ...req.body };
    const newName = updateData.name;
    const newEmail = updateData.email;
    delete updateData.name;
    delete updateData.email;
    delete updateData.user; // Cannot change user link
    delete updateData.employeeId; // Employee code is system-generated

    if (updateData.department !== undefined) {
      const department = await validateDepartment(updateData.department, userCompany);
      if (!department) {
        return res.status(400).json({
          success: false,
          message: 'Phòng ban không hợp lệ hoặc chưa được tạo',
        });
      }
      updateData.department = department.name;
    }

    if (resource.user && (newName || newEmail)) {
      const userUpdate = {};
      if (newName) userUpdate.name = newName;
      if (newEmail) userUpdate.email = newEmail;
      await User.findByIdAndUpdate(resource.user, userUpdate);
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

    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (resource.companyName && resource.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thao tác trên nhân sự của công ty khác',
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

    // Đọc trước rồi mới ghi. `findByIdAndUpdate` gộp hai bước làm một nên không
    // còn chỗ chen kiểm tra công ty vào — và đó đúng là cách endpoint này từng
    // cho admin công ty khác xóa sạch kỹ năng nhân sự của mình.
    const existing = await Resource.findById(req.params.id).select('companyName');
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân sự',
      });
    }

    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (existing.companyName && existing.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thao tác trên nhân sự của công ty khác',
      });
    }

    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { skills },
      { new: true, runValidators: true }
    ).populate('user', 'name email avatar role');

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

/**
 * @desc    Nhân viên tự đánh giá kỹ năng của bản thân (Self-Assessment)
 * @route   PUT /api/resources/my-evaluation
 * @access  Private
 */
const selfEvaluate = async (req, res, next) => {
  try {
    const { skills } = req.body;
    if (!Array.isArray(skills)) {
      return res.status(400).json({ success: false, message: 'Skills phải là một mảng' });
    }

    const resource = await Resource.findOne({ user: req.user._id });
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhân sự của bạn' });
    }

    const updatedSkills = [...(resource.skills || [])];
    skills.forEach((inputSkill) => {
      if (!inputSkill.name || !inputSkill.name.trim()) return;
      const idx = updatedSkills.findIndex(
        (s) => s.name.trim().toLowerCase() === inputSkill.name.trim().toLowerCase()
      );
      const sLevel = Number(inputSkill.selfLevel || inputSkill.level) || 1;
      const yExp = Number(inputSkill.yearsOfExperience) || 0;

      if (idx >= 0) {
        updatedSkills[idx].selfLevel = sLevel;
        updatedSkills[idx].yearsOfExperience = yExp || updatedSkills[idx].yearsOfExperience;
        updatedSkills[idx].evaluationStatus = 'self_assessed';
        if (!updatedSkills[idx].managerLevel) {
          updatedSkills[idx].level = sLevel;
        }
      } else {
        updatedSkills.push({
          name: inputSkill.name.trim(),
          level: sLevel,
          selfLevel: sLevel,
          yearsOfExperience: yExp,
          evaluationStatus: 'self_assessed',
        });
      }
    });

    resource.skills = updatedSkills;
    await resource.save();

    await logActivity({
      req,
      action: 'UPDATE_SKILLS',
      entityType: 'resource',
      entityId: resource._id,
      description: `${req.user.name || 'Nhân sự'} gửi bản tự đánh giá năng lực (${skills.length} kỹ năng)`,
      details: { skillsCount: skills.length },
    });

    res.json({
      success: true,
      message: 'Gửi bản tự đánh giá năng lực thành công',
      data: { resource },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Quản lý đánh giá lại, điều chỉnh và duyệt ma trận kỹ năng của nhân sự
 * @route   PUT /api/resources/:id/manager-evaluation
 * @access  Private (Admin, PM)
 */
const managerEvaluate = async (req, res, next) => {
  try {
    const { skills, performanceRating, performanceNotes } = req.body;
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân sự' });
    }

    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (resource.companyName && resource.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Không có quyền thao tác trên nhân sự công ty khác' });
    }

    if (Array.isArray(skills)) {
      const currentSkills = [...(resource.skills || [])];
      skills.forEach((inputSkill) => {
        if (!inputSkill.name || !inputSkill.name.trim()) return;
        const idx = currentSkills.findIndex(
          (s) => s.name.trim().toLowerCase() === inputSkill.name.trim().toLowerCase()
        );
        const mLevel = Number(inputSkill.managerLevel || inputSkill.level) || 1;
        const feedback = inputSkill.managerFeedback || '';

        if (idx >= 0) {
          currentSkills[idx].managerLevel = mLevel;
          currentSkills[idx].level = mLevel;
          currentSkills[idx].managerFeedback = feedback;
          currentSkills[idx].evaluationStatus = 'approved';
          currentSkills[idx].evaluatedAt = new Date();
          currentSkills[idx].evaluatedBy = req.user._id;
        } else {
          currentSkills.push({
            name: inputSkill.name.trim(),
            level: mLevel,
            selfLevel: inputSkill.selfLevel || mLevel,
            managerLevel: mLevel,
            yearsOfExperience: Number(inputSkill.yearsOfExperience) || 0,
            managerFeedback: feedback,
            evaluationStatus: 'approved',
            evaluatedAt: new Date(),
            evaluatedBy: req.user._id,
          });
        }
      });
      resource.skills = currentSkills;
    }

    if (performanceRating !== undefined && performanceRating !== null) {
      resource.performanceRating = Math.min(5, Math.max(1, Number(performanceRating) || 4.5));
    }
    if (performanceNotes !== undefined) {
      resource.performanceNotes = performanceNotes;
    }

    await resource.save();

    await logActivity({
      req,
      action: 'UPDATE_SKILLS',
      entityType: 'resource',
      entityId: resource._id,
      description: `Quản lý ${req.user.name} đã đánh giá và duyệt năng lực cho nhân sự ${resource.employeeId || resource.position}`,
      details: { performanceRating: resource.performanceRating },
    });

    const populated = await Resource.findById(resource._id).populate('user', 'name email avatar role');
    res.json({
      success: true,
      message: 'Đánh giá và phê duyệt năng lực nhân sự thành công',
      data: { resource: populated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy dữ liệu tổng hợp Năng suất & Tải trọng (Sơ đồ cột Xanh / Vàng / Đỏ theo Nhân sự & Phòng ban)
 * @route   GET /api/resources/productivity/summary
 * @access  Private
 */
const getProductivitySummary = async (req, res, next) => {
  try {
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    const filter = { isActive: true };
    if (userCompany === 'Công ty Công nghệ RAO') {
      filter.companyName = { $in: [userCompany, null, undefined] };
    } else {
      filter.companyName = userCompany;
    }

    const resources = await Resource.find(filter)
      .populate('user', 'name email avatar role')
      .lean();

    const resourceUserIds = resources.map((r) => r.user?._id).filter(Boolean);

    // Lấy thống kê task theo nhân sự
    const taskAgg = await Task.aggregate([
      { $match: { assignee: { $in: resourceUserIds } } },
      {
        $group: {
          _id: '$assignee',
          totalTasks: { $sum: 1 },
          doneTasks: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
          failedTasks: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          activeTasks: { $sum: { $cond: [{ $in: ['$status', ['todo', 'in_progress', 'review']] }, 1, 0] } },
          totalEstimatedHours: { $sum: '$estimatedHours' },
          totalActualHours: { $sum: '$actualHours' },
          onTimeTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'done'] },
                    { $ne: [{ $ifNull: ['$completedAt', null] }, null] },
                    { $ne: [{ $ifNull: ['$endDate', null] }, null] },
                    { $lte: ['$completedAt', '$endDate'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const taskMap = new Map();
    taskAgg.forEach((t) => taskMap.set(t._id.toString(), t));

    // Xử lý từng nhân sự
    const personnelList = resources.map((r) => {
      const uId = r.user?._id?.toString();
      const tStats = uId ? taskMap.get(uId) : null;
      const capacity = (r.maxCapacity || 40) * (r.fte || 1);
      const workload = r.currentWorkload || 0;
      const utilizationRate = capacity > 0 ? Math.round((workload / capacity) * 100) : 0;

      const totalTasks = tStats?.totalTasks || 0;
      const doneTasks = tStats?.doneTasks || 0;
      const activeTasks = tStats?.activeTasks || 0;
      const failedTasks = tStats?.failedTasks || 0;
      const onTimeTasks = tStats?.onTimeTasks || 0;
      const onTimeRate = doneTasks > 0 ? Math.round((onTimeTasks / doneTasks) * 100) : 100;
      const failedRate = totalTasks > 0 ? Math.round((failedTasks / totalTasks) * 100) : 0;

      // Tính điểm năng suất: kết hợp % hoàn thành đúng hạn và rating
      const productivityScore = Math.min(
        100,
        Math.round((onTimeRate * 0.6) + ((r.performanceRating || 4.5) / 5 * 40))
      );

      // Mã màu trực quan:
      // 🟢 Xanh: Tải tối ưu 60% - 85% và năng suất tốt
      // 🟡 Vàng: Tải thấp < 50% (Underload) HOẶC 86% - 100% (Tiệm cận ngưỡng)
      // 🔴 Đỏ: Quá tải > 100% HOẶC tỷ lệ thất bại cao > 30%
      let statusCode = 'green';
      let statusLabel = 'Tối ưu (Năng suất tốt)';
      let color = '#10b981'; // Green

      if (utilizationRate > 100 || failedRate > 30) {
        statusCode = 'red';
        statusLabel = 'Quá tải (Cần san tải việc)';
        color = '#ef4444'; // Red
      } else if (utilizationRate < 50) {
        statusCode = 'yellow';
        statusLabel = 'Nhàn rỗi (Dưới công suất)';
        color = '#f59e0b'; // Amber / Yellow
      } else if (utilizationRate > 85) {
        statusCode = 'yellow';
        statusLabel = 'Tiệm cận tối đa (Theo dõi sát)';
        color = '#f59e0b';
      }

      return {
        _id: r._id,
        userId: uId,
        employeeId: r.employeeId || 'NV',
        name: r.user?.name || r.position,
        email: r.user?.email || '',
        avatar: r.user?.avatar || '',
        position: r.position,
        department: r.department || 'Chung',
        capacity,
        workload,
        unscheduledWorkload: r.unscheduledWorkload || 0,
        utilizationRate,
        statusCode,
        statusLabel,
        color,
        performanceRating: r.performanceRating || 4.5,
        productivityScore,
        totalTasks,
        activeTasks,
        doneTasks,
        failedTasks,
        onTimeRate,
        skills: r.skills || [],
        needsRebalance: statusCode === 'red',
      };
    });

    // Gom nhóm theo Phòng ban
    const deptMap = new Map();
    personnelList.forEach((p) => {
      const deptName = p.department || 'Chung';
      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, {
          name: deptName,
          totalCapacity: 0,
          totalWorkload: 0,
          personnelCount: 0,
          overloadedCount: 0,
          underloadedCount: 0,
          optimalCount: 0,
          totalActiveTasks: 0,
          avgProductivity: 0,
          sumProductivity: 0,
          members: [],
        });
      }
      const d = deptMap.get(deptName);
      d.totalCapacity += p.capacity;
      d.totalWorkload += p.workload;
      d.personnelCount += 1;
      d.totalActiveTasks += p.activeTasks;
      d.sumProductivity += p.productivityScore;
      d.members.push(p);

      if (p.statusCode === 'red') d.overloadedCount += 1;
      else if (p.statusCode === 'yellow' && p.utilizationRate < 50) d.underloadedCount += 1;
      else d.optimalCount += 1;
    });

    const departmentList = Array.from(deptMap.values()).map((d) => {
      const utilizationRate = d.totalCapacity > 0 ? Math.round((d.totalWorkload / d.totalCapacity) * 100) : 0;
      const avgProductivity = d.personnelCount > 0 ? Math.round(d.sumProductivity / d.personnelCount) : 0;

      let statusCode = 'green';
      let statusLabel = 'Hoạt động tối ưu';
      let color = '#10b981';

      if (utilizationRate > 100 || (d.overloadedCount > 0 && d.overloadedCount >= d.personnelCount / 2)) {
        statusCode = 'red';
        statusLabel = 'Phòng ban Quá tải (Cần điều phối)';
        color = '#ef4444';
      } else if (utilizationRate < 50) {
        statusCode = 'yellow';
        statusLabel = 'Dưới công suất (Có thể nhận thêm việc)';
        color = '#f59e0b';
      } else if (utilizationRate > 85) {
        statusCode = 'yellow';
        statusLabel = 'Tiệm cận công suất tối đa';
        color = '#f59e0b';
      }

      return {
        ...d,
        utilizationRate,
        avgProductivity,
        statusCode,
        statusLabel,
        color,
        needsRebalance: statusCode === 'red',
      };
    });

    res.json({
      success: true,
      data: {
        personnel: personnelList,
        departments: departmentList,
        summary: {
          totalPersonnel: personnelList.length,
          totalDepartments: departmentList.length,
          greenCount: personnelList.filter((p) => p.statusCode === 'green').length,
          yellowCount: personnelList.filter((p) => p.statusCode === 'yellow').length,
          redCount: personnelList.filter((p) => p.statusCode === 'red').length,
          avgUtilization:
            personnelList.length > 0
              ? Math.round(personnelList.reduce((s, p) => s + p.utilizationRate, 0) / personnelList.length)
              : 0,
        },
      },
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
  selfEvaluate,
  managerEvaluate,
  getProductivitySummary,
  recalculateWorkload,
  getResourceSummary,
  getMyLeaves,
  addMyLeave,
  deleteMyLeave,
};
