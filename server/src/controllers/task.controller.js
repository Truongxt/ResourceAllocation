const Task = require('../models/Task');
const Project = require('../models/Project');
const { sendNotification } = require('../services/socket.service');
const { logActivity } = require('../services/activityLog.service');

/**
 * Helper: Tính lại progress dự án dựa trên tasks
 */
const recalculateProjectProgress = async (projectId) => {
  const tasks = await Task.find({ project: projectId }).select('progress status');
  if (!tasks.length) {
    await Project.findByIdAndUpdate(projectId, { progress: 0 });
    return;
  }
  const total = tasks.reduce((sum, t) => sum + (t.status === 'done' ? 100 : (t.progress || 0)), 0);
  const progress = Math.round(total / tasks.length);
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

    if (req.query.project) filter.project = req.query.project;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.assignee) filter.assignee = req.query.assignee;

    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      filter.$or = [{ title: regex }, { description: regex }];
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const skip = (page - 1) * limit;
    const sort = req.query.sort || '-createdAt';

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('project', 'name code status')
        .populate('assignee', 'name email avatar department')
        .populate('dependencies', 'title status')
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
      .populate('project', 'name code status members manager')
      .populate('assignee', 'name email avatar department')
      .populate('dependencies', 'title status priority startDate endDate progress')
      .populate('createdBy', 'name email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công việc',
      });
    }

    res.json({
      success: true,
      data: { task },
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

    // Recalculate project progress
    await recalculateProjectProgress(project._id);

    const populated = await Task.findById(task._id)
      .populate('project', 'name code status')
      .populate('assignee', 'name email avatar department')
      .populate('dependencies', 'title status');

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

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('project', 'name code status')
      .populate('assignee', 'name email avatar department')
      .populate('dependencies', 'title status');

    // Recalculate project progress
    await recalculateProjectProgress(task.project);

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
    const { status } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công việc',
      });
    }

    const updateData = { status };
    if (status === 'done') updateData.progress = 100;
    if (status === 'todo') updateData.progress = 0;

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('project', 'name code status')
      .populate('assignee', 'name email avatar department');

    await recalculateProjectProgress(task.project);

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
      action: 'UPDATE_TASK_STATUS',
      entityType: 'task',
      entityId: updatedTask._id,
      entityTitle: updatedTask.title,
      description: `Đổi trạng thái công việc "${updatedTask.title}" sang "${status}"`,
      details: { oldStatus: task.status, newStatus: status },
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

    const projectId = task.project;

    // Remove this task from other tasks' dependencies
    await Task.updateMany(
      { dependencies: task._id },
      { $pull: { dependencies: task._id } }
    );

    await task.deleteOne();

    // Recalculate project progress
    await recalculateProjectProgress(projectId);

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
 * @desc    Lấy thống kê tasks tổng quan
 * @route   GET /api/tasks/stats/summary
 * @access  Private
 */
const getTaskSummary = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.project) filter.project = req.query.project;

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
