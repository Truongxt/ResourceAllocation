const Resource = require('../models/Resource');
const Task = require('../models/Task');

/**
 * @desc    Lấy danh sách nhân sự (filter, search, pagination)
 * @route   GET /api/resources
 * @access  Private
 */
const getResources = async (req, res, next) => {
  try {
    const filter = {};

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
      filter.$or = [
        { position: regex },
        { department: regex },
        { employeeId: regex },
      ];
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
  try {
    // Check if resource already exists for this user
    if (req.body.user) {
      const existing = await Resource.findOne({ user: req.body.user });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Nhân sự đã tồn tại cho tài khoản này',
        });
      }
    }

    const resource = await Resource.create(req.body);

    const populated = await Resource.findById(resource._id)
      .populate('user', 'name email avatar role');

    res.status(201).json({
      success: true,
      data: { resource: populated },
      message: 'Thêm nhân sự thành công',
    });
  } catch (error) {
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

    await resource.deleteOne();

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
    const resources = await Resource.find({ isActive: true });

    for (const resource of resources) {
      const activeTasks = await Task.find({
        assignee: resource.user,
        status: { $in: ['in_progress', 'review'] },
      }).select('estimatedHours');

      const totalHours = activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

      // Assume weekly distribution: estimatedHours / assumed weeks
      resource.currentWorkload = totalHours;

      // Update availability
      const util = resource.maxCapacity > 0 ? totalHours / (resource.maxCapacity * resource.fte) : 0;
      if (util > 1) resource.availability = 'unavailable';
      else if (util > 0.7) resource.availability = 'partially_available';
      else resource.availability = 'available';

      await resource.save();
    }

    res.json({
      success: true,
      message: `Đã tính toán lại workload cho ${resources.length} nhân sự`,
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

module.exports = {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  updateSkills,
  recalculateWorkload,
  getResourceSummary,
};
