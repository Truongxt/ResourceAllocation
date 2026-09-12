const RecurringTask = require('../models/RecurringTask');
const Task = require('../models/Task');
const Project = require('../models/Project');
const {
  calculateNextRunDate,
  getPreviewDates,
} = require('../services/recurringTask.service');
const { logActivity } = require('../services/activityLog.service');

/**
 * @desc    Lấy danh sách công việc lặp lại
 * @route   GET /api/recurring-tasks
 * @access  Private
 */
const getRecurringTasks = async (req, res, next) => {
  try {
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    const filter = {
      companyName: userCompany === 'Công ty Công nghệ RAO' ? { $in: [userCompany, null, undefined] } : userCompany,
    };

    if (req.query.project) {
      filter.project = req.query.project;
    }

    const items = await RecurringTask.find(filter)
      .populate('project', 'name code')
      .populate('taskGroup', 'name color')
      .populate('assignee', 'name email avatar')
      .populate('followers', 'name email avatar')
      .sort('-createdAt');

    res.json({
      success: true,
      count: items.length,
      data: { recurringTasks: items },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tạo mới thiết lập công việc lặp lại
 * @route   POST /api/recurring-tasks
 * @access  Private (Admin / PM)
 */
const createRecurringTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      project,
      taskGroup,
      assignee,
      followers,
      priority,
      estimatedHours,
      checklist,
      subtasks,
      frequency,
      interval,
      daysOfWeek,
      dayOfMonth,
      durationHours,
      startDate,
      endDate,
    } = req.body;

    const companyName = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';

    const config = {
      frequency,
      interval: Number(interval) || 1,
      daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : [],
      dayOfMonth: Number(dayOfMonth) || 1,
      startDate: startDate || new Date(),
      endDate: endDate || null,
    };

    const nextRun = calculateNextRunDate(config, new Date(config.startDate));

    const item = await RecurringTask.create({
      title,
      description,
      project,
      taskGroup: taskGroup || null,
      assignee: assignee || null,
      followers: Array.isArray(followers) ? followers : [],
      priority: priority || 'medium',
      estimatedHours: Number(estimatedHours) || 8,
      checklist: Array.isArray(checklist) ? checklist : [],
      subtasks: Array.isArray(subtasks) ? subtasks : [],
      frequency: frequency || 'weekly',
      interval: Number(interval) || 1,
      daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : [],
      dayOfMonth: Number(dayOfMonth) || 1,
      durationHours: Number(durationHours) || 8,
      startDate: new Date(config.startDate),
      endDate: config.endDate ? new Date(config.endDate) : null,
      nextRunDate: nextRun,
      companyName,
      createdBy: req.user._id,
    });

    const populated = await RecurringTask.findById(item._id)
      .populate('project', 'name code')
      .populate('taskGroup', 'name color')
      .populate('assignee', 'name email avatar');

    logActivity({
      user: req.user._id,
      action: 'RECURRING_TASK_CREATED',
      entityType: 'project',
      entityId: project,
      description: `${req.user.name} đã thiết lập công việc lặp lại "${title}" (${frequency})`,
      companyName,
    });

    res.status(201).json({
      success: true,
      data: { recurringTask: populated },
      message: 'Thiết lập công việc lặp lại thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật công việc lặp lại
 * @route   PUT /api/recurring-tasks/:id
 * @access  Private (Admin / PM)
 */
const updateRecurringTask = async (req, res, next) => {
  try {
    const item = await RecurringTask.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cấu hình công việc lặp lại' });
    }

    Object.assign(item, req.body);

    if (req.body.frequency || req.body.daysOfWeek || req.body.dayOfMonth || req.body.startDate) {
      item.nextRunDate = calculateNextRunDate(item, item.lastGeneratedAt || item.startDate);
    }

    await item.save();

    const populated = await RecurringTask.findById(item._id)
      .populate('project', 'name code')
      .populate('taskGroup', 'name color')
      .populate('assignee', 'name email avatar');

    res.json({
      success: true,
      data: { recurringTask: populated },
      message: 'Cập nhật cấu hình công việc lặp lại thành công',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa công việc lặp lại
 * @route   DELETE /api/recurring-tasks/:id
 * @access  Private (Admin / PM)
 */
const deleteRecurringTask = async (req, res, next) => {
  try {
    const item = await RecurringTask.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cấu hình công việc lặp lại' });
    }

    await item.deleteOne();

    res.json({
      success: true,
      message: 'Đã xóa cấu hình công việc lặp lại',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xem trước 10 lần sinh sắp tới
 * @route   POST /api/recurring-tasks/preview
 * @access  Private
 */
const previewSchedule = async (req, res, next) => {
  try {
    const dates = getPreviewDates(req.body, 10);
    res.json({
      success: true,
      data: { dates },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Kích hoạt sinh ngay lập tức 1 công việc từ cấu hình lặp lại
 * @route   POST /api/recurring-tasks/:id/run-now
 * @access  Private (Admin / PM)
 */
const triggerRunNow = async (req, res, next) => {
  try {
    const item = await RecurringTask.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cấu hình công việc lặp lại' });
    }

    const now = new Date();
    const taskEnd = new Date(now.getTime() + (item.durationHours || 8) * 3600 * 1000);

    const newTask = await Task.create({
      title: item.title,
      description: item.description,
      project: item.project,
      taskGroup: item.taskGroup,
      assignee: item.assignee,
      followers: item.followers,
      priority: item.priority,
      estimatedHours: item.estimatedHours,
      startDate: now,
      endDate: taskEnd,
      status: 'todo',
      progress: 0,
      checklist: (item.checklist || []).map((c, idx) => ({
        title: c.title,
        assignee: c.assignee || item.assignee,
        isCompleted: false,
        order: idx,
      })),
      companyName: item.companyName,
      createdBy: req.user._id,
      recurringTaskId: item._id,
    });

    if (item.subtasks && item.subtasks.length > 0) {
      for (const sub of item.subtasks) {
        await Task.create({
          title: sub.title,
          project: item.project,
          taskGroup: item.taskGroup,
          parentTask: newTask._id,
          assignee: sub.assignee || item.assignee,
          priority: item.priority,
          estimatedHours: sub.estimatedHours || 2,
          startDate: now,
          endDate: taskEnd,
          status: 'todo',
          progress: 0,
          companyName: item.companyName,
          createdBy: req.user._id,
          recurringTaskId: item._id,
        });
      }
    }

    item.lastGeneratedAt = now;
    item.nextRunDate = calculateNextRunDate(item, now);
    await item.save();

    res.status(201).json({
      success: true,
      data: { task: newTask },
      message: 'Đã sinh công việc mới thành công từ chu kỳ lặp lại',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecurringTasks,
  createRecurringTask,
  updateRecurringTask,
  deleteRecurringTask,
  previewSchedule,
  triggerRunNow,
};
