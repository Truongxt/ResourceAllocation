/**
 * Công việc — danh sách, chi tiết, tạo, sửa, đổi trạng thái, xóa, thống kê.
 *
 * Tách từ `task.controller.js` — route vẫn lấy handler qua file đó.
 */

const { toSearchRegex } = require('../../utils/escapeRegex');
const Task = require('../../models/Task');
const Project = require('../../models/Project');
const User = require('../../models/User');
const { sendNotification } = require('../../services/socket.service');
const { logActivity } = require('../../services/activityLog.service');
const { syncResourceWorkload } = require('../../services/workload.service');
const { placementError, inactiveProjectIds } = require('../../services/projectLifecycle.service');
const { removeAttachments } = require('../../services/attachment.service');
const { mergeCustomValues, customValueFilter } = require('../../services/customFields.service');
const {
  companyOf,
  stripProtected,
  taskRefsError,
} = require('../../services/companyRefs.service');
const { validateStatusTransition, statusChangeFields } = require('../../services/taskStatus.service');
const { normalizeDependencies } = require('../../services/taskDependency.service');
const {
  STATUS_TRAIL_FIELDS,
  companyProjectScope,
  recalculateProjectProgress,
  notifyTaskFailed,
  notifyDeadlineChanged,
  validateDependencies,
  canApproveReview,
} = require('./shared');

/**
 * @desc    Lấy danh sách tasks (filter theo project, status, assignee, search)
 * @route   GET /api/tasks
 * @access  Private
 */
const getTasks = async (req, res, next) => {
  try {
    // `cf_<key>=<giá trị>`: lọc theo trường tùy chỉnh. Kiểm `key` trước khi ghép vào đường dẫn.
    const custom = customValueFilter(req.query);
    if (custom.error) return res.status(400).json({ success: false, message: custom.error });
    const filter = { ...custom.filter };
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';

    const companyProjects = await Project.find({
      companyName: userCompany === 'Công ty Công nghệ RAO' ? { $in: [userCompany, null, undefined] } : userCompany,
    }).select('_id');
    const companyProjectIds = companyProjects.map((p) => p._id);

    if (req.user && (req.user.role === 'admin' || req.user.isOwner)) {
      filter.project = { $in: companyProjectIds };
    } else {
      const accessibleProjects = await Project.find({
        _id: { $in: companyProjectIds },
        $or: [
          { manager: req.user._id },
          { 'members.user': req.user._id },
          { createdBy: req.user._id },
          { projectType: 'internal' },
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
      const regex = toSearchRegex(req.query.search);
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

    // Mẫu và dự án lưu trữ rút khỏi danh sách mặc định. Lọc đích danh `?project=` thì
    // vẫn xem được — trang chi tiết dự án lưu trữ, Gantt của một mẫu.
    if (!req.query.project) {
      const inactive = await inactiveProjectIds(companyProjectScope(userCompany));
      if (inactive.length) {
        filter.$and = [...(filter.$and || []), { project: { $nin: inactive } }];
      }
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const skip = (page - 1) * limit;
    const sort = req.query.sort || '-createdAt';

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('project', 'name code status permissions members manager companyName')
        .populate('assignee', 'name email avatar department')
        .populate('dependencies.task', 'title status')
        .populate('taskGroup', 'name color order')
        .populate('followers', 'name email avatar')
        .populate('parentTask', 'title status')
        .populate('resultReport.submittedBy', 'name email avatar')
        .populate('resultReport.approvedBy', 'name email avatar')
      .populate('reviewedBy', 'name email avatar')
      .populate('reviewers', 'name email avatar')
      .populate('failedBy', 'name email avatar')
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
      .populate('project', 'name code status members manager permissions failureConfig reviewConfig companyName isArchived customFields')
      .populate('assignee', 'name email avatar department')
      .populate('dependencies.task', 'title status priority startDate endDate progress')
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

    // `flattenMaps`: `customValues` là Map, để nguyên thì JSON hóa thành `{}`.
    const taskObj = task.toObject({ flattenMaps: true });
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

    const placement = placementError(project, { assignee: req.body.assignee });
    if (placement) return res.status(placement.status).json({ success: false, message: placement.message });

    // assignee/followers/reviewers phải cùng công ty, taskGroup/parentTask phải cùng dự án
    const refError = await taskRefsError(req.body, { projectId: project._id, company: companyOf(project) });
    if (refError) {
      return res.status(400).json({ success: false, message: refError });
    }

    const depError = await validateDependencies(req.body.dependencies, {
      taskId: null,
      projectId: project._id,
    });
    if (depError) {
      return res.status(400).json({ success: false, message: depError });
    }
    if (req.body.dependencies !== undefined) {
      const normalized = normalizeDependencies(req.body.dependencies);
      if (!normalized.ok) {
        return res.status(400).json({ success: false, message: normalized.message });
      }
      req.body.dependencies = normalized.value;
    }

    // Có body `customValues` hay không cũng phải kiểm: dự án có trường bắt buộc thì tạo việc
    // thiếu nó là sai, dù client không biết gì về trường tùy chỉnh.
    const custom = mergeCustomValues(project.customFields, req.body.customValues, {});
    if (custom.error) return res.status(400).json({ success: false, message: custom.error });
    req.body.customValues = Object.keys(custom.values).length ? custom.values : undefined;

    const taskData = {
      ...req.body,
      // Gắn công ty theo DỰ ÁN chứa nó, như `createSubtask` gắn theo task cha.
      //
      // Thiếu dòng này, mọi công việc đều rơi vào `default` của schema là
      // "Công ty Công nghệ RAO", bất kể nó thuộc công ty nào. Trang Công việc không
      // lộ ra vì nó lọc theo công ty của *dự án*, nhưng `optimization.controller`
      // lọc thẳng theo `Task.companyName`: chạy tối ưu phạm vi toàn công ty báo 0
      // công việc trong khi chạy theo từng dự án vẫn thấy đủ.
      companyName: project.companyName || userCompany,
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
      .populate('dependencies.task', 'title status')
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

    const placement = placementError(project, { assignee: req.body.assignee });
    if (placement) return res.status(placement.status).json({ success: false, message: placement.message });

    // Không cho đổi công ty qua body, và mọi tham chiếu mới phải cùng công ty/dự án
    stripProtected(req.body);
    const refError = await taskRefsError(req.body, { projectId: task.project, company: companyOf(project) });
    if (refError) {
      return res.status(400).json({ success: false, message: refError });
    }

    if (req.body.dependencies !== undefined) {
      const depError = await validateDependencies(req.body.dependencies, {
        taskId: task._id,
        projectId: task.project,
      });
      if (depError) {
        return res.status(400).json({ success: false, message: depError });
      }
      const normalized = normalizeDependencies(req.body.dependencies);
      if (!normalized.ok) {
        return res.status(400).json({ success: false, message: normalized.message });
      }
      req.body.dependencies = normalized.value;
    }

    // Vết của luồng trạng thái chỉ do server ghi. Nhận từ body thì gửi `completedAt` sớm
    // hơn deadline là biến việc trễ thành đúng hạn trong báo cáo kết quả.
    STATUS_TRAIL_FIELDS.forEach((field) => delete req.body[field]);
    const failureReason = req.body.failureReason;
    delete req.body.failureReason;

    // Form sửa công việc luôn gửi kèm `status`. Khi nó thật sự đổi trạng thái thì phải
    // qua đúng chốt của PATCH /:id/status — thiếu đoạn này, PUT là đường vòng qua cả ba
    // lớp chặn (đánh giá, lý do Thất bại, dự án bật Thất bại) và không ghi vết nào.
    const statusChanging = req.body.status !== undefined && req.body.status !== task.status;
    if (statusChanging) {
      const check = validateStatusTransition({
        currentStatus: task.status,
        nextStatus: req.body.status,
        project,
        failureReason,
        isReviewer: canApproveReview(task, project, req.user),
      });
      if (!check.valid) {
        return res.status(400).json({ success: false, message: check.message });
      }
      Object.assign(req.body, statusChangeFields({ task, nextStatus: req.body.status, failureReason, userId: req.user._id }));
    }

    // Chỉ kiểm (cả trường bắt buộc) khi lần sửa này có đụng tới `customValues`: đổi trạng thái
    // hay kéo Kanban không được bị chặn vì dự án vừa thêm một trường bắt buộc.
    if (req.body.customValues !== undefined) {
      const custom = mergeCustomValues(project?.customFields, req.body.customValues, task.customValues);
      if (custom.error) return res.status(400).json({ success: false, message: custom.error });
      req.body.customValues = custom.values;
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
      .populate('dependencies.task', 'title status')
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

    // Cùng điều kiện với việc ghi `deadlineHistory` ở trên: gửi lại đúng ngày cũ thì im.
    const deadlineEntry = updateData.$push?.deadlineHistory;
    if (deadlineEntry) {
      notifyDeadlineChanged(updatedTask, req.user, deadlineEntry.oldEndDate, deadlineEntry.newEndDate, req.body.deadlineReason);
    }
    if (statusChanging && updatedTask.status === 'failed') {
      notifyTaskFailed(updatedTask, req.user);
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

    const updateData = statusChangeFields({ task, nextStatus: status, failureReason, userId: req.user._id });

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

    if (status === 'failed') {
      // Thay hẳn thông báo đổi trạng thái chung bên dưới, để không ai nhận hai lần.
      notifyTaskFailed(updatedTask, req.user);
    } else if (
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
      { 'dependencies.task': task._id },
      { $pull: { dependencies: { task: task._id } } }
    );

    await task.deleteOne();
    await removeAttachments({ task: task._id });

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
    } else {
      // Cùng luật với `getTasks`: mẫu và dự án lưu trữ không nằm trong số liệu mặc định.
      const inactive = await inactiveProjectIds(companyProjectScope(userCompany));
      if (inactive.length) filter.$and = [...(filter.$and || []), { project: { $nin: inactive } }];
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
