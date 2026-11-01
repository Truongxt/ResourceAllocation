const TaskGroup = require('../models/TaskGroup');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { canManageProject, MANAGE_DENIED } = require('../services/projectAccess');

/**
 * Nhóm công việc là cấu trúc của dự án: chỉ Admin/Owner hoặc PM của dự án đó tạo, sửa, xóa,
 * sắp xếp được (`canManageProject`). Xem thì ai cùng công ty cũng được.
 *
 * @returns {Promise<boolean>} `true` nếu người gọi quản lý được mọi dự án chứa các nhóm này.
 */
const managesGroups = async (user, groups) => {
  const projectIds = [...new Set(groups.map((g) => String(g.project)))];
  const projects = await Project.find({ _id: { $in: projectIds } }).select('manager');
  return projects.length === projectIds.length && projects.every((proj) => canManageProject(user, proj));
};

/**
 * @desc    Lấy danh sách nhóm công việc trong project kèm thống kê tiến độ (Bài 25, 40)
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

    // Thống kê tiến độ theo nhóm công việc (chỉ tính việc cấp gốc để tránh double-weighting)
    const rootTasks = await Task.find({
      project: req.params.projectId,
      parentTask: { $in: [null, undefined] },
      status: { $ne: 'failed' },
    }).select('taskGroup status progress');

    const groupMap = {};
    let ungroupedTotal = 0;
    let ungroupedDone = 0;
    let ungroupedInProgress = 0;

    for (const task of rootTasks) {
      if (!task.taskGroup) {
        ungroupedTotal++;
        if (task.status === 'done') ungroupedDone++;
        else if (task.status === 'in_progress' || task.status === 'review') ungroupedInProgress++;
      } else {
        const gid = String(task.taskGroup);
        if (!groupMap[gid]) {
          groupMap[gid] = { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, progressSum: 0 };
        }
        groupMap[gid].totalTasks++;
        if (task.status === 'done') {
          groupMap[gid].completedTasks++;
          groupMap[gid].progressSum += 100;
        } else {
          if (task.status === 'in_progress' || task.status === 'review') groupMap[gid].inProgressTasks++;
          groupMap[gid].progressSum += (task.progress || 0);
        }
      }
    }

    const enrichedGroups = groups.map((g) => {
      const stats = groupMap[String(g._id)] || { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, progressSum: 0 };
      const progress = stats.totalTasks > 0 ? Math.round(stats.progressSum / stats.totalTasks) : 0;
      return {
        ...g.toObject(),
        totalTasks: stats.totalTasks,
        completedTasks: stats.completedTasks,
        inProgressTasks: stats.inProgressTasks,
        progress,
      };
    });

    const ungroupedStats = {
      totalTasks: ungroupedTotal,
      completedTasks: ungroupedDone,
      inProgressTasks: ungroupedInProgress,
      progress: ungroupedTotal > 0 ? Math.round((ungroupedDone / ungroupedTotal) * 100) : 0,
    };

    res.json({
      success: true,
      data: {
        groups: enrichedGroups,
        ungroupedStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tạo nhóm công việc mới
 * @route   POST /api/task-groups
 * @access  Admin/Owner, PM của dự án
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
    if (!canManageProject(req.user, proj)) {
      return res.status(403).json({ success: false, message: MANAGE_DENIED });
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
 * @access  Admin/Owner, PM của dự án
 */
const updateGroup = async (req, res, next) => {
  try {
    const { name, color, isOpen } = req.body;
    const userCompany = req.user?.companyName || 'Công ty Công nghệ RAO';

    const existing = await TaskGroup.findOne({ _id: req.params.id, companyName: userCompany });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm công việc' });
    }
    if (!(await managesGroups(req.user, [existing]))) {
      return res.status(403).json({ success: false, message: MANAGE_DENIED });
    }

    const group = await TaskGroup.findOneAndUpdate(
      { _id: req.params.id, companyName: userCompany },
      { ...(name && { name }), ...(color && { color }), ...(isOpen !== undefined && { isOpen }) },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: { group }, message: 'Đã cập nhật nhóm' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa nhóm công việc (tasks sẽ chuyển về ungroup)
 * @route   DELETE /api/task-groups/:id
 * @access  Admin/Owner, PM của dự án
 */
const deleteGroup = async (req, res, next) => {
  try {
    const userCompany = req.user?.companyName || 'Công ty Công nghệ RAO';
    const group = await TaskGroup.findOne({ _id: req.params.id, companyName: userCompany });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm công việc' });
    }
    if (!(await managesGroups(req.user, [group]))) {
      return res.status(403).json({ success: false, message: MANAGE_DENIED });
    }
    await group.deleteOne();

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
 * @access  Admin/Owner, PM của dự án
 */
const reorderGroups = async (req, res, next) => {
  try {
    const { orderedIds } = req.body; // Array of group IDs in new order
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: 'orderedIds phải là mảng' });
    }

    // Lọc theo công ty: id đi trong body, chỉ lọc `_id` thì đổi được thứ tự nhóm
    // của công ty khác
    const userCompany = req.user?.companyName || 'Công ty Công nghệ RAO';
    const groups = await TaskGroup.find({ _id: { $in: orderedIds }, companyName: userCompany }).select('project');
    if (!(await managesGroups(req.user, groups))) {
      return res.status(403).json({ success: false, message: MANAGE_DENIED });
    }
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, companyName: userCompany },
        update: { $set: { order: index } },
      },
    }));

    await TaskGroup.bulkWrite(bulkOps);
    res.json({ success: true, message: 'Đã cập nhật thứ tự nhóm' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đóng / Mở nhóm công việc (Bài 60)
 * @route   PATCH /api/task-groups/:id/toggle-open
 * @access  Admin/Owner, PM của dự án
 */
const toggleGroupOpen = async (req, res, next) => {
  try {
    const userCompany = req.user?.companyName || 'Công ty Công nghệ RAO';
    const existing = await TaskGroup.findOne({ _id: req.params.id, companyName: userCompany });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm công việc' });
    }
    if (!(await managesGroups(req.user, [existing]))) {
      return res.status(403).json({ success: false, message: MANAGE_DENIED });
    }

    const nextState = req.body.isOpen !== undefined ? Boolean(req.body.isOpen) : !existing.isOpen;
    existing.isOpen = nextState;
    await existing.save();

    res.json({
      success: true,
      data: { group: existing },
      message: existing.isOpen ? 'Đã mở nhóm công việc' : 'Đã tạm đóng nhóm công việc',
    });
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
  toggleGroupOpen,
};
