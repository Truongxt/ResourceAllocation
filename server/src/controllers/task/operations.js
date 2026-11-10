/**
 * Công việc — báo cáo kết quả, nhân bản, di chuyển, đổi hạn, nhập Excel, nhắc việc.
 *
 * Tách từ `task.controller.js` — route vẫn lấy handler qua file đó.
 */

const mongoose = require('mongoose');
const Task = require('../../models/Task');
const Project = require('../../models/Project');
const TaskGroup = require('../../models/TaskGroup');
const { logActivity } = require('../../services/activityLog.service');
const { syncResourceWorkload } = require('../../services/workload.service');
const { createDeniedReason } = require('../../middleware/taskAccess');
const { placementError } = require('../../services/projectLifecycle.service');
const {
  companyOf,
  projectRef,
  taskGroupError,
} = require('../../services/companyRefs.service');
const {
  generateTaskTemplateWorkbook,
  parseTaskExcelBuffer,
  importTasksFromExcel,
} = require('../../services/excelTaskImport.service');
const {
  recalculateProjectProgress,
  notifyDeadlineChanged,
  validateDependencies,
} = require('./shared');

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

    // deliverableLinks/attachments là mảng subdocument { title/name, url }. Gửi
    // mảng chuỗi thay vì mảng object khiến Mongoose ném CastError nguyên văn
    // tiếng Anh ("Cast to embedded failed... ObjectParameterError") lộ path
    // schema — chặn sớm ở đây bằng thông báo tiếng Việt như các validate khác.
    const isPlainObjectArray = (value) =>
      value === undefined || (Array.isArray(value) && value.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item)));

    if (!isPlainObjectArray(deliverableLinks)) {
      return res.status(400).json({
        success: false,
        message: 'deliverableLinks phải là mảng đối tượng dạng { title, url }',
      });
    }
    if (!isPlainObjectArray(attachments)) {
      return res.status(400).json({
        success: false,
        message: 'attachments phải là mảng đối tượng dạng { name, url, size }',
      });
    }

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
    // Nhóm của bản gốc chỉ còn hợp lệ khi bản sao vẫn ở dự án cũ
    const changesProject = Boolean(targetProjectId) && String(targetProjectId) !== String(original.project);
    const targetGroup = targetTaskGroupId !== undefined ? targetTaskGroupId : changesProject ? null : original.taskGroup;

    // Cùng luật với `moveTask`: dự án đích đi trong body nên phải tự kiểm — nhân bản
    // sang dự án công ty khác là chép nguyên nội dung công việc cho công ty đó đọc.
    let targetCompany = original.companyName;
    // Nhân bản vào mẫu thì bỏ người: việc trong mẫu không bao giờ có người thực hiện.
    let intoTemplate = false;
    if (changesProject) {
      const { error, status, project } = await projectRef(targetProjectId, companyOf(req.user));
      if (error) return res.status(status || 400).json({ success: false, message: error });
      const denied = createDeniedReason(req.user, project);
      if (denied) {
        return res.status(403).json({ success: false, message: `Không thể nhân bản sang dự án này: ${denied}` });
      }
      const placement = placementError(project);
      if (placement) return res.status(placement.status).json({ success: false, message: placement.message });
      intoTemplate = Boolean(project.isTemplate);
      targetCompany = companyOf(project);
    }
    const groupError = await taskGroupError(targetGroup, targetProject);
    if (groupError) return res.status(400).json({ success: false, message: groupError });

    const duplicated = await Task.create({
      title: newTitle || `${original.title} (Bản sao)`,
      description: original.description,
      project: targetProject,
      taskGroup: targetGroup || null,
      assignee: intoTemplate ? null : original.assignee,
      followers: intoTemplate ? [] : original.followers,
      priority: original.priority,
      status: 'todo',
      progress: 0,
      estimatedHours: original.estimatedHours,
      startDate: new Date(),
      endDate: original.endDate,
      requiredSkills: original.requiredSkills,
      // Giá trị trường tùy chỉnh bám theo định nghĩa của dự án: sang dự án khác thì bỏ.
      customValues: changesProject ? undefined : original.customValues,
      checklist: (original.checklist || []).map((c) => ({
        title: c.title,
        assignee: c.assignee,
        isCompleted: false,
        order: c.order,
      })),
      companyName: targetCompany,
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
          assignee: intoTemplate ? null : sub.assignee,
          priority: sub.priority,
          status: 'todo',
          progress: 0,
          estimatedHours: sub.estimatedHours,
          checklist: (sub.checklist || []).map((c) => ({
            title: c.title,
            isCompleted: false,
          })),
          companyName: targetCompany,
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

    if (targetProjectId && String(targetProjectId) !== String(task.project)) {
      const targetProject = await Project.findById(targetProjectId);
      if (!targetProject) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy dự án đích' });
      }

      // `canMoveTask` và `router.param('id')` chỉ soi công việc NGUỒN; dự án đích đi
      // trong body nên phải tự kiểm. Chuyển việc vào dự án cũng là thêm việc vào đó,
      // nên dùng đúng luật của tạo mới — kể cả chốt công ty áp cho admin/PM.
      const userCompany = req.user.companyName || 'Công ty Công nghệ RAO';
      if (targetProject.companyName && targetProject.companyName !== userCompany && req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Không thể chuyển công việc sang dự án của công ty khác',
        });
      }
      const denied = createDeniedReason(req.user, targetProject);
      if (denied) {
        return res.status(403).json({ success: false, message: `Không thể chuyển sang dự án này: ${denied}` });
      }
      const placement = placementError(targetProject, { assignee: task.assignee });
      if (placement) return res.status(placement.status).json({ success: false, message: placement.message });

      // Tiền nhiệm của task giữ nguyên tham chiếu tới dự án cũ khi chuyển dự án
      // — cùng lỗi mà POST /tasks đã chặn bằng 400, nên chuyển dự án cũng phải
      // chặn tương tự thay vì để lại dependency trỏ khác dự án.
      const depError = await validateDependencies(task.dependencies, {
        taskId: task._id,
        projectId: targetProjectId,
      });
      if (depError) {
        return res.status(400).json({
          success: false,
          message: `Không thể chuyển dự án: ${depError}. Hãy gỡ tiền nhiệm trước khi chuyển.`,
        });
      }

      // Chiều ngược lại cũng phải kiểm: công việc ở dự án CŨ đang phụ thuộc vào
      // công việc này. Kiểm tra bên trên chỉ soi tiền nhiệm của chính nó, nên
      // trước đây chuyển đi là bỏ lại một loạt hậu nhiệm trỏ sang dự án khác —
      // đúng cái bất biến mà chính đoạn code này đang cố giữ, chỉ là nhìn sót
      // một chiều.
      //
      // Công việc con theo cha sang dự án mới nên không tính là hậu nhiệm kẹt lại.
      const subtaskIds = (await Task.find({ parentTask: task._id }).select('_id')).map((t) => t._id);
      const movingIds = [task._id, ...subtaskIds].map(String);

      const successors = await Task.find({
        'dependencies.task': task._id,
        _id: { $nin: movingIds },
      }).select('title project');

      const stranded = successors.filter(
        (s) => String(s.project) !== String(targetProjectId)
      );

      if (stranded.length > 0) {
        const names = stranded.slice(0, 3).map((s) => `"${s.title}"`).join(', ');
        const more = stranded.length > 3 ? ` và ${stranded.length - 3} công việc khác` : '';
        return res.status(400).json({
          success: false,
          message:
            `Không thể chuyển dự án: ${names}${more} đang phụ thuộc vào công việc này ` +
            `và sẽ ở lại dự án cũ. Hãy gỡ phụ thuộc hoặc chuyển chúng cùng lúc.`,
        });
      }

      task.project = targetProjectId;
      // Định nghĩa trường tùy chỉnh thuộc dự án cũ: giữ lại thì thành giá trị mồ côi.
      task.customValues = undefined;
    }

    // Nhóm đích phải thuộc đúng dự án mà công việc sẽ nằm sau khi chuyển — nếu không,
    // công việc "thuộc" một dự án nhưng nằm trong nhóm của dự án khác (kể cả công ty khác).
    if (targetTaskGroupId) {
      const group = await TaskGroup.findById(targetTaskGroupId).select('project');
      if (!group || String(group.project) !== String(task.project)) {
        return res.status(400).json({
          success: false,
          message: 'Nhóm công việc đích không thuộc dự án của công việc',
        });
      }
    }
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

    const oldEndDate = task.endDate;
    task.endDate = new Date(newEndDate);
    await task.save();

    notifyDeadlineChanged(task, req.user, oldEndDate, task.endDate, reason);

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
 * @route   GET /api/tasks/excel/template
 * @access  Private
 */
const downloadExcelTemplate = async (req, res, next) => {
  try {
    // `?project=`: mẫu kèm sẵn các cột trường tùy chỉnh của dự án đó (cùng công ty mới được đọc).
    let customFields = [];
    if (req.query.project) {
      if (!mongoose.isValidObjectId(req.query.project)) {
        return res.status(400).json({ success: false, message: 'ID dự án không hợp lệ' });
      }
      const project = await Project.findById(req.query.project).select('companyName customFields');
      const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
      if (!project || (project.companyName && project.companyName !== userCompany)) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
      }
      customFields = project.customFields || [];
    }
    const buffer = generateTaskTemplateWorkbook(customFields);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Mau_Cong_Viec_Base_Wework.xlsx"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xem nhanh dữ liệu từ file Excel tải lên (Preview) (Base Wework 3.3)
 * @route   POST /api/tasks/excel/preview
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
 * @route   POST /api/tasks/excel/import
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

    // Cùng hai chốt như `createTask`. `projectId` đi trong form multipart nên
    // `router.param('id')` không che được — thiếu đoạn này thì công ty khác ghi
    // được hàng loạt công việc vào dự án chỉ bằng id.
    const project = await Project.findById(projectId).select('companyName isArchived isTemplate customFields');
    if (!project) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
    }
    const userCompany = (req.user && req.user.companyName) || 'Công ty Công nghệ RAO';
    if (project.companyName && project.companyName !== userCompany && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền nhập công việc vào dự án của công ty khác',
      });
    }

    const placement = placementError(project);
    if (placement) return res.status(placement.status).json({ success: false, message: placement.message });

    // Gắn công ty theo dự án chứa công việc, như `createTask`
    const companyName = project.companyName || userCompany;
    const result = await importTasksFromExcel({
      buffer: req.file.buffer,
      projectId,
      companyName,
      createdBy: req.user._id,
      // Nhập vào mẫu thì bỏ cột người thực hiện và người theo dõi.
      withoutPeople: Boolean(project.isTemplate),
      customFields: project.customFields || [],
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

module.exports = {
  reportTaskResult,
  duplicateTask,
  moveTask,
  updateDeadline,
  downloadExcelTemplate,
  previewExcelTasks,
  importExcelTasks,
  getTaskReminders,
};
