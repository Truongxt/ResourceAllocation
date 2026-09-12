const TaskGroup = require('../models/TaskGroup');
const Project = require('../models/Project');

/**
 * @desc    Lấy danh sách nhóm công việc trong project
 * @route   GET /api/task-groups/:projectId
 * @access  Private
 */
const getGroupsByProject = async (req, res, next) => {
  try {
    const userCompany = req.user?.companyName || 'Công ty Công nghệ RAO';
    const groups = await TaskGroup.find({
      project: req.params.projectId,
      companyName: userCompany,
    })
      .sort('order')
      .populate('createdBy', 'name avatar');

    res.json({ success: true, data: { groups } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tạo nhóm công việc mới
 * @route   POST /api/task-groups
 * @access  Private
 */
const createGroup = async (req, res, next) => {
  try {
    const { name, project, color } = req.body;
    const userCompany = req.user?.companyName || 'Công ty Công nghệ RAO';

    // Kiểm tra project thuộc cùng công ty
    const proj = await Project.findOne({ _id: project, companyName: userCompany });
    if (!proj) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
    }

    // Tính order tự động: lấy vị trí cuối
    const lastGroup = await TaskGroup.findOne({ project }).sort('-order');
    const order = lastGroup ? lastGroup.order + 1 : 0;

    const group = await TaskGroup.create({
      name,
      project,
      color: color || '#3b82f6',
      order,
      companyName: userCompany,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: { group }, message: 'Đã tạo nhóm công việc' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật nhóm công việc
 * @route   PUT /api/task-groups/:id
 * @access  Private
 */
const updateGroup = async (req, res, next) => {
  try {
    const { name, color, isOpen } = req.body;
    const userCompany = req.user?.companyName || 'Công ty Công nghệ RAO';

    const group = await TaskGroup.findOneAndUpdate(
      { _id: req.params.id, companyName: userCompany },
      { ...(name && { name }), ...(color && { color }), ...(isOpen !== undefined && { isOpen }) },
      { new: true, runValidators: true }
    );

    if (!group) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm công việc' });
    }

    res.json({ success: true, data: { group }, message: 'Đã cập nhật nhóm' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa nhóm công việc (tasks sẽ chuyển về ungroup)
 * @route   DELETE /api/task-groups/:id
 * @access  Private
 */
const deleteGroup = async (req, res, next) => {
  try {
    const userCompany = req.user?.companyName || 'Công ty Công nghệ RAO';
    const group = await TaskGroup.findOneAndDelete({ _id: req.params.id, companyName: userCompany });

    if (!group) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm công việc' });
    }

    // Gỡ liên kết task khỏi nhóm đã xóa
    const Task = require('../models/Task');
    await Task.updateMany({ taskGroup: req.params.id }, { $set: { taskGroup: null } });

    res.json({ success: true, message: 'Đã xóa nhóm công việc' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Sắp xếp lại thứ tự nhóm
 * @route   PUT /api/task-groups/reorder
 * @access  Private
 */
const reorderGroups = async (req, res, next) => {
  try {
    const { orderedIds } = req.body; // Array of group IDs in new order
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: 'orderedIds phải là mảng' });
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index } },
      },
    }));

    await TaskGroup.bulkWrite(bulkOps);
    res.json({ success: true, message: 'Đã cập nhật thứ tự nhóm' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGroupsByProject,
  createGroup,
  updateGroup,
  deleteGroup,
  reorderGroups,
};
