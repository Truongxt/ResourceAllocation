const Department = require('../models/Department');
const Resource = require('../models/Resource');
const { logActivity } = require('../services/activityLog.service');

const getDepartments = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) filter.name = new RegExp(req.query.search, 'i');

    const departments = await Department.find(filter).sort('name');
    const counts = await Resource.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$department', resourceCount: { $sum: 1 } } },
    ]);

    const countMap = counts.reduce((map, item) => {
      if (item._id) map[item._id] = item.resourceCount;
      return map;
    }, {});

    res.json({
      success: true,
      count: departments.length,
      data: {
        departments: departments.map((department) => ({
          ...department.toObject(),
          resourceCount: countMap[department.name] || 0,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).json({
      success: true,
      data: { department },
      message: 'Thêm phòng ban thành công',
    });
  } catch (error) {
    next(error);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!department) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng ban' });
    }

    res.json({
      success: true,
      data: { department },
      message: 'Cập nhật phòng ban thành công',
    });
  } catch (error) {
    next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng ban' });
    }

    const resourceCount = await Resource.countDocuments({ department: department.name, isActive: true });
    if (resourceCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa phòng ban đang có nhân sự. Hãy chuyển nhân sự sang phòng ban khác trước.',
      });
    }

    await department.deleteOne();

    await logActivity({
      req,
      action: 'DELETE_DEPARTMENT',
      entityType: 'department',
      entityId: req.params.id,
      entityTitle: department.name,
      description: `Xóa phòng ban ${department.name}`,
      details: { code: department.code },
    });

    res.json({
      success: true,
      data: { id: req.params.id },
      message: 'Xóa phòng ban thành công',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
