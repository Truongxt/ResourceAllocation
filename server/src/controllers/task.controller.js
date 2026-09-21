const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const TaskGroup = require('../models/TaskGroup');
const { sendNotification } = require('../services/socket.service');
const { logActivity } = require('../services/activityLog.service');
const { syncResourceWorkload } = require('../services/workload.service');
const {
  validateStatusTransition,
  resolveReviewers,
  isReviewOverdue,
  CLOSED_STATUSES,
} = require('../services/taskStatus.service');
const {
  generateTaskTemplateWorkbook,
  parseTaskExcelBuffer,
  importTasksFromExcel,
} = require('../services/excelTaskImport.service');

/**
 * Helper: Tính lại progress dự án dựa trên tasks
 */
const recalculateProjectProgress = async (projectId) => {
  const tasks = await Task.find({ project: projectId }).select('progress status');
  // Việc đã đánh dấu Thất bại bị loại khỏi mẫu số: giữ lại thì một việc hỏng khiến
  // dự án không bao giờ chạm 100% dù mọi việc còn lại đã xong. Nó được đếm riêng
  // trong báo cáo ở mục 'failed'.
  const counted = tasks.filter((t) => t.status !== 'failed');
  if (!counted.length) {
    await Project.findByIdAndUpdate(projectId, { progress: 0 });
    return;
  }
  const total = counted.reduce((sum, t) => sum + (t.status === 'done' ? 100 : (t.progress || 0)), 0);
  const progress = Math.round(total / counted.length);
  await Project.findByIdAndUpdate(projectId, { progress });
};

/**
 * @desc    Lấy danh sách tasks (filter theo project, status, assignee, search)
 * @route   GET /api/tasks
 * @access  Private
 */
const getTasks = async (req, res, next) => {
  try {
    const filter = {};
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';

    const companyProjects = await Project.find({
      companyName: userCompany === 'Công ty Công nghệ RAO' ? { $in: [userCompany, null, undefined] } : userCompany,
    }).select('_id');
    const companyProjectIds = companyProjects.map((p) => p._id);

    if (req.user && req.user.role === 'admin') {
      filter.project = { $in: companyProjectIds };
    } else {
      const accessibleProjects = await Project.find({
        _id: { $in: companyProjectIds },
        $or: [
          { manager: req.user._id },
          { 'members.user': req.user._id },
          { createdBy: req.user._id },
        ],
      }).select('_id');
      const projectIds = accessibleProjects.map((p) => p._id);

      filter.$or = [
        { project: { $in: projectIds } },
        { assignee: req.user._id },
        { createdBy: req.user._id },
      ];
    }

    // Lọc theo date
    if (req.query.from && req.query.to) {
      const fromDate = new Date(req.query.from);
      const toDate = new Date(req.query.to);

      // thuật toán overlap: 2 khoảng [a,b] và [x,y]
      // overlap nếu a <= y && x <= b
      const dateOverLapCondition = {
        $and: [
          { startDate: { $lte: toDate } },
          { endDate: { $gte: fromDate } },
        ]
      }

      // ghép vô filter

      if (filter.$and) {
        filter.$and.push(dateOverLapCondition)
      } else if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, dateOverLapCondition];
        delete filter.$or;
      }
      else {
        filter.$and = [dateOverLapCondition];
      }
    }
    // Base Wework: Lọc theo phạm vi cá nhân (scope)
    const scope = req.query.scope || 'all';
    if (scope === 'my_tasks') {
      filter.assignee = req.user._id;
      delete filter.$or;
    } else if (scope === 'assigned_by_me') {
      filter.createdBy = req.user._id;
      delete filter.$or;
    } else if (scope === 'following') {
      filter.followers = req.user._id;
      delete filter.$or;
    } else if (scope === 'subordinates') {
      const subordinates = await User.find({ manager: req.user._id }).select('_id');
      const subIds = subordinates.map((s) => s._id);
      filter.assignee = { $in: subIds };
      delete filter.$or;
    }
    // Khi scope === 'all', giữ nguyên filter.$or đã thiết lập theo dự án và công ty phía trên

    // Base Wework: Lọc thời gian nhanh (timeFilter)
    if (req.query.timeFilter) {
      const tf = req.query.timeFilter;
      const now = new Date();
      if (tf === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        filter.endDate = { $gte: startOfToday, $lte: endOfToday };
      } else if (tf === 'this_week') {
        const day = now.getDay();
        const diffToMon = (day === 0 ? -6 : 1) - day;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() + diffToMon);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        filter.endDate = { $gte: startOfWeek, $lte: endOfWeek };
      } else if (tf === 'overdue') {
        filter.endDate = { $lt: now };
        filter.status = { $ne: 'done' };
      } else if (tf === 'done') {
        filter.status = 'done';
      }
    }

    if (req.query.project) {
      const isAllowed = companyProjectIds.some(id => id.toString() === req.query.project.toString());
      if (!isAllowed && req.user.role !== 'superadmin') {
        return res.json({
          success: true,
          count: 0,
          total: 0,
          pagination: { page: 1, limit: 50, pages: 1 },
          data: { tasks: [] },
        });
      }

      if (filter.$or) {
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: filter.$or }, { project: req.query.project });
        delete filter.$or;
      } else {
        filter.project = req.query.project;
      }
    }
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.assignee) filter.assignee = req.query.assignee;
    if (req.query.unassigned === 'true') {
      filter.$and = [...(filter.$and || []), { assignee: null }, { status: { $ne: 'done' } }];
    }

    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      const searchOr = [{ title: regex }, { description: regex }];
      if (filter.$and) {
        filter.$and.push({ $or: searchOr });
      } else if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }

    // Không hiển thị công việc con ra ngoài bảng chính trừ khi có chỉ định
    if (req.query.parentTask) {
      filter.parentTask = req.query.parentTask;
    } else if (req.query.includeSubtasks !== 'true') {
      filter.parentTask = { $in: [null, undefined] };
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const skip = (page - 1) * limit;
    const sort = req.query.sort || '-createdAt';

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('project', 'name code status permissions members manager companyName')
        .populate('assignee', 'name email avatar department')
        .populate('dependencies', 'title status')
        .populate('taskGroup', 'name color order')
        .populate('followers', 'name email avatar')
        .populate('parentTask', 'title status')
        .populate('resultReport.submittedBy', 'name email avatar')
        .populate('resultReport.approvedBy', 'name email avatar')
        .populate('deadlineHistory.changedBy', 'name email avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: tasks.length,
      total,
      pagination: { page, limit, pages: Math.ceil(total / limit) || 1 },
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy chi tiết task theo ID
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name code status members manager permissions companyName')
      .populate('assignee', 'name email avatar department')
      .populate('dependencies', 'title status priority startDate endDate progress')
      .populate('taskGroup', 'name color order')
      .populate('followers', 'name email avatar')
      .populate('parentTask', 'title status priority')
      .populate('comments.user', 'name email avatar')
      .populate('resultReport.submittedBy', 'name email avatar')
      .populate('resultReport.approvedBy', 'name email avatar')
      .populate('deadlineHistory.changedBy', 'name email avatar')
      .populate('createdBy', 'name email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công việc',
      });
    }

    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (task.project?.companyName && task.project.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền xem công việc của công ty khác',
      });
    }

    // Fetch subtasks of this task
    const subtasks = await Task.find({ parentTask: task._id })
      .populate('assignee', 'name email avatar')
      .select('title status priority progress startDate endDate assignee estimatedHours actualHours');

    const taskObj = task.toObject();
    taskObj.subtasks = subtasks;

    res.json({
      success: true,
      data: { task: taskObj },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: kiểm tra danh sách công việc tiền nhiệm trước khi lưu.
 *
 * Giao diện đã lọc sẵn các lựa chọn hợp lệ, nhưng đây mới là chỗ bắt buộc phải
 * chặn: một chu trình phụ thuộc lọt vào DB sẽ làm hỏng cả CPM trên sơ đồ Gantt
 * lẫn ràng buộc H4 của CSP.
 *
 * @returns {String|null} thông báo lỗi, hoặc null nếu hợp lệ
 */
const validateDependencies = async (dependencies, { taskId, projectId }) => {
  const ids = [...new Set((dependencies || []).map(String))];
  if (!ids.length) return null;

  if (taskId && ids.includes(String(taskId))) {
    return 'Công việc không thể phụ thuộc vào chính nó';
  }

  const referenced = await Task.find({ _id: { $in: ids } }).select('project title');
  if (referenced.length !== ids.length) {
    return 'Có công việc tiền nhiệm không tồn tại';
  }

  const outsider = referenced.find((t) => String(t.project) !== String(projectId));
  if (outsider) {
    return `Công việc "${outsider.title}" thuộc dự án khác, không thể làm tiền nhiệm`;
  }

  // Cạnh trỏ từ công việc tới tiền nhiệm của nó. Chu trình xuất hiện khi chính
  // task đang sửa lại nằm trong chuỗi tiền nhiệm của một trong các lựa chọn mới.
  if (taskId) {
    const all = await Task.find({ project: projectId }).select('dependencies');
    const graph = new Map(all.map((t) => [String(t._id), (t.dependencies || []).map(String)]));

    const queue = [...ids];
    const seen = new Set(queue);
    while (queue.length) {
      const current = queue.shift();
      if (current === String(taskId)) {
        return 'Phụ thuộc này tạo thành vòng lặp giữa các công việc';
      }
      for (const next of graph.get(current) || []) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
  }

  return null;
};

/**
 * @desc    Tạo task mới
 * @route   POST /api/tasks
 * @access  Private
 */
const createTask = async (req, res, next) => {
  try {
    // Verify project exists
    const project = await Project.findById(req.body.project);
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
        message: 'Không có quyền tạo công việc trong dự án của công ty khác',
      });
    }

    const depError = await validateDependencies(req.body.dependencies, {
      taskId: null,
      projectId: project._id,
    });
    if (depError) {
      return res.status(400).json({ success: false, message: depError });
    }
    if (Array.isArray(req.body.dependencies)) {
      req.body.dependencies = [...new Set(req.body.dependencies.map(String))];
    }

    const taskData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const task = await Task.create(taskData);

    // Auto add assignee to project members if not present
    if (taskData.assignee) {
      const isMember = (project.members || []).some(
        (m) => m.user && m.user.toString() === taskData.assignee.toString()
      );
      if (!isMember) {
        project.members.push({ user: taskData.assignee, role: 'developer', allocation: 100 });
        await project.save();
      }
    }

    // Recalculate project progress
    await recalculateProjectProgress(project._id);

    // Đồng bộ tải công việc của nhân sự được gán
    if (taskData.assignee) {
      await syncResourceWorkload(taskData.assignee);
    }

    const populated = await Task.findById(task._id)
      .populate('project', 'name code status')
      .populate('assignee', 'name email avatar department')
      .populate('dependencies', 'title status')
      .populate('taskGroup', 'name color order')
      .populate('followers', 'name email avatar')
      .populate('parentTask', 'title status');

    // Real-time Notification if assigned to someone else
    if (populated.assignee && populated.assignee._id.toString() !== req.user._id.toString()) {
      sendNotification({
        recipient: populated.assignee._id,
        actor: req.user._id,
        type: 'task_assigned',
        title: 'Công việc mới được phân công',
        message: `Bạn đã được gán công việc "${populated.title}" trong dự án ${project.name}`,
        entityType: 'task',
        entityId: populated._id,
        link: '/tasks',
      });
    }

    logActivity({
      req,
      action: 'CREATE_TASK',
      entityType: 'task',
      entityId: populated._id,
      entityTitle: populated.title,
      description: `Tạo công việc "${populated.title}" trong dự án ${project.name}`,
      details: { status: populated.status, priority: populated.priority, assignee: populated.assignee?.name },
    });

    res.status(201).json({
      success: true,
      data: { task: populated },
      message: 'Tạo công việc thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật task
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công việc',
      });
    }

    const project = await Project.findById(task.project);
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (project?.companyName && project.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thao tác trên công việc của công ty khác',
      });
    }

    if (req.body.dependencies !== undefined) {
      const depError = await validateDependencies(req.body.dependencies, {
        taskId: task._id,
        projectId: task.project,
      });
      if (depError) {
        return res.status(400).json({ success: false, message: depError });
      }
      req.body.dependencies = [...new Set((req.body.dependencies || []).map(String))];
    }

    // Auto-set progress to 100 when status changed to done
    if (req.body.status === 'done' && task.status !== 'done') {
      req.body.progress = 100;
    }

    const updateData = { ...req.body };
    delete updateData.createdBy;
    delete updateData.project; // Don't allow changing project

    // Base Wework: Nếu thay đổi endDate, tự động ghi nhận vào deadlineHistory
    if (
      updateData.endDate &&
      (!task.endDate || new Date(task.endDate).getTime() !== new Date(updateData.endDate).getTime())
    ) {
      updateData.$push = updateData.$push || {};
      updateData.$push.deadlineHistory = {
        oldEndDate: task.endDate,
        newEndDate: new Date(updateData.endDate),
        changedBy: req.user._id,
        reason: req.body.deadlineReason || 'Cập nhật thời hạn hoàn thành',
        changedAt: new Date(),
      };
    }

    const oldAssignee = task.assignee;

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('project', 'name code status permissions members manager companyName')
      .populate('assignee', 'name email avatar department')
      .populate('dependencies', 'title status')
      .populate('taskGroup', 'name color order')
      .populate('followers', 'name email avatar')
      .populate('parentTask', 'title status')
      .populate('deadlineHistory.changedBy', 'name email avatar');

    // Auto add assignee to project members if not present
    if (updatedTask.assignee) {
      if (project) {
        const isMember = (project.members || []).some(
          (m) => m.user && m.user.toString() === updatedTask.assignee._id.toString()
        );
        if (!isMember) {
          project.members.push({ user: updatedTask.assignee._id, role: 'developer', allocation: 100 });
          await project.save();
        }
      }
    }

    // Recalculate project progress
    await recalculateProjectProgress(task.project);

    // Đồng bộ tải cho cả người cũ và người mới (nếu có thay đổi assignee hoặc giờ/trạng thái)
    const userIdsToSync = [oldAssignee, updatedTask.assignee?._id || updatedTask.assignee].filter(Boolean);
    if (userIdsToSync.length > 0) {
      await syncResourceWorkload(userIdsToSync);
    }

    // Real-time Notification if newly assigned
    if (
      updatedTask.assignee &&
      (!task.assignee || task.assignee.toString() !== updatedTask.assignee._id.toString()) &&
      updatedTask.assignee._id.toString() !== req.user._id.toString()
    ) {
      sendNotification({
        recipient: updatedTask.assignee._id,
        actor: req.user._id,
        type: 'task_assigned',
        title: 'Phân công công việc',
        message: `Bạn được phân công công việc "${updatedTask.title}"`,
        entityType: 'task',
        entityId: updatedTask._id,
        link: '/tasks',
      });
    }

    logActivity({
      req,
      action: 'UPDATE_TASK',
      entityType: 'task',
      entityId: updatedTask._id,
      entityTitle: updatedTask.title,
      description: `Cập nhật thông tin công việc "${updatedTask.title}"`,
      details: { status: updatedTask.status, progress: updatedTask.progress, assignee: updatedTask.assignee?.name },
    });

    res.json({
      success: true,
      data: { task: updatedTask },
      message: 'Cập nhật công việc thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật nhanh status task (cho Kanban drag & drop)
 * @route   PATCH /api/tasks/:id/status
 * @access  Private
 */
const updateTaskStatus = async (req, res, next) => {
  try {
    const { status, failureReason } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công việc',
      });
    }

    const project = await Project.findById(task.project);
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (project?.companyName && project.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thao tác trên công việc của công ty khác',
      });
    }

    // Dự án bật đánh giá thì chỉ người đánh giá mới kết luận được "xong"; người
    // thực hiện đi đường PATCH /:id/complete.
    const isReviewer = canApproveReview(task, project, req.user);

    // Một chỗ duy nhất phán xét bước chuyển. Đặt trước mọi lệnh ghi để request bị
    // từ chối không để lại thay đổi nửa vời nào trong DB.
    const check = validateStatusTransition({
      currentStatus: task.status,
      nextStatus: status,
      project,
      failureReason,
      isReviewer,
    });
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    const updateData = { status };
    if (status === 'done') updateData.progress = 100;
    if (status === 'todo') updateData.progress = 0;

    if (status === 'failed') {
      updateData.failureReason = String(failureReason).trim();
      updateData.failedAt = new Date();
      updateData.failedBy = req.user._id;
    } else if (task.status === 'failed') {
      // Mở lại việc đã đóng: xóa vết thất bại cũ, nếu không báo cáo sẽ đọc được một
      // công việc 'đang làm' mà vẫn kèm lý do thất bại từ lần trước.
      updateData.failureReason = '';
      updateData.failedAt = null;
      updateData.failedBy = null;
    }

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('project', 'name code status')
      .populate('assignee', 'name email avatar department');

    await recalculateProjectProgress(task.project);

    // Đồng bộ lại tải công việc của người được gán khi đổi trạng thái
    if (task.assignee) {
      await syncResourceWorkload(task.assignee);
    }

    // Notify assignee if status changed by someone else
    if (
      updatedTask.assignee &&
      updatedTask.assignee._id.toString() !== req.user._id.toString()
    ) {
      sendNotification({
        recipient: updatedTask.assignee._id,
        actor: req.user._id,
        type: 'task_status_changed',
        title: 'Cập nhật trạng thái công việc',
        message: `Công việc "${updatedTask.title}" đã chuyển sang trạng thái: ${status}`,
        entityType: 'task',
        entityId: updatedTask._id,
        link: '/tasks',
      });
    }

    logActivity({
      req,
      action: status === 'failed' ? 'TASK_MARKED_FAILED' : 'UPDATE_TASK_STATUS',
      entityType: 'task',
      entityId: updatedTask._id,
      entityTitle: updatedTask.title,
      description: `Đổi trạng thái công việc "${updatedTask.title}" sang "${status}"`,
      details: { oldStatus: task.status, newStatus: status, ...(status === 'failed' ? { failureReason: updateData.failureReason } : {}) },
    });

    res.json({
      success: true,
      data: { task: updatedTask },
      message: 'Cập nhật trạng thái thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa task
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công việc',
      });
    }

    const project = await Project.findById(task.project);
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (project?.companyName && project.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thao tác trên công việc của công ty khác',
      });
    }

    const projectId = task.project;

    // Remove this task from other tasks' dependencies
    await Task.updateMany(
      { dependencies: task._id },
      { $pull: { dependencies: task._id } }
    );

    await task.deleteOne();

    // Recalculate project progress
    await recalculateProjectProgress(projectId);

    // Đồng bộ lại tải công việc khi task bị xóa
    if (task.assignee) {
      await syncResourceWorkload(task.assignee);
    }

    logActivity({
      req,
      action: 'DELETE_TASK',
      entityType: 'task',
      entityId: req.params.id,
      entityTitle: task.title,
      description: `Xóa công việc "${task.title}"`,
    });

    res.json({
      success: true,
      data: { id: req.params.id },
      message: 'Xóa công việc thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Thống kê tasks
 * @route   GET /api/tasks/stats/summary
 * @access  Private
 */
const getTaskSummary = async (req, res, next) => {
  try {
    const filter = {};
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';

    const companyProjects = await Project.find({
      companyName: userCompany === 'Công ty Công nghệ RAO' ? { $in: [userCompany, null, undefined] } : userCompany,
    }).select('_id');
    const companyProjectIds = companyProjects.map((p) => p._id);

    if (req.user && req.user.role === 'admin') {
      filter.project = { $in: companyProjectIds };
    } else {
      const accessibleProjects = await Project.find({
        _id: { $in: companyProjectIds },
        $or: [
          { manager: req.user._id },
          { 'members.user': req.user._id },
          { createdBy: req.user._id },
        ],
      }).select('_id');
      const projectIds = accessibleProjects.map((p) => p._id);

      filter.$or = [
        { project: { $in: projectIds } },
        { assignee: req.user._id },
        { createdBy: req.user._id },
      ];
    }


    if (req.query.project) {
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { project: req.query.project },
        ];
        delete filter.$or;
      } else {
        filter.project = req.query.project;
      }
    }

    if (!req.query.includeSubtasks) {
      filter.parentTask = { $in: [null, undefined] };
    }

    const [statusStats, priorityStats, totals] = await Promise.all([
      Task.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: filter },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalTasks: { $sum: 1 },
            averageProgress: { $avg: '$progress' },
            totalEstimatedHours: { $sum: '$estimatedHours' },
            totalActualHours: { $sum: '$actualHours' },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totals: totals[0] || { totalTasks: 0, averageProgress: 0, totalEstimatedHours: 0, totalActualHours: 0 },
        byStatus: statusStats,
        byPriority: priorityStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTaskSummary,
};

// ==========================================================================
// BASE WEWORK — Mở rộng tính năng Quản lý Công việc nâng cao
// ==========================================================================

/**
 * @desc    Thêm bình luận vào task
 * @route   POST /api/tasks/:id/comments
 * @access  Private
 */
const addComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Nội dung bình luận không được trống' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });

    const comment = { user: req.user._id, content: content.trim(), createdAt: new Date() };
    task.comments.push(comment);
    await task.save();

    // Populate user info cho comment mới thêm
    await task.populate('comments.user', 'name email avatar');
    const newComment = task.comments[task.comments.length - 1];

    // Thông báo cho followers và assignee
    const notifyUsers = new Set([
      ...(task.followers || []).map(String),
      task.assignee ? task.assignee.toString() : null,
    ].filter(id => id && id !== req.user._id.toString()));

    notifyUsers.forEach((recipientId) => {
      sendNotification({
        recipient: recipientId,
        actor: req.user._id,
        type: 'task_comment',
        title: 'Bình luận mới trong công việc',
        message: `${req.user.name} đã bình luận trong "${task.title}"`,
        entityType: 'task',
        entityId: task._id,
        link: '/tasks',
      });
    });

    res.status(201).json({ success: true, data: { comment: newComment } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa bình luận
 * @route   DELETE /api/tasks/:id/comments/:commentId
 * @access  Private
 */
const deleteComment = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });

    const comment = task.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });

    // Chỉ cho phép xóa bình luận của chính mình hoặc admin
    if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Bạn chỉ được xóa bình luận của mình' });
    }

    comment.deleteOne();
    await task.save();

    res.json({ success: true, message: 'Đã xóa bình luận' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Thêm mục checklist
 * @route   POST /api/tasks/:id/checklist
 * @access  Private
 */
const addChecklistItem = async (req, res, next) => {
  try {
    const { title, assignee } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Tiêu đề mục checklist không được trống' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });

    const order = task.checklist.length;
    task.checklist.push({ title: title.trim(), assignee: assignee || null, order });
    await task.save();

    const newItem = task.checklist[task.checklist.length - 1];
    res.status(201).json({ success: true, data: { item: newItem } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle trạng thái checklist item
 * @route   PUT /api/tasks/:id/checklist/:itemId/toggle
 * @access  Private
 */
const toggleChecklistItem = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });

    const item = task.checklist.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy mục checklist' });

    item.isCompleted = !item.isCompleted;
    await task.save();

    // Tính progress checklist
    const total = task.checklist.length;
    const completed = task.checklist.filter(c => c.isCompleted).length;

    res.json({
      success: true,
      data: { item, checklistProgress: { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 } },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa mục checklist
 * @route   DELETE /api/tasks/:id/checklist/:itemId
 * @access  Private
 */
const removeChecklistItem = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });

    const item = task.checklist.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy mục checklist' });

    item.deleteOne();
    await task.save();

    res.json({ success: true, message: 'Đã xóa mục checklist' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Thêm người theo dõi công việc (một hoặc nhiều người trong một lần gọi)
 * @route   POST /api/tasks/:id/followers
 * @access  Private
 */
const addFollower = async (req, res, next) => {
  try {
    // Nhận cả `userIds: []` lẫn `userId` đơn lẻ. Giao diện hiện tại còn gửi dạng đơn,
    // đổi cứng sang mảng sẽ làm hỏng nút "Thêm người theo dõi" đang chạy.
    const { userIds, userId } = req.body;
    const requested = Array.isArray(userIds) ? userIds : userId ? [userId] : [];

    if (!requested.length) {
      return res.status(400).json({ success: false, message: 'Chưa chọn người theo dõi nào' });
    }

    const candidates = [...new Set(requested.map(String))].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    if (!candidates.length) {
      return res.status(400).json({ success: false, message: 'Danh sách người theo dõi không hợp lệ' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });

    const assigneeId = task.assignee ? task.assignee.toString() : null;
    const current = new Set((task.followers || []).map((f) => f.toString()));

    // Người thực hiện vốn đã nhận mọi thông báo của công việc; thêm họ làm người
    // theo dõi chỉ nhân đôi thông báo và thêm một dòng thừa trong danh sách.
    if (assigneeId && candidates.includes(assigneeId)) {
      return res.status(400).json({
        success: false,
        message: 'Người thực hiện đã nhận thông báo của công việc, không cần thêm làm người theo dõi',
      });
    }

    const toAdd = candidates.filter((id) => !current.has(id));
    if (!toAdd.length) {
      return res.status(400).json({ success: false, message: 'Những người này đã theo dõi công việc' });
    }

    // Chặn id trỏ tới tài khoản không tồn tại: mongoose vẫn lưu được, nhưng populate
    // sẽ lặng lẽ bỏ qua, và danh sách hiện ra thiếu người mà không báo lỗi gì.
    const found = await User.find({ _id: { $in: toAdd } }).select('_id');
    if (found.length !== toAdd.length) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách có người dùng không tồn tại',
      });
    }

    if (current.size + toAdd.length > Task.MAX_FOLLOWERS) {
      return res.status(400).json({
        success: false,
        message: `Tối đa ${Task.MAX_FOLLOWERS} người theo dõi trên một công việc`,
      });
    }

    task.followers.push(...toAdd);
    await task.save();
    await task.populate('followers', 'name email avatar');

    toAdd.forEach((recipient) => {
      sendNotification({
        recipient,
        actor: req.user._id,
        type: 'task_follower_added',
        title: 'Được thêm vào theo dõi công việc',
        message: `${req.user.name} đã thêm bạn vào danh sách theo dõi công việc "${task.title}"`,
        entityType: 'task',
        entityId: task._id,
        link: '/tasks',
      });
    });

    res.json({
      success: true,
      data: { followers: task.followers },
      message: `Đã thêm ${toAdd.length} người theo dõi`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa người theo dõi công việc
 * @route   DELETE /api/tasks/:id/followers/:userId
 * @access  Private
 */
const removeFollower = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });

    const before = task.followers.length;
    task.followers = task.followers.filter((f) => f.toString() !== req.params.userId);

    // Trước đây luôn trả 200 kể cả khi người đó chưa từng theo dõi, nên giao diện
    // không phân biệt được "đã gỡ xong" với "gỡ nhầm người".
    if (task.followers.length === before) {
      return res.status(404).json({
        success: false,
        message: 'Người này không nằm trong danh sách theo dõi công việc',
      });
    }

    await task.save();
    await task.populate('followers', 'name email avatar');

    res.json({ success: true, data: { followers: task.followers }, message: 'Đã xóa người theo dõi' });
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Lấy subtasks của một task
 * @route   GET /api/tasks/:id/subtasks
 * @access  Private
 */
const getSubtasks = async (req, res, next) => {
  try {
    const subtasks = await Task.find({ parentTask: req.params.id })
      .populate('assignee', 'name email avatar')
      .populate('followers', 'name email avatar')
      .populate('taskGroup', 'name color')
      .sort('createdAt');

    res.json({ success: true, data: { subtasks } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tạo công việc con (subtask) trực tiếp từ task cha
 * @route   POST /api/tasks/:id/subtasks
 * @access  Private (Cả nhân viên và quản lý cấp cao đều tạo được)
 */
const createSubtask = async (req, res, next) => {
  try {
    const parent = await Task.findById(req.params.id);
    if (!parent) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc cha' });
    }

    const {
      title,
      description,
      assignee,
      priority,
      status,
      estimatedHours,
      actualHours,
      progress,
      startDate,
      endDate,
      requiredSkills,
      followers,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Tiêu đề việc con là bắt buộc' });
    }

    const subtask = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      project: parent.project,
      parentTask: parent._id,
      taskGroup: parent.taskGroup,
      assignee: assignee || undefined,
      followers: Array.isArray(followers) ? followers : [],
      priority: priority || parent.priority || 'medium',
      status: status || 'todo',
      estimatedHours: estimatedHours !== undefined ? Number(estimatedHours) : 2,
      actualHours: actualHours !== undefined ? Number(actualHours) : 0,
      progress: progress !== undefined ? Number(progress) : 0,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
      companyName: parent.companyName || (req.user && req.user.companyName) || 'Công ty Công nghệ RAO',
      createdBy: req.user._id,
    });

    const populated = await Task.findById(subtask._id)
      .populate('assignee', 'name email avatar')
      .populate('followers', 'name email avatar')
      .populate('taskGroup', 'name color');

    // Thông báo cho người phụ trách task cha nếu người tạo là người khác
    if (parent.assignee && parent.assignee.toString() !== req.user._id.toString()) {
      sendNotification({
        recipient: parent.assignee,
        actor: req.user._id,
        type: 'task_subtask_added',
        title: 'Công việc con mới',
        message: `${req.user.name} đã tạo việc con "${populated.title}" trong "${parent.title}"`,
        entityType: 'task',
        entityId: parent._id,
        link: '/tasks',
      });
    }

    res.status(201).json({
      success: true,
      data: { subtask: populated },
      message: 'Tạo công việc con thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật kết quả công việc và đánh dấu hoàn thành (Base Wework 4.3)
 * @route   POST /api/tasks/:id/report-result
 * @access  Private
 */
const reportTaskResult = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    }

    const { summary, deliverableLinks, attachments, actualHours, markAsDone } = req.body;

    task.resultReport = {
      summary: summary || '',
      deliverableLinks: Array.isArray(deliverableLinks) ? deliverableLinks : [],
      attachments: Array.isArray(attachments) ? attachments : [],
      actualHours: typeof actualHours === 'number' ? actualHours : task.actualHours,
      submittedBy: req.user._id,
      submittedAt: new Date(),
    };

    if (typeof actualHours === 'number' && actualHours > 0) {
      task.actualHours = actualHours;
    }

    if (markAsDone) {
      // Dự án bật đánh giá thì nộp báo cáo cũng chỉ đưa việc tới cửa người đánh
      // giá. Để nguyên nhánh cũ là mở một đường vòng: ai nộp báo cáo cũng tự tuyên
      // bố việc mình xong, và bước duyệt thành hình thức.
      const project = await Project.findById(task.project);
      if (project?.reviewConfig?.enabled) {
        task.status = 'review';
        task.completedAt = new Date();
        task.reviewRequestedAt = task.completedAt;
        task.reviewDecision = 'pending';
        task.reviewedAt = null;
        task.reviewedBy = null;
        task.reviewComment = '';
      } else {
        task.status = 'done';
        task.progress = 100;
        task.completedAt = new Date();
      }
    }

    await task.save();
    await recalculateProjectProgress(task.project);
    if (task.assignee) {
      await syncResourceWorkload(task.assignee);
    }

    const populated = await Task.findById(task._id)
      .populate('project', 'name code')
      .populate('assignee', 'name email avatar department')
      .populate('resultReport.submittedBy', 'name email avatar');

    logActivity({
      user: req.user._id,
      action: 'TASK_RESULT_SUBMITTED',
      entityType: 'task',
      entityId: task._id,
      description: `${req.user.name} đã nộp báo cáo kết quả cho "${task.title}"`,
      companyName: task.companyName,
    });

    res.json({
      success: true,
      data: { task: populated },
      message: 'Cập nhật kết quả công việc thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Nhân bản công việc (Base Wework 5.2)
 * @route   POST /api/tasks/:id/duplicate
 * @access  Private
 */
const duplicateTask = async (req, res, next) => {
  try {
    const original = await Task.findById(req.params.id);
    if (!original) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc cần nhân bản' });
    }

    const { targetProjectId, targetTaskGroupId, newTitle } = req.body;
    const targetProject = targetProjectId || original.project;
    const targetGroup = targetTaskGroupId !== undefined ? targetTaskGroupId : original.taskGroup;

    const duplicated = await Task.create({
      title: newTitle || `${original.title} (Bản sao)`,
      description: original.description,
      project: targetProject,
      taskGroup: targetGroup || null,
      assignee: original.assignee,
      followers: original.followers,
      priority: original.priority,
      status: 'todo',
      progress: 0,
      estimatedHours: original.estimatedHours,
      startDate: new Date(),
      endDate: original.endDate,
      requiredSkills: original.requiredSkills,
      checklist: (original.checklist || []).map((c) => ({
        title: c.title,
        assignee: c.assignee,
        isCompleted: false,
        order: c.order,
      })),
      companyName: original.companyName,
      createdBy: req.user._id,
    });

    // Nhân bản cả subtasks con nếu có
    const subtasks = await Task.find({ parentTask: original._id });
    if (subtasks && subtasks.length > 0) {
      for (const sub of subtasks) {
        await Task.create({
          title: `${sub.title} (Bản sao)`,
          description: sub.description,
          project: targetProject,
          taskGroup: targetGroup || null,
          parentTask: duplicated._id,
          assignee: sub.assignee,
          priority: sub.priority,
          status: 'todo',
          progress: 0,
          estimatedHours: sub.estimatedHours,
          checklist: (sub.checklist || []).map((c) => ({
            title: c.title,
            isCompleted: false,
          })),
          companyName: sub.companyName,
          createdBy: req.user._id,
        });
      }
    }

    const populated = await Task.findById(duplicated._id)
      .populate('project', 'name code')
      .populate('assignee', 'name email avatar')
      .populate('taskGroup', 'name color');

    res.status(201).json({
      success: true,
      data: { task: populated },
      message: 'Nhân bản công việc thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Di chuyển công việc sang nhóm hoặc dự án khác (Base Wework 5.3)
 * @route   POST /api/tasks/:id/move
 * @access  Private
 */
const moveTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    }

    const { targetProjectId, targetTaskGroupId } = req.body;
    if (targetProjectId) task.project = targetProjectId;
    if (targetTaskGroupId !== undefined) task.taskGroup = targetTaskGroupId || null;

    await task.save();

    // Đồng bộ chuyển project cho subtasks
    if (targetProjectId) {
      await Task.updateMany(
        { parentTask: task._id },
        { project: targetProjectId, taskGroup: targetTaskGroupId || null }
      );
    }

    const populated = await Task.findById(task._id)
      .populate('project', 'name code')
      .populate('taskGroup', 'name color')
      .populate('assignee', 'name email avatar');

    res.json({
      success: true,
      data: { task: populated },
      message: 'Di chuyển công việc thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Điều chỉnh thời hạn hoàn thành (Deadline) kèm lý do (Base Wework 4.5)
 * @route   PATCH /api/tasks/:id/deadline
 * @access  Private
 */
const updateDeadline = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    }

    const newEndDate = req.body.newEndDate || req.body.dueDate || req.body.endDate;
    const reason = req.body.reason;
    if (!newEndDate) {
      return res.status(400).json({ success: false, message: 'Thời hạn mới là bắt buộc' });
    }

    task.deadlineHistory = task.deadlineHistory || [];
    task.deadlineHistory.push({
      oldEndDate: task.endDate,
      newEndDate: new Date(newEndDate),
      changedBy: req.user._id,
      reason: reason || 'Gia hạn theo yêu cầu công việc',
      changedAt: new Date(),
    });

    task.endDate = new Date(newEndDate);
    await task.save();

    const populated = await Task.findById(task._id)
      .populate('deadlineHistory.changedBy', 'name email avatar');

    res.json({
      success: true,
      data: { task: populated },
      message: 'Cập nhật thời hạn hoàn thành thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tải file mẫu Excel (.xlsx) chuẩn Base Wework (Base Wework 3.3)
 * @route   GET /api/tasks/template-excel
 * @access  Private
 */
const downloadExcelTemplate = async (req, res, next) => {
  try {
    const buffer = generateTaskTemplateWorkbook();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Mau_Cong_Viec_Base_Wework.xlsx"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xem nhanh dữ liệu từ file Excel tải lên (Preview) (Base Wework 3.3)
 * @route   POST /api/tasks/preview-excel
 * @access  Private
 */
const previewExcelTasks = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Vui lòng tải lên file Excel (.xlsx)' });
    }
    const items = parseTaskExcelBuffer(req.file.buffer);
    res.json({
      success: true,
      data: { items, count: items.length },
      message: `Đã phân tích thành công ${items.length} dòng công việc`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Nhập hàng loạt công việc từ file Excel (Base Wework 3.3)
 * @route   POST /api/tasks/import-excel
 * @access  Private
 */
const importExcelTasks = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file Excel để nhập dữ liệu' });
    }
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn dự án tiếp nhận công việc' });
    }

    const companyName = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    const result = await importTasksFromExcel({
      buffer: req.file.buffer,
      projectId,
      companyName,
      createdBy: req.user._id,
    });

    logActivity({
      user: req.user._id,
      action: 'TASKS_IMPORTED_EXCEL',
      entityType: 'project',
      entityId: projectId,
      description: `${req.user.name} đã nhập ${result.totalImported} công việc từ file Excel`,
      companyName,
    });

    res.json({
      success: true,
      data: result,
      message: `Đã nhập thành công ${result.totalImported} công việc vào dự án!`,
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Lấy danh sách công việc nhắc nhở cần hoàn thành (Base Wework Reminders)
 * @route   GET /api/tasks/reminders
 * @access  Private
 * Tham chiếu chuẩn Base Wework: https://help.base.vn/support/solutions/articles/63000252622
 */
const getTaskReminders = async (req, res, next) => {
  try {
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    const companyScope = userCompany === 'Công ty Công nghệ RAO'
      ? { $in: [userCompany, null, undefined] }
      : userCompany;

    // 1. Chỉ lấy các công việc được giao cho chính người dùng đang đăng nhập,
    // bắt buộc phải có thời hạn (deadline) và chưa hoàn thành
    const baseFilter = {
      assignee: req.user._id,
      status: { $ne: 'done' },
      endDate: { $exists: true, $ne: null },
      companyName: companyScope,
    };

    const tasks = await Task.find(baseFilter)
      .populate('project', 'name code color status')
      .populate('taskGroup', 'name color')
      .populate('parentTask', 'title')
      .populate('assignee', 'name email avatar jobTitle')
      .sort({ endDate: 1, priority: -1 });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Mốc thời gian 7 ngày trước và 7 ngày sau thời điểm hiện tại
    const sevenDaysAgoStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysLaterEnd = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Tab 1: "Quan trọng" (Thời hạn trước và sau 7 ngày so với hôm nay)
    const important = tasks.filter((t) => {
      const d = new Date(t.endDate);
      return d >= sevenDaysAgoStart && d <= sevenDaysLaterEnd;
    });

    // Tab 2: "Hôm nay" (Thời hạn trong ngày hôm nay)
    const today = tasks.filter((t) => {
      const d = new Date(t.endDate);
      return d >= todayStart && d <= todayEnd;
    });

    // Tab 3: "Muộn" (Quá hạn nhưng chưa hoàn thành)
    const overdue = tasks.filter((t) => {
      const d = new Date(t.endDate);
      return d < todayStart;
    });

    // Chế độ 4: "Lịch biểu" (Toàn bộ công việc trong Reminders kể cả > 7 ngày)
    const schedule = tasks;

    res.json({
      success: true,
      data: {
        important,
        today,
        overdue,
        schedule,
        counts: {
          important: important.length,
          today: today.length,
          overdue: overdue.length,
          total: schedule.length,
          // Chuẩn Base Wework: Số hiển thị trên reminders cập nhật theo số lượng công việc tại tab Quan trọng
          badgeCount: important.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================================================
// BASE WEWORK — Luồng đánh giá kết quả công việc (Review)
// ==========================================================================

/**
 * Người gọi có quyền kết luận kết quả công việc này không.
 * Admin và quản lý dự án luôn có; ngoài ra là danh sách người đánh giá của công
 * việc, thiếu thì lấy của dự án.
 */
const canApproveReview = (task, project, user) => {
  if (['admin', 'project_manager'].includes(user.role)) return true;
  const managerId = project?.manager?._id || project?.manager;
  if (managerId && managerId.toString() === user._id.toString()) return true;
  return resolveReviewers(task, project).includes(user._id.toString());
};

/**
 * @desc    Người thực hiện báo hoàn thành công việc
 * @route   PATCH /api/tasks/:id/complete
 * @access  Private
 *
 * Dự án tắt đánh giá thì đây vẫn là đường cũ: việc chuyển thẳng sang Hoàn thành.
 * Bật đánh giá thì việc dừng ở Chờ đánh giá — và `completedAt` được ghi ngay tại
 * đây, vì đúng/trễ hạn phải tính theo lúc người làm xong việc, không theo lúc
 * người đánh giá rảnh tay bấm duyệt.
 */
const completeTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });

    if (task.status === 'done') {
      return res.status(400).json({ success: false, message: 'Công việc đã hoàn thành' });
    }

    const project = await Project.findById(task.project);
    const now = new Date();
    const updateData = { completedAt: now };

    if (project?.reviewConfig?.enabled) {
      updateData.status = 'review';
      updateData.reviewRequestedAt = now;
      updateData.reviewDecision = 'pending';
      // Xóa kết quả của vòng đánh giá trước: việc bị trả về rồi nộp lại mà vẫn còn
      // dấu "đã duyệt" cũ thì không ai biết vòng này đã được xem hay chưa.
      updateData.reviewedAt = null;
      updateData.reviewedBy = null;
      updateData.reviewComment = '';
    } else {
      updateData.status = 'done';
      updateData.progress = 100;
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('project', 'name code')
      .populate('assignee', 'name email avatar');

    await recalculateProjectProgress(task.project);
    if (task.assignee) await syncResourceWorkload(task.assignee);

    if (updateData.status === 'review') {
      resolveReviewers(task, project)
        .filter((id) => id !== req.user._id.toString())
        .forEach((recipient) => {
          sendNotification({
            recipient,
            actor: req.user._id,
            type: 'task_review_requested',
            title: 'Công việc chờ bạn đánh giá',
            message: `${req.user.name} đã báo hoàn thành công việc "${task.title}"`,
            entityType: 'task',
            entityId: task._id,
            link: '/tasks',
          });
        });
    }

    logActivity({
      req,
      action: updateData.status === 'review' ? 'TASK_REVIEW_REQUESTED' : 'UPDATE_TASK_STATUS',
      entityType: 'task',
      entityId: task._id,
      entityTitle: task.title,
      description: `${req.user.name} đã báo hoàn thành công việc "${task.title}"`,
      details: { oldStatus: task.status, newStatus: updateData.status },
    });

    res.json({
      success: true,
      data: { task: updated },
      message:
        updateData.status === 'review'
          ? 'Đã gửi công việc sang bước đánh giá'
          : 'Đã hoàn thành công việc',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Người đánh giá duyệt hoặc trả lại công việc
 * @route   POST /api/tasks/:id/review
 * @access  Private
 */
const reviewTask = async (req, res, next) => {
  try {
    const { decision, comment } = req.body;

    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Quyết định đánh giá không hợp lệ' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });

    if (task.status !== 'review') {
      return res.status(400).json({
        success: false,
        message: 'Công việc không ở trạng thái Chờ đánh giá',
      });
    }

    const project = await Project.findById(task.project);
    if (!canApproveReview(task, project, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không nằm trong danh sách người đánh giá của công việc này',
      });
    }

    // Trả lại mà không nói vì sao thì người làm chỉ biết mình "bị từ chối", và vòng
    // sau rất dễ hỏng lại đúng chỗ cũ.
    if (decision === 'reject' && !String(comment || '').trim()) {
      return res.status(400).json({ success: false, message: 'Cần nhập lý do khi trả lại công việc' });
    }

    const now = new Date();
    const approved = decision === 'approve';
    const updateData = {
      reviewedAt: now,
      reviewedBy: req.user._id,
      reviewDecision: approved ? 'approved' : 'rejected',
      reviewComment: String(comment || '').trim(),
      status: approved ? 'done' : 'in_progress',
    };

    if (approved) {
      updateData.progress = 100;
      // Đóng nốt phiếu báo cáo kết quả đã có sẵn trong schema: hai field approvedBy/
      // approvedAt từ trước tới nay chưa có đường nào ghi vào.
      if (task.resultReport?.submittedAt) {
        updateData['resultReport.approvedBy'] = req.user._id;
        updateData['resultReport.approvedAt'] = now;
      }
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('project', 'name code')
      .populate('assignee', 'name email avatar')
      .populate('reviewedBy', 'name email avatar');

    await recalculateProjectProgress(task.project);
    if (task.assignee) await syncResourceWorkload(task.assignee);

    if (task.assignee && task.assignee.toString() !== req.user._id.toString()) {
      sendNotification({
        recipient: task.assignee,
        actor: req.user._id,
        type: approved ? 'task_review_approved' : 'task_review_rejected',
        title: approved ? 'Công việc đã được duyệt' : 'Công việc bị trả lại',
        message: approved
          ? `${req.user.name} đã duyệt công việc "${task.title}"`
          : `${req.user.name} trả lại công việc "${task.title}": ${updateData.reviewComment}`,
        entityType: 'task',
        entityId: task._id,
        link: '/tasks',
      });
    }

    logActivity({
      req,
      action: approved ? 'TASK_REVIEW_APPROVED' : 'TASK_REVIEW_REJECTED',
      entityType: 'task',
      entityId: task._id,
      entityTitle: task.title,
      description: `${req.user.name} đã ${approved ? 'duyệt' : 'trả lại'} công việc "${task.title}"`,
      details: { decision: updateData.reviewDecision, comment: updateData.reviewComment },
    });

    res.json({
      success: true,
      data: { task: updated },
      message: approved ? 'Đã duyệt công việc' : 'Đã trả lại công việc cho người thực hiện',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Danh sách công việc đang chờ đánh giá
 * @route   GET /api/tasks/pending-review
 * @access  Private
 */
const getPendingReviews = async (req, res, next) => {
  try {
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    const companyProjects = await Project.find({
      companyName:
        userCompany === 'Công ty Công nghệ RAO' ? { $in: [userCompany, null, undefined] } : userCompany,
    }).select('_id manager reviewConfig');

    const projectMap = new Map(companyProjects.map((p) => [p._id.toString(), p]));

    const tasks = await Task.find({
      status: 'review',
      project: { $in: companyProjects.map((p) => p._id) },
    })
      .populate('project', 'name code')
      .populate('assignee', 'name email avatar')
      .populate('reviewers', 'name email avatar')
      .sort({ reviewRequestedAt: 1 });

    const now = new Date();
    const visible = tasks
      .filter((task) => canApproveReview(task, projectMap.get(String(task.project?._id || task.project)), req.user))
      .map((task) => {
        const project = projectMap.get(String(task.project?._id || task.project));
        return {
          ...task.toObject(),
          slaHours: project?.reviewConfig?.slaHours || 24,
          isOverdueReview: isReviewOverdue(task, project, now),
          waitingHours: task.reviewRequestedAt
            ? Math.round(((now - new Date(task.reviewRequestedAt)) / 3600000) * 10) / 10
            : null,
        };
      });

    res.json({
      success: true,
      data: {
        tasks: visible,
        total: visible.length,
        overdue: visible.filter((t) => t.isOverdueReview).length,
      },
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================================================
// BASE WEWORK — Bàn giao công việc hàng loạt (Bulk reassign)
// ==========================================================================

/**
 * Điều kiện lọc tập công việc sẽ bị bàn giao.
 *
 * Việc đã `done` hoặc `failed` KHÔNG bao giờ nằm trong tập này: đổi người thực hiện
 * của một việc đã ngã ngũ là viết lại lịch sử ai đã thực sự làm nó.
 */
const buildReassignFilter = ({ fromUserId, projectId, taskIds, projectScopeIds }) => {
  const filter = {
    assignee: fromUserId,
    status: { $nin: CLOSED_STATUSES },
    project: { $in: projectScopeIds },
  };

  if (projectId) filter.project = projectId;
  if (Array.isArray(taskIds) && taskIds.length) filter._id = { $in: taskIds };

  return filter;
};

/** Các dự án thuộc công ty của người đang đăng nhập. */
const companyProjectIds = async (user) => {
  const userCompany = (user && user.companyName) || 'Công ty Công nghệ RAO';
  const projects = await Project.find({
    companyName:
      userCompany === 'Công ty Công nghệ RAO' ? { $in: [userCompany, null, undefined] } : userCompany,
  }).select('_id');
  return projects.map((p) => p._id);
};

/**
 * @desc    Xem trước các công việc sẽ bị bàn giao
 * @route   GET /api/tasks/reassign-preview
 * @access  Admin, Project Manager
 *
 * Bắt buộc gọi trước khi bàn giao thật: một lệnh đổi nhầm phạm vi có thể cuốn theo
 * hàng chục công việc ở dự án không liên quan, và không có bước xem trước thì người
 * bấm nút chỉ biết điều đó sau khi đã xong.
 */
const previewReassign = async (req, res, next) => {
  try {
    const { fromUserId, projectId } = req.query;

    if (!fromUserId || !mongoose.Types.ObjectId.isValid(fromUserId)) {
      return res.status(400).json({ success: false, message: 'Thiếu hoặc sai người bàn giao' });
    }

    const scopeIds = await companyProjectIds(req.user);
    const tasks = await Task.find(buildReassignFilter({ fromUserId, projectId, projectScopeIds: scopeIds }))
      .populate('project', 'name code')
      .select('title status priority startDate endDate estimatedHours project reviewers')
      .sort({ endDate: 1 });

    const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

    res.json({
      success: true,
      data: {
        tasks,
        total: tasks.length,
        totalEstimatedHours: Math.round(totalHours * 10) / 10,
        byStatus: tasks.reduce((acc, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        }, {}),
        // Nói thẳng cái không nằm trong tập, thay vì để người dùng tự đoán vì sao
        // con số nhỏ hơn họ tưởng.
        excludedNote: 'Công việc đã Hoàn thành hoặc Thất bại không được bàn giao',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bàn giao hàng loạt công việc từ người này sang người khác
 * @route   POST /api/tasks/bulk-reassign
 * @access  Admin, Project Manager
 */
const bulkReassign = async (req, res, next) => {
  try {
    const { fromUserId, toUserId, projectId, taskIds, reason } = req.body;

    if (!fromUserId || !mongoose.Types.ObjectId.isValid(fromUserId)) {
      return res.status(400).json({ success: false, message: 'Thiếu hoặc sai người bàn giao' });
    }
    if (!toUserId || !mongoose.Types.ObjectId.isValid(toUserId)) {
      return res.status(400).json({ success: false, message: 'Thiếu hoặc sai người nhận bàn giao' });
    }
    if (String(fromUserId) === String(toUserId)) {
      return res.status(400).json({ success: false, message: 'Người bàn giao và người nhận phải khác nhau' });
    }

    const recipient = await User.findById(toUserId).select('_id name isActive');
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người nhận bàn giao' });
    }
    if (recipient.isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Không bàn giao được cho tài khoản đã bị vô hiệu hóa',
      });
    }

    const scopeIds = await companyProjectIds(req.user);
    const filter = buildReassignFilter({ fromUserId, projectId, taskIds, projectScopeIds: scopeIds });

    const tasks = await Task.find(filter).select('_id title status project');
    if (!tasks.length) {
      return res.status(400).json({
        success: false,
        message: 'Không có công việc nào phù hợp để bàn giao',
      });
    }

    // Chỉ đổi người thực hiện. `reviewers` cố ý giữ nguyên kể cả với việc đang chờ
    // đánh giá: người nộp và người duyệt là hai vai khác nhau, gộp lại thì người mới
    // có thể tự duyệt việc vừa nhận.
    const movedIds = tasks.map((t) => t._id);
    await Task.updateMany({ _id: { $in: movedIds } }, { assignee: toUserId });

    await recalculateProjectProgressFor(tasks);
    await syncResourceWorkload([fromUserId, toUserId]);

    sendNotification({
      recipient: toUserId,
      actor: req.user._id,
      type: 'task_assigned',
      title: 'Bạn được bàn giao công việc',
      message: `${req.user.name} đã bàn giao ${movedIds.length} công việc cho bạn${
        reason ? `: ${reason}` : ''
      }`,
      entityType: 'task',
      entityId: movedIds[0],
      link: '/tasks',
    });

    // Một bản ghi cho cả lô, không phải mỗi việc một dòng: thao tác này là một quyết
    // định duy nhất, và tách ra thành 40 dòng sẽ chôn vùi nhật ký của mọi thứ khác.
    logActivity({
      req,
      action: 'BULK_REASSIGN',
      entityType: 'task',
      entityId: movedIds[0],
      entityTitle: `${movedIds.length} công việc`,
      description: `${req.user.name} đã bàn giao ${movedIds.length} công việc sang người khác`,
      details: {
        fromUserId: String(fromUserId),
        toUserId: String(toUserId),
        projectId: projectId ? String(projectId) : null,
        taskIds: movedIds.map(String),
        reason: reason || '',
      },
    });

    res.json({
      success: true,
      data: {
        movedCount: movedIds.length,
        taskIds: movedIds,
        // RAO có solver phân bổ, nên sau khi bàn giao thì kiểm tra người nhận có quá
        // tải không là việc làm được ngay — nhưng chỉ gợi ý, không tự chạy: đây là
        // thao tác bàn giao, không phải lệnh tối ưu hóa lại cả dự án.
        suggestion: {
          message: 'Nên kiểm tra tải của người nhận sau khi bàn giao',
          endpoint: `/api/optimization/readiness${projectId ? `?projectId=${projectId}` : ''}`,
        },
      },
      message: `Đã bàn giao ${movedIds.length} công việc`,
    });
  } catch (error) {
    next(error);
  }
};

/** Tính lại tiến độ cho mọi dự án có công việc vừa đổi chủ. */
const recalculateProjectProgressFor = async (tasks) => {
  const projectIds = [...new Set(tasks.map((t) => String(t.project)).filter(Boolean))];
  for (const id of projectIds) {
    await recalculateProjectProgress(id);
  }
};

// Re-export tất cả bao gồm các endpoint mới
module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTaskSummary,
  addComment,
  deleteComment,
  addChecklistItem,
  toggleChecklistItem,
  removeChecklistItem,
  addFollower,
  removeFollower,
  getSubtasks,
  createSubtask,
  // Base Wework endpoints:
  reportTaskResult,
  duplicateTask,
  moveTask,
  updateDeadline,
  downloadExcelTemplate,
  previewExcelTasks,
  importExcelTasks,
  getTaskReminders,
  completeTask,
  reviewTask,
  getPendingReviews,
  previewReassign,
  bulkReassign,
};

