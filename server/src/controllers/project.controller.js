const Project = require('../models/Project');
const Task = require('../models/Task');
const { logActivity } = require('../services/activityLog.service');

const buildProjectQuery = (query) => {
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.manager) filter.manager = query.manager;

  if (query.search) {
    const searchRegex = new RegExp(query.search, 'i');
    filter.$or = [{ name: searchRegex }, { code: searchRegex }, { description: searchRegex }];
  }

  if (query.startDate || query.endDate) {
    filter.startDate = {};
    if (query.startDate) filter.startDate.$gte = new Date(query.startDate);
    if (query.endDate) filter.startDate.$lte = new Date(query.endDate);
  }

  return filter;
};

const recalculateProjectProgress = async (projectId) => {
  const tasks = await Task.find({ project: projectId }).select('progress status');

  if (!tasks.length) {
    await Project.findByIdAndUpdate(projectId, { progress: 0 });
    return 0;
  }

  const progress =
    tasks.reduce((sum, task) => {
      if (task.status === 'done') return sum + 100;
      return sum + (task.progress || 0);
    }, 0) / tasks.length;

  const roundedProgress = Math.round(progress);
  await Project.findByIdAndUpdate(projectId, { progress: roundedProgress });
  return roundedProgress;
};

const getProjects = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const sort = req.query.sort || '-createdAt';
    const filter = buildProjectQuery(req.query);

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate('manager', 'name email role avatar department')
        .populate('members.user', 'name email role avatar department')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Project.countDocuments(filter),
    ]);

    const projectIds = projects.map((project) => project._id);
    const taskStats = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: '$project',
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: {
              $cond: [{ $eq: ['$status', 'done'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const statsMap = taskStats.reduce((acc, stat) => {
      acc[stat._id.toString()] = {
        totalTasks: stat.totalTasks,
        completedTasks: stat.completedTasks,
      };
      return acc;
    }, {});

    const data = projects.map((project) => {
      const json = project.toObject({ virtuals: true });
      json.taskStats = statsMap[project._id.toString()] || {
        totalTasks: 0,
        completedTasks: 0,
      };
      return json;
    });

    res.json({
      success: true,
      count: data.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
      data: { projects: data },
    });
  } catch (error) {
    next(error);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    await recalculateProjectProgress(req.params.id);

    const project = await Project.findById(req.params.id)
      .populate('manager', 'name email role avatar department')
      .populate('members.user', 'name email role avatar department')
      .populate({
        path: 'tasks',
        select: 'title status priority startDate endDate progress estimatedHours actualHours assignee',
        populate: {
          path: 'assignee',
          select: 'name email position department avatar',
        },
      });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án',
      });
    }

    res.json({
      success: true,
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

const createProject = async (req, res, next) => {
  try {
    const projectData = {
      ...req.body,
      createdBy: req.user._id,
      manager: req.body.manager || req.user._id,
    };

    const project = await Project.create(projectData);

    const populatedProject = await Project.findById(project._id)
      .populate('manager', 'name email role avatar department')
      .populate('members.user', 'name email role avatar department');

    logActivity({
      req,
      action: 'CREATE_PROJECT',
      entityType: 'project',
      entityId: project._id,
      entityTitle: project.name,
      description: `Tạo mới dự án "${project.name}" (Mã: ${project.code || 'N/A'})`,
      details: { status: project.status, priority: project.priority, budget: project.budget },
    });

    res.status(201).json({
      success: true,
      data: { project: populatedProject },
      message: 'Tạo dự án thành công',
    });
  } catch (error) {
    next(error);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án',
      });
    }

    const updateData = { ...req.body };
    delete updateData.members;
    delete updateData.createdBy;

    const updatedProject = await Project.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('manager', 'name email role avatar department')
      .populate('members.user', 'name email role avatar department');

    logActivity({
      req,
      action: 'UPDATE_PROJECT',
      entityType: 'project',
      entityId: updatedProject._id,
      entityTitle: updatedProject.name,
      description: `Cập nhật thông tin dự án "${updatedProject.name}"`,
      details: { status: updatedProject.status, priority: updatedProject.priority },
    });

    res.json({
      success: true,
      data: { project: updatedProject },
      message: 'Cập nhật dự án thành công',
    });
  } catch (error) {
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án',
      });
    }

    const taskCount = await Task.countDocuments({ project: req.params.id });
    if (taskCount > 0 && req.query.force !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Dự án đang có công việc. Thêm ?force=true để xóa cả công việc liên quan.',
      });
    }

    if (req.query.force === 'true') {
      await Task.deleteMany({ project: req.params.id });
    }

    await project.deleteOne();

    logActivity({
      req,
      action: 'DELETE_PROJECT',
      entityType: 'project',
      entityId: req.params.id,
      entityTitle: project.name,
      description: `Xóa dự án "${project.name}" (kèm ${taskCount} tasks liên quan)`,
    });

    res.json({
      success: true,
      data: { id: req.params.id },
      message: 'Xóa dự án thành công',
    });
  } catch (error) {
    next(error);
  }
};

const addProjectMember = async (req, res, next) => {
  try {
    const { user, role = 'developer', allocation = 100 } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án',
      });
    }

    const existingMember = project.members.find((member) => member.user.toString() === user);
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'Thành viên đã tồn tại trong dự án',
      });
    }

    project.members.push({ user, role, allocation });
    await project.save();

    const updatedProject = await Project.findById(req.params.id)
      .populate('manager', 'name email role avatar department')
      .populate('members.user', 'name email role avatar department');

    res.status(201).json({
      success: true,
      data: { project: updatedProject },
      message: 'Thêm thành viên thành công',
    });
  } catch (error) {
    next(error);
  }
};

const updateProjectMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án',
      });
    }

    const member = project.members.find((item) => item.user.toString() === req.params.userId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thành viên trong dự án',
      });
    }

    if (req.body.role) member.role = req.body.role;
    if (req.body.allocation !== undefined) member.allocation = req.body.allocation;

    await project.save();

    const updatedProject = await Project.findById(req.params.id)
      .populate('manager', 'name email role avatar department')
      .populate('members.user', 'name email role avatar department');

    res.json({
      success: true,
      data: { project: updatedProject },
      message: 'Cập nhật thành viên thành công',
    });
  } catch (error) {
    next(error);
  }
};

const removeProjectMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án',
      });
    }

    project.members = project.members.filter((member) => member.user.toString() !== req.params.userId);
    await project.save();

    const updatedProject = await Project.findById(req.params.id)
      .populate('manager', 'name email role avatar department')
      .populate('members.user', 'name email role avatar department');

    res.json({
      success: true,
      data: { project: updatedProject },
      message: 'Xóa thành viên khỏi dự án thành công',
    });
  } catch (error) {
    next(error);
  }
};

const getProjectSummary = async (req, res, next) => {
  try {
    const [statusStats, priorityStats, totals] = await Promise.all([
      Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Project.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Project.aggregate([
        {
          $group: {
            _id: null,
            totalProjects: { $sum: 1 },
            averageProgress: { $avg: '$progress' },
            totalBudget: { $sum: '$budget' },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totals: totals[0] || { totalProjects: 0, averageProgress: 0, totalBudget: 0 },
        byStatus: statusStats,
        byPriority: priorityStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
  getProjectSummary,
};