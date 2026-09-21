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
  const isOwner = user.role === 'admin';
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
    if (isProjectManager || isOwner) {
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
    isOwner,
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
 * Phân quyền Tạo mới công việc
 * - Admin & Project Manager: Có quyền tạo
 * - Thành viên dự án: Được tạo nếu dự án bật quyền allowMembersCreateTasks === true
 * - Khách: Được tạo nếu allowGuestCreateTask === true
 */
const canCreateTask = () => async (req, res, next) => {
  try {
    if (PRIVILEGED_ROLES.includes(req.user.role)) {
      return next();
    }

    const { project: projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Dự án tiếp nhận công việc là bắt buộc' });
    }

    const project = await Project.findById(projectId).select('manager members permissions companyName');
    if (!project) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
    }

    const managerId = project.manager?._id || project.manager;
    if (managerId && managerId.toString() === req.user._id.toString()) {
      return next();
    }

    // Kiểm tra tư cách thành viên dự án
    const memberObj = (project.members || []).find((m) => {
      const uid = m.user?._id || m.user || m;
      return uid && uid.toString() === req.user._id.toString();
    });

    if (!memberObj) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không phải là thành viên của dự án này nên không có quyền tạo công việc.',
      });
    }

    const perms = project.permissions || {};
    if (memberObj.role === 'guest') {
      if (!perms.allowGuestCreateTask) {
        return res.status(403).json({
          success: false,
          message: 'Khách chưa được cấp quyền tạo công việc trong dự án này.',
        });
      }
    } else {
      // Chuẩn: Thành viên được tạo nếu dự án bật phân quyền tạo việc (mặc định tắt nếu chưa cấu hình)
      if (!perms.allowMembersCreateTasks) {
        return res.status(403).json({
          success: false,
          message: 'Thành viên chưa được cấp quyền tự tạo công việc trong dự án này.',
        });
      }
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
    const allowed = [...ASSIGNEE_EDITABLE_FIELDS];
    if (permissions.allowAssigneeEditTitleDesc) {
      allowed.push('title', 'description');
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

module.exports = {
  getTaskUserContext,
  canCreateTask,
  canModifyTask,
  canUpdateTaskStatus,
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
