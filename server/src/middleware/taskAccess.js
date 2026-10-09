/**
 * ============================================================================
 * BASE WEWORK — Middleware Phân quyền thao tác trong công việc
 * ============================================================================
 * Tham chiếu chuẩn: https://help.base.vn/support/solutions/articles/63000273353
 *
 * Các vai trò được phân định trong ngữ cảnh từng công việc:
 * 1. Owner & Quản lý (Admin & Project Manager): Có toàn quyền quản trị
 * 2. Quản lý dự án cụ thể (PM của dự án): project.manager === user._id
 * 3. Người giao việc (Task Creator): task.createdBy === user._id
 * 4. Người thực hiện (Task Assignee): task.assignee === user._id
 * 5. Người theo dõi (Task Follower): task.followers chứa user._id
 * 6. Khách (Guest): thành viên dự án có role === 'guest'
 */

const Task = require('../models/Task');
const Project = require('../models/Project');
const { ARCHIVED_MESSAGE } = require('../services/projectLifecycle.service');

const PRIVILEGED_ROLES = ['admin', 'project_manager'];

// Các trường mặc định người thực hiện (Assignee) được phép tự cập nhật
const ASSIGNEE_EDITABLE_FIELDS = ['status', 'progress', 'actualHours'];

/**
 * Trích xuất ngữ cảnh vai trò của người dùng đối với một công việc và dự án
 */
const getTaskUserContext = async (taskId, user, preloadedTask = null) => {
  let task = preloadedTask;
  if (!task && taskId) {
    task = await Task.findById(taskId)
      .populate('project', 'name manager members permissions failureConfig companyName');
  }

  const isPrivileged = PRIVILEGED_ROLES.includes(user.role);
  // Admin hệ thống theo role — KHÔNG phải cờ `User.isOwner` (Owner luôn có role admin).
  const isAdmin = user.role === 'admin';
  const project = task?.project;

  let isProjectManager = isPrivileged;
  let isCreator = false;
  let isAssignee = false;
  let isFollower = false;
  let isGuest = false;
  let isProjectMember = false;

  if (project) {
    const managerId = project.manager?._id || project.manager;
    if (managerId && managerId.toString() === user._id.toString()) {
      isProjectManager = true;
    }

    if (Array.isArray(project.members)) {
      const memberObj = project.members.find((m) => {
        const uid = m.user?._id || m.user || m;
        return uid && uid.toString() === user._id.toString();
      });
      if (memberObj) {
        isProjectMember = true;
        if (memberObj.role === 'guest') isGuest = true;
      }
    }
    if (isProjectManager || isAdmin) {
      isProjectMember = true;
    }
  }

  if (task) {
    const creatorId = task.createdBy?._id || task.createdBy;
    isCreator = !!creatorId && creatorId.toString() === user._id.toString();

    const assigneeId = task.assignee?._id || task.assignee;
    isAssignee = !!assigneeId && assigneeId.toString() === user._id.toString();

    if (Array.isArray(task.followers)) {
      isFollower = task.followers.some((f) => {
        const fid = f?._id || f;
        return fid && fid.toString() === user._id.toString();
      });
    }
  }

  const permissions = project?.permissions || {};
  const failureConfig = project?.failureConfig || {};

  return {
    task,
    project,
    isPrivileged,
    isAdmin,
    isProjectManager,
    isCreator,
    isAssignee,
    isFollower,
    isGuest,
    isProjectMember,
    permissions,
    failureConfig,
  };
};

/**
 * Chốt phân lập công ty cho **mọi** route có `:id` của nhóm công việc.
 *
 * Vì sao phải đứng riêng ở đây chứ không nằm trong từng guard: 11 guard bên dưới
 * đều mở đầu bằng `if (PRIVILEGED_ROLES.includes(req.user.role)) return next();`
 * — nghĩa là admin/PM đi thẳng qua, không xét công ty. Bốn endpoint chính
 * (`GET`/`PUT`/`DELETE`/`PATCH status`) vẫn an toàn vì **controller** của chúng
 * tự kiểm, nhưng mười endpoint còn lại thì không, và đo thật cho thấy admin công
 * ty B thêm được checklist, tự thêm mình làm người theo dõi, nhân bản, di chuyển,
 * đổi hạn, nộp kết quả, đánh dấu hoàn thành và tạo việc con trên công việc của
 * công ty A — chỉ cần biết id.
 *
 * Đặt ở `router.param('id')` nên nó chạy cho mọi route có `:id`, kể cả route
 * thêm sau này. Rải `belongsToCompany` vào từng controller thì đúng bằng số lần
 * có thể quên.
 *
 * Không tự trả 404 khi không tìm thấy công việc: để handler phía sau trả lời như
 * cũ, tránh đổi thông điệp lỗi của những đường vốn đang đúng.
 */
const guardTaskCompany = async (req, res, next, id) => {
  try {
    const task = await Task.findById(id).select('project').populate('project', 'companyName isArchived');
    if (!task) return next();

    const userCompany = req.user?.companyName || 'Công ty Công nghệ RAO';
    const taskCompany = task.project?.companyName;

    if (taskCompany && taskCompany !== userCompany) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thao tác trên công việc của công ty khác',
      });
    }

    // Dự án lưu trữ là chỉ đọc: mọi thao tác ghi lên việc của nó (sửa, đổi trạng thái,
    // bình luận, xóa…) dừng ở đây, kể cả với admin/PM.
    if (req.method !== 'GET' && task.project?.isArchived) {
      return res.status(409).json({ success: false, message: ARCHIVED_MESSAGE });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Lý do một người dùng KHÔNG được đặt công việc vào dự án này, hoặc `null` nếu được.
 * Dùng chung cho tạo mới (`canCreateTask`) và chuyển việc sang dự án khác (`moveTask`):
 * chuyển một công việc vào dự án cũng là thêm việc vào dự án đó.
 *
 * - Admin & Project Manager (theo role): được
 * - Quản lý của chính dự án: được
 * - Thành viên dự án: được nếu dự án bật `allowMembersCreateTasks`
 * - Khách: được nếu `allowGuestCreateTask`
 *
 * Không xét công ty — đó là chốt riêng, áp cho cả admin/PM.
 */
const createDeniedReason = (user, project) => {
  if (PRIVILEGED_ROLES.includes(user.role)) return null;

  const managerId = project.manager?._id || project.manager;
  if (managerId && managerId.toString() === user._id.toString()) return null;

  const memberObj = (project.members || []).find((m) => {
    const uid = m.user?._id || m.user || m;
    return uid && uid.toString() === user._id.toString();
  });
  if (!memberObj) {
    return 'Bạn không phải là thành viên của dự án này nên không có quyền tạo công việc.';
  }

  const perms = project.permissions || {};
  if (memberObj.role === 'guest') {
    return perms.allowGuestCreateTask ? null : 'Khách chưa được cấp quyền tạo công việc trong dự án này.';
  }
  // Schema mặc định bật — `allowMembersCreateTasks: true`
  return perms.allowMembersCreateTasks ? null : 'Thành viên chưa được cấp quyền tự tạo công việc trong dự án này.';
};

/**
 * Phân quyền Tạo mới công việc — xem `createDeniedReason`.
 */
const canCreateTask = () => async (req, res, next) => {
  try {
    if (PRIVILEGED_ROLES.includes(req.user.role)) {
      return next();
    }

    // Form nhập Excel gửi `projectId` thay vì `project`
    const projectId = req.body.project || req.body.projectId;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Dự án tiếp nhận công việc là bắt buộc' });
    }

    const project = await Project.findById(projectId).select('manager members permissions companyName');
    if (!project) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
    }

    const denied = createDeniedReason(req.user, project);
    if (denied) {
      return res.status(403).json({ success: false, message: denied });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Phân quyền Cập nhật công việc (PUT /:id)
 * Kiểm soát chi tiết từng trường được sửa theo vai trò & cài đặt dự án
 */
const canModifyTask = ({ restrictFields = false } = {}) => async (req, res, next) => {
  try {
    if (PRIVILEGED_ROLES.includes(req.user.role)) {
      return next();
    }

    const ctx = await getTaskUserContext(req.params.id, req.user);
    const { task, isProjectManager, isCreator, isAssignee, isFollower, permissions } = ctx;

    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    }

    if (isProjectManager) {
      return next();
    }

    // Với công việc con (subtask): Người giao việc và người thực hiện có quyền sửa
    if (task.parentTask) {
      if (isCreator || isAssignee) return next();
      return res.status(403).json({ success: false, message: 'Bạn không có quyền chỉnh sửa công việc con này.' });
    }

    // Người ngoài dự án hoặc không có vai trò nào trong task
    if (!isCreator && !isAssignee && !isFollower) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chỉ có thể cập nhật công việc được giao cho mình.',
      });
    }

    // Nếu là Người giao việc (Creator): Được sửa
    if (isCreator) {
      return next();
    }

    // Nếu là Người theo dõi (Follower) mà không phải Assignee:
    if (isFollower && !isAssignee) {
      return res.status(403).json({
        success: false,
        message: 'Người theo dõi chỉ có quyền xem và thảo luận trên công việc này.',
      });
    }

    // Nếu là Người thực hiện (Assignee):
    // Trường hợp restrictFields: Chỉ cho phép các trường tiến độ hợp lệ
    // trừ khi dự án đã bật quyền tương ứng
    // `failureReason` chỉ có tác dụng khi `status` đổi sang Thất bại, mà bước đó đã có
    // `canChangeStatusOnUpdate` chốt quyền theo `failureConfig.allowedRoles`.
    const allowed = [...ASSIGNEE_EDITABLE_FIELDS, 'failureReason'];
    if (permissions.allowAssigneeEditTitleDesc) {
      // Trường tùy chỉnh đi cùng nhóm "nội dung" với tiêu đề/mô tả — giống `canEditDetails` bên web.
      allowed.push('title', 'description', 'customValues');
    }
    if (permissions.allowAssigneeEditDeadline) {
      allowed.push('startDate', 'endDate', 'deadlineReason');
    }
    if (permissions.allowAssigneeReassign) {
      allowed.push('assignee');
    }

    const attempted = Object.keys(req.body || {}).filter((field) => {
      if (['_id', '__v', 'createdAt', 'updatedAt', 'project'].includes(field)) {
        if (field === 'project') {
          const bodyProj = req.body.project?._id || req.body.project;
          const currentProj = task.project?._id || task.project;
          if (bodyProj && currentProj && bodyProj.toString() === currentProj.toString()) return false;
        } else {
          return false;
        }
      }
      const val = req.body[field];
      if (val === undefined) return false;
      const currentVal = task.get ? task.get(field) : task[field];

      if (val === null || val === '') {
        if (currentVal === null || currentVal === undefined || currentVal === '') return false;
        return true;
      }

      if (currentVal !== undefined && currentVal !== null) {
        if (currentVal instanceof Date && !isNaN(new Date(val).getTime())) {
          if (currentVal.getTime() === new Date(val).getTime()) return false;
        } else if (currentVal.toString() === val.toString()) {
          return false;
        }
      }
      return true;
    });

    const disallowed = attempted.filter((field) => !allowed.includes(field));
    if (disallowed.length > 0) {
      return res.status(403).json({
        success: false,
        message: `Bạn chỉ được cập nhật ${allowed.join(', ')} trên công việc của mình. Không được phép sửa: ${disallowed.join(', ')}.`,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Phân quyền Đánh dấu hoàn thành / Chuyển trạng thái (PATCH /:id/status)
 */
const canUpdateTaskStatus = () => async (req, res, next) => {
  try {
    // Admin/PM đi qua ở dòng dưới. Với mọi người còn lại, 'failed' là thao tác
    // riêng: nó đóng công việc lại, nên quyền được cấu hình theo từng dự án thay vì
    // dùng chung với quyền đổi trạng thái thường.
    const markingFailed = req.body?.status === 'failed';

    if (PRIVILEGED_ROLES.includes(req.user.role)) {
      return next();
    }

    const ctx = await getTaskUserContext(req.params.id, req.user);
    const { task, isProjectManager, isCreator, isAssignee, isFollower, permissions } = ctx;

    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    }

    if (markingFailed) {
      const allowedRoles = ctx.failureConfig?.allowedRoles || [];
      const allowed =
        isProjectManager ||
        (isCreator && allowedRoles.includes('assigner')) ||
        (isAssignee && allowedRoles.includes('assignee')) ||
        (isFollower && allowedRoles.includes('follower'));

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không được phép đánh dấu công việc này là Thất bại.',
        });
      }
      return next();
    }

    if (isProjectManager || isCreator || isAssignee) {
      return next();
    }

    if (isFollower && permissions.allowFollowerMarkDone) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Bạn chỉ có thể cập nhật công việc được giao cho mình.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phân quyền Báo hoàn thành công việc (PATCH /:id/complete)
 * Cùng tập người với quyền đổi trạng thái thường: người thực hiện là chính, kèm
 * người giao việc, quản lý dự án, và người theo dõi nếu dự án cho phép.
 */
const canCompleteTask = () => async (req, res, next) => {
  try {
    if (PRIVILEGED_ROLES.includes(req.user.role)) {
      return next();
    }

    const ctx = await getTaskUserContext(req.params.id, req.user);
    const { task, isProjectManager, isCreator, isAssignee, isFollower, permissions } = ctx;

    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    }

    if (isProjectManager || isCreator || isAssignee) {
      return next();
    }

    if (isFollower && permissions.allowFollowerMarkDone) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Bạn chỉ có thể báo hoàn thành công việc được giao cho mình.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phân quyền Điều chỉnh thời hạn hoàn thành (PATCH /:id/deadline)
 */
const canUpdateDeadline = () => async (req, res, next) => {
  try {
    if (PRIVILEGED_ROLES.includes(req.user.role)) {
      return next();
    }

    const ctx = await getTaskUserContext(req.params.id, req.user);
    const { task, isProjectManager, isCreator, isAssignee, permissions } = ctx;

    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    }

    if (isProjectManager || isCreator) {
      return next();
    }

    if (isAssignee && permissions.allowAssigneeEditDeadline) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Chỉ Quản lý dự án hoặc người giao việc mới có quyền điều chỉnh thời hạn (deadline).',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phân quyền Xóa công việc (DELETE /:id)
 */
const canDeleteTask = () => async (req, res, next) => {
  try {
    if (PRIVILEGED_ROLES.includes(req.user.role)) {
      return next();
    }

    const ctx = await getTaskUserContext(req.params.id, req.user);
    const { task, isProjectManager, isCreator, isAssignee, permissions } = ctx;

    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    }

    // Công việc con (subtask)
    if (task.parentTask) {
      if (isProjectManager || isCreator || isAssignee) {
        return next();
      }
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa việc con này.' });
    }

    // Công việc chính
    if (isProjectManager) {
      return next();
    }

    if (isCreator && permissions.allowCreatorDeleteTask) {
      return next();
    }

    if (isAssignee && permissions.allowAssigneeDeleteTask) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Chỉ quản trị viên hoặc quản lý dự án mới có quyền xóa công việc chính.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phân quyền Quản lý người theo dõi (Followers)
 */
const canManageFollowers = (action = 'add') => async (req, res, next) => {
  try {
    if (PRIVILEGED_ROLES.includes(req.user.role)) {
      return next();
    }

    const ctx = await getTaskUserContext(req.params.id, req.user);
    const { task, isProjectManager, isCreator, isAssignee, isFollower } = ctx;

    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    }

    if (isProjectManager || isCreator || isAssignee) {
      return next();
    }

    if (action === 'remove' && isFollower) {
      const targetUserId = req.params.userId;
      if (targetUserId && targetUserId.toString() === req.user._id.toString()) {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Người theo dõi chỉ có quyền tự gỡ chính mình khỏi công việc.',
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền thay đổi danh sách người theo dõi công việc này.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phân quyền Nhân bản công việc (POST /:id/duplicate)
 */
const canDuplicateTask = () => async (req, res, next) => {
  try {
    if (PRIVILEGED_ROLES.includes(req.user.role)) {
      return next();
    }

    const ctx = await getTaskUserContext(req.params.id, req.user);
    const { task, isProjectManager, isCreator } = ctx;

    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    }

    if (isProjectManager || isCreator) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Chỉ Quản lý dự án hoặc người giao việc mới có quyền nhân bản công việc.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phân quyền Di chuyển công việc (POST /:id/move)
 */
const canMoveTask = () => async (req, res, next) => {
  try {
    if (PRIVILEGED_ROLES.includes(req.user.role)) {
      return next();
    }

    const ctx = await getTaskUserContext(req.params.id, req.user);
    const { task, isProjectManager, isCreator, isAssignee } = ctx;

    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    }

    if (isProjectManager || isCreator || isAssignee) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền di chuyển công việc này sang nhóm hoặc dự án khác.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phân quyền Checklist
 */
const canManageChecklist = () => async (req, res, next) => {
  try {
    if (PRIVILEGED_ROLES.includes(req.user.role)) {
      return next();
    }

    const ctx = await getTaskUserContext(req.params.id, req.user);
    const { task, isProjectManager, isCreator, isAssignee, isFollower, permissions } = ctx;

    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    }

    if (isProjectManager || isCreator || isAssignee) {
      return next();
    }

    if (isFollower && permissions.allowFollowerManageChecklist) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền tạo hoặc chỉnh sửa checklist trên công việc này.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phân quyền Báo cáo kết quả công việc
 */
const canReportResult = () => async (req, res, next) => {
  try {
    if (PRIVILEGED_ROLES.includes(req.user.role)) {
      return next();
    }

    const ctx = await getTaskUserContext(req.params.id, req.user);
    const { task, isProjectManager, isCreator, isAssignee } = ctx;

    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    }

    if (isProjectManager || isCreator || isAssignee) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Chỉ người thực hiện, người giao việc hoặc Quản lý dự án mới có quyền cập nhật kết quả công việc.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phân quyền Tạo công việc con (Subtasks)
 */
const canCreateSubtask = () => async (req, res, next) => {
  try {
    if (PRIVILEGED_ROLES.includes(req.user.role)) {
      return next();
    }

    const ctx = await getTaskUserContext(req.params.id, req.user);
    const { task, isProjectManager, isCreator, isAssignee, isFollower, isProjectMember } = ctx;

    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc cha' });
    }

    if (isProjectManager || isCreator || isAssignee || isFollower || isProjectMember) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Bạn không phải là thành viên liên quan đến công việc này để tạo việc con.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * `PUT /:id` mang theo `status` — form sửa công việc luôn gửi trường này. Khi nó thật sự
 * đổi trạng thái thì phải qua cùng chốt quyền với `PATCH /:id/status`; thiếu chốt này,
 * người thực hiện tự đánh Thất bại được dù dự án không cho vai đó. Lưu lại form mà giữ
 * nguyên trạng thái thì không cần.
 */
const canChangeStatusOnUpdate = () => {
  const statusGuard = canUpdateTaskStatus();
  return async (req, res, next) => {
    try {
      if (req.body?.status === undefined) return next();
      const task = await Task.findById(req.params.id).select('status');
      if (!task || task.status === req.body.status) return next();
      return statusGuard(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  getTaskUserContext,
  canChangeStatusOnUpdate,
  guardTaskCompany,
  canCreateTask,
  createDeniedReason,
  canModifyTask,
  canUpdateTaskStatus,
  canCompleteTask,
  canUpdateDeadline,
  canDeleteTask,
  canManageFollowers,
  canDuplicateTask,
  canMoveTask,
  canManageChecklist,
  canReportResult,
  canCreateSubtask,
  PRIVILEGED_ROLES,
  ASSIGNEE_EDITABLE_FIELDS,
};
