/**
 * Công việc — bàn giao hàng loạt (Bulk reassign).
 *
 * Tách từ `task.controller.js` — route vẫn lấy handler qua file đó.
 */

const mongoose = require('mongoose');
const Task = require('../../models/Task');
const Project = require('../../models/Project');
const User = require('../../models/User');
const { sendNotification } = require('../../services/socket.service');
const { logActivity } = require('../../services/activityLog.service');
const { syncResourceWorkload } = require('../../services/workload.service');
const { companyOf, usersError } = require('../../services/companyRefs.service');
const { CLOSED_STATUSES } = require('../../services/taskStatus.service');
const { recalculateProjectProgress } = require('./shared');

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
  // Admin bàn giao trên cả công ty; PM chỉ trên dự án mình quản lý.
  const isAdmin = user.role === 'admin' || Boolean(user.isOwner);
  const projects = await Project.find({
    companyName:
      userCompany === 'Công ty Công nghệ RAO' ? { $in: [userCompany, null, undefined] } : userCompany,
    ...(isAdmin ? {} : { manager: user._id }),
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
    // Tập việc đã giới hạn trong công ty, nhưng người NHẬN thì chưa
    const recipientError = await usersError(toUserId, companyOf(req.user));
    if (recipientError) {
      return res.status(400).json({ success: false, message: recipientError });
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

module.exports = {
  previewReassign,
  bulkReassign,
};
