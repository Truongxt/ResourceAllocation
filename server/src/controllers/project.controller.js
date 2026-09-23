const Project = require('../models/Project');
const Task = require('../models/Task');
const TaskGroup = require('../models/TaskGroup');
const User = require('../models/User');
const CompanySetting = require('../models/CompanySetting');
const { logActivity } = require('../services/activityLog.service');

const buildProjectQuery = async (query, user) => {
  const filter = {};
  const userCompany = (user && user.companyName) || 'Công ty Công nghệ RAO';
  if (userCompany === 'Công ty Công nghệ RAO') {
    filter.companyName = { $in: [userCompany, null, undefined] };
  } else {
    filter.companyName = userCompany;
  }

  if (user && user.role !== 'admin' && !user.isOwner) {
    // Find all projects where user has tasks assigned or created
    const userTasks = await Task.find({
      $or: [{ assignee: user._id }, { createdBy: user._id }],
    }).select('project');
    const projectIdsFromTasks = userTasks.map((t) => t.project).filter(Boolean);

    filter.$or = [
      { manager: user._id },
      { 'members.user': user._id },
      { createdBy: user._id },
      { _id: { $in: projectIdsFromTasks } },
      { projectType: 'internal' },
    ];
  }

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.manager) filter.manager = query.manager;
  if (query.department) {
    if (query.department === 'unassigned') {
      filter.department = { $in: [null, undefined] };
    } else {
      filter.department = query.department;
    }
  }

  if (query.search) {
    const searchRegex = new RegExp(query.search, 'i');
    const searchFilter = [{ name: searchRegex }, { code: searchRegex }, { description: searchRegex }];
    if (filter.$or) {
      filter.$and = [
        { $or: filter.$or },
        { $or: searchFilter },
      ];
      delete filter.$or;
    } else {
      filter.$or = searchFilter;
    }
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
    const filter = await buildProjectQuery(req.query, req.user);

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate('manager', 'name email role avatar department')
        .populate('members.user', 'name email role avatar department')
        .populate('department', 'name code color')
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
      .populate('manager', 'name email role avatar department jobTitle')
      .populate('members.user', 'name email role avatar department jobTitle')
      .populate('department', 'name code color')
      .populate({
        path: 'tasks',
        select: 'title description status priority startDate endDate progress estimatedHours actualHours assignee createdBy followers deadlineHistory deadlineReason taskGroup project',
        populate: [
          { path: 'assignee', select: 'name email position department avatar' },
          { path: 'createdBy', select: 'name email avatar' },
          { path: 'taskGroup', select: 'name color' },
        ],
      });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án',
      });
    }

    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (project.companyName && project.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập dự án của công ty khác',
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
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    const isOwner = Boolean(req.user?.isOwner);
    const isAdmin = req.user?.role === 'admin';
    const isPM = req.user?.role === 'project_manager';
    const isWeworkAdmin = req.user?.appAdmins?.includes('work');

    let canCreate = isOwner || isAdmin || isWeworkAdmin || isPM;

    // Kiểm tra cấu hình hệ thống Base Wework của công ty
    if (!canCreate || req.user?.role === 'member') {
      const settings = await CompanySetting.findOne({ companyName: userCompany });
      if (settings?.createProjectPermission === 'all_members') {
        canCreate = true;
      } else {
        canCreate = false;
      }
    }

    if (!canCreate) {
      return res.status(403).json({
        success: false,
        message: 'Theo cài đặt hệ thống của công ty, chỉ Quản trị viên (Admin & App Admin) mới có quyền tạo dự án mới.',
      });
    }

    const managerId = req.body.manager || req.user._id;

    // Chuẩn hóa danh sách thành viên thực hiện dự án (nếu được truyền)
    let formattedMembers = [];
    if (Array.isArray(req.body.members) && req.body.members.length > 0) {
      formattedMembers = req.body.members
        .map((m) => {
          if (typeof m === 'string' || (m && m._id)) {
            return { user: m._id || m, role: 'developer', allocation: 100 };
          }
          return m;
        })
        .filter((m) => m && m.user);

      // Đảm bảo PM có mặt trong danh sách thành viên dự án
      if (managerId && !formattedMembers.some((m) => m.user.toString() === managerId.toString())) {
        formattedMembers.unshift({ user: managerId, role: 'lead', allocation: 100 });
      }
    }

    const projectData = {
      ...req.body,
      department: req.body.department || null,
      companyName: userCompany,
      createdBy: req.user._id,
      manager: managerId,
      members: formattedMembers,
      projectType: req.body.projectType || 'internal',
      color: req.body.color || '#6366f1',
      template: req.body.template || null,
    };

    const project = await Project.create(projectData);

    // Nếu chọn Mẫu dự án (Template), tự động khởi tạo các TaskGroup mẫu chuẩn Base Wework
    if (req.body.template) {
      let templateGroups = [];
      if (req.body.template === 'agile_scrum') {
        templateGroups = [
          { name: 'Backlog / Yêu cầu', color: '#64748b', order: 0 },
          { name: 'Sprint To Do / Cần làm', color: '#3b82f6', order: 1 },
          { name: 'In Progress / Đang thực hiện', color: '#f59e0b', order: 2 },
          { name: 'Testing & QA / Kiểm thử', color: '#8b5cf6', order: 3 },
          { name: 'Done / Hoàn thành', color: '#10b981', order: 4 },
        ];
      } else if (req.body.template === 'marketing') {
        templateGroups = [
          { name: 'Chiến lược & Lên ý tưởng', color: '#ec4899', order: 0 },
          { name: 'Sản xuất nội dung & Copywriting', color: '#8b5cf6', order: 1 },
          { name: 'Thiết kế hình ảnh & Video', color: '#3b82f6', order: 2 },
          { name: 'Chạy chiến dịch & Quảng cáo', color: '#f59e0b', order: 3 },
          { name: 'Đo lường & Báo cáo ROI', color: '#10b981', order: 4 },
        ];
      } else if (req.body.template === 'standard') {
        templateGroups = [
          { name: 'Giai đoạn 1: Chuẩn bị & Lập kế hoạch', color: '#3b82f6', order: 0 },
          { name: 'Giai đoạn 2: Triển khai thực hiện', color: '#f59e0b', order: 1 },
          { name: 'Giai đoạn 3: Nghiệm thu & Bàn giao', color: '#10b981', order: 2 },
        ];
      }

      if (templateGroups.length > 0) {
        await TaskGroup.insertMany(
          templateGroups.map((g) => ({
            ...g,
            project: project._id,
            companyName: userCompany,
            createdBy: req.user._id,
          }))
        );
      }
    }

    const populatedProject = await Project.findById(project._id)
      .populate('manager', 'name email role avatar department')
      .populate('members.user', 'name email role avatar department')
      .populate('department', 'name code color');

    logActivity({
      req,
      action: 'CREATE_PROJECT',
      entityType: 'project',
      entityId: project._id,
      entityTitle: project.name,
      description: `Tạo mới dự án "${project.name}" (Mã: ${project.code || 'N/A'}, Loại: ${project.projectType || 'internal'})`,
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

    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (project.companyName && project.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thao tác trên dự án của công ty khác',
      });
    }

    const updateData = { ...req.body };
    delete updateData.createdBy;

    if (Array.isArray(req.body.members)) {
      const formattedMembers = req.body.members
        .map((m) => {
          if (typeof m === 'string' || (m && m._id)) {
            return { user: m._id || m, role: 'developer', allocation: 100 };
          }
          return m;
        })
        .filter((m) => m && m.user);

      const targetManager = req.body.manager || project.manager;
      if (targetManager && !formattedMembers.some((m) => (m.user?._id || m.user).toString() === targetManager.toString())) {
        formattedMembers.unshift({ user: targetManager, role: 'lead', allocation: 100 });
      }
      updateData.members = formattedMembers;
    } else {
      delete updateData.members;
    }

    if (updateData.department === '' || updateData.department === 'unassigned') {
      updateData.department = null;
    }
    if (req.body.manager) {
      updateData.manager = req.body.manager;
    }
    if (req.body.projectType) {
      updateData.projectType = req.body.projectType;
    }
    if (req.body.color) {
      updateData.color = req.body.color;
    }
    if (req.body.template !== undefined) {
      updateData.template = req.body.template;
    }

    const updatedProject = await Project.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('manager', 'name email role avatar department')
      .populate('members.user', 'name email role avatar department')
      .populate('department', 'name code color');

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

/**
 * Base Wework: Chỉnh sửa nhanh (Quick Edit) dự án / phòng ban
 * Cho phép cập nhật nhanh Tên, Phân nhóm Department, Trạng thái, Quản lý dự án
 */
const quickEditProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
    }

    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (project.companyName && project.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Không có quyền thao tác trên dự án của công ty khác' });
    }

    const isOwner = req.user.isOwner;
    const isAdmin = req.user.role === 'admin';
    const isManager = project.manager && project.manager.toString() === req.user._id.toString();
    if (!isAdmin && !isOwner && !isManager) {
      return res.status(403).json({ success: false, message: 'Chỉ Quản trị viên hoặc Quản lý dự án mới có quyền chỉnh sửa nhanh' });
    }

    const { name, department, status, priority, manager } = req.body;
    if (name !== undefined) project.name = name;
    if (department !== undefined) {
      project.department = (department === '' || department === 'unassigned' || department === null) ? null : department;
    }
    if (status !== undefined) project.status = status;
    if (priority !== undefined) project.priority = priority;
    if (manager !== undefined && (isAdmin || isOwner)) project.manager = manager;

    await project.save();

    const populated = await Project.findById(project._id)
      .populate('manager', 'name email role avatar department')
      .populate('members.user', 'name email role avatar department')
      .populate('department', 'name code color');

    logActivity({
      req,
      action: 'UPDATE_PROJECT',
      entityType: 'project',
      entityId: project._id,
      entityTitle: project.name,
      description: `Chỉnh sửa nhanh dự án "${project.name}" (Base Wework)`,
    });

    res.json({
      success: true,
      data: { project: populated },
      message: 'Cập nhật nhanh dự án thành công',
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

    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (project.companyName && project.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thao tác trên dự án của công ty khác',
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

    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (project.companyName && project.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thao tác trên dự án của công ty khác',
      });
    }

    const userToAdd = await User.findById(user);
    if (userToAdd && userToAdd.companyName && userToAdd.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không thể thêm nhân sự từ công ty khác vào dự án',
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

    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (project.companyName && project.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thao tác trên dự án của công ty khác',
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

    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (project.companyName && project.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thao tác trên dự án của công ty khác',
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
    const match = {};
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (userCompany === 'Công ty Công nghệ RAO') {
      match.companyName = { $in: [userCompany, null, undefined] };
    } else {
      match.companyName = userCompany;
    }

    if (req.user && req.user.role !== 'admin') {
      const userTasks = await Task.find({
        $or: [{ assignee: req.user._id }, { createdBy: req.user._id }],
      }).select('project');
      const projectIdsFromTasks = userTasks.map((t) => t.project).filter(Boolean);

      match.$or = [
        { manager: req.user._id },
        { 'members.user': req.user._id },
        { createdBy: req.user._id },
        { _id: { $in: projectIdsFromTasks } },
      ];
    }

    const [statusStats, priorityStats, totals] = await Promise.all([
      Project.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Project.aggregate([
        { $match: match },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Project.aggregate([
        { $match: match },
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

/**
 * @desc    Cập nhật cấu hình phân quyền thao tác trong dự án (Base Wework)
 * @route   PATCH /api/projects/:id/permissions
 * @access  Private (Owner hoặc PM quản lý dự án)
 */
const updateProjectPermissions = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
    }

    const isOwner = req.user.role === 'admin' || Boolean(req.user.isOwner);
    const isManager = project.manager && project.manager.toString() === req.user._id.toString();

    if (!isOwner && !isManager) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Quản trị viên hệ thống hoặc Quản lý dự án mới có quyền cấu hình phân quyền.',
      });
    }

    project.permissions = {
      ...(project.permissions?.toObject ? project.permissions.toObject() : project.permissions),
      ...(req.body.permissions || req.body),
    };

    // Cấu hình đánh dấu Thất bại dùng chung endpoint này: cùng một người quyết,
    // cùng một màn hình cài đặt dự án, không cần thêm một route gần như trùng lặp.
    if (req.body.failureConfig) {
      project.failureConfig = {
        ...(project.failureConfig?.toObject ? project.failureConfig.toObject() : project.failureConfig),
        ...req.body.failureConfig,
      };
      project.markModified('failureConfig');
    }

    if (req.body.reviewConfig) {
      project.reviewConfig = {
        ...(project.reviewConfig?.toObject ? project.reviewConfig.toObject() : project.reviewConfig),
        ...req.body.reviewConfig,
      };
      project.markModified('reviewConfig');
    }

    project.markModified('permissions');
    await project.save();

    res.json({
      success: true,
      data: {
        permissions: project.permissions,
        failureConfig: project.failureConfig,
        reviewConfig: project.reviewConfig,
      },
      message: 'Cập nhật cấu hình phân quyền dự án thành công',
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
  updateProjectPermissions,
  quickEditProject,
};