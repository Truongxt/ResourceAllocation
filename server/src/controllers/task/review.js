/**
 * Công việc — luồng đánh giá kết quả (Review).
 *
 * Tách từ `task.controller.js` — route vẫn lấy handler qua file đó.
 */

const Task = require('../../models/Task');
const Project = require('../../models/Project');
const { sendNotification } = require('../../services/socket.service');
const { logActivity } = require('../../services/activityLog.service');
const { syncResourceWorkload } = require('../../services/workload.service');
const { resolveReviewers, isReviewOverdue } = require('../../services/taskStatus.service');
const {
  recalculateParentTaskProgress,
  recalculateProjectProgress,
  canApproveReview,
} = require('./shared');

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

    if (task.parentTask) {
      await recalculateParentTaskProgress(task.parentTask);
    }
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

    if (task.parentTask) {
      await recalculateParentTaskProgress(task.parentTask);
    }
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
          ...task.toObject({ flattenMaps: true }),
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

module.exports = {
  completeTask,
  reviewTask,
  getPendingReviews,
};
