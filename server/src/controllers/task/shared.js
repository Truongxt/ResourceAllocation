/**
 * Helper dùng chung cho các nhóm handler công việc.
 *
 * Tách từ `task.controller.js` — route vẫn lấy handler qua file đó.
 */

const Task = require('../../models/Task');
const Project = require('../../models/Project');
const { sendNotification } = require('../../services/socket.service');
const { DEFAULT_COMPANY } = require('../../services/companyRefs.service');
const { resolveReviewers } = require('../../services/taskStatus.service');
const { dependencyTaskIds } = require('../../services/taskDependency.service');

/**
 * Vết của luồng trạng thái — chỉ server ghi, qua `statusChangeFields`, `completeTask` và
 * `reviewTask`. `PUT /:id` gỡ chúng khỏi body.
 */
const STATUS_TRAIL_FIELDS = [
  'completedAt', 'failedAt', 'failedBy',
  'reviewRequestedAt', 'reviewedAt', 'reviewedBy', 'reviewDecision', 'reviewComment',
];

/** Điều kiện `companyName` của một công ty — công ty mặc định gồm cả bản ghi cũ thiếu trường. */
const companyProjectScope = (company) =>
  company === DEFAULT_COMPANY ? { $in: [company, null, undefined] } : company;

/**
 * Helper: Tính lại progress của Task cha dựa trên các việc con (subtasks)
 * Chuẩn Base Wework: Tiến độ của việc cha phản ánh trung bình cộng các việc con
 */
const recalculateParentTaskProgress = async (parentTaskId) => {
  if (!parentTaskId) return;
  const parent = await Task.findById(parentTaskId).select('progress status project');
  if (!parent) return;

  const subtasks = await Task.find({
    parentTask: parentTaskId,
  }).select('progress status');

  const counted = subtasks.filter((t) => t.status !== 'failed');
  if (!counted.length) return;

  const total = counted.reduce((sum, t) => sum + (t.status === 'done' ? 100 : (t.progress || 0)), 0);
  const progress = Math.round(total / counted.length);

  const updateData = { progress };
  // Nếu tất cả việc con đều 'done' và việc cha chưa thất bại, có thể nâng lên 100%
  if (counted.every((t) => t.status === 'done') && parent.status !== 'failed') {
    updateData.progress = 100;
  }
  await Task.findByIdAndUpdate(parentTaskId, updateData);
};

/**
 * Helper: Tính lại progress dự án dựa trên tasks
 * Chuẩn Base Wework (Bài 9, 25, 86):
 * 1. Phòng ban ('team') không có thanh % tiến độ tổng thể (vì vận hành liên tục).
 * 2. Dự án ('project') chỉ tính các công việc cha cấp gốc (parentTask = null) để tránh tính trùng trọng số (Double Weighting).
 */
const recalculateProjectProgress = async (projectId) => {
  if (!projectId) return;
  const project = await Project.findById(projectId).select('kind');
  if (!project) return;

  // Phòng ban vô thời hạn: Không tính thanh % tiến độ tổng thể
  if (project.kind === 'team') {
    return;
  }

  // Chỉ lấy các công việc cấp gốc (không phải việc con) để tính tiến độ dự án
  const tasks = await Task.find({
    project: projectId,
    parentTask: { $in: [null, undefined] },
  }).select('progress status');

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

/** `dd/mm/yyyy` theo giờ server — dùng trong nội dung thông báo. */
const formatDay = (value) => {
  if (!value) return 'chưa có';
  const d = new Date(value);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/**
 * Báo cho người thực hiện và người theo dõi của một công việc, trừ chính người thao tác.
 * `followers`/`assignee` có thể là id hoặc object đã populate.
 */
const notifyTaskPeople = (task, actor, { type, title, message }) => {
  const idOf = (v) => String(v?._id || v);
  const actorId = String(actor._id);
  const recipients = new Set(
    [...(task.followers || []), task.assignee].filter(Boolean).map(idOf).filter((id) => id !== actorId)
  );
  recipients.forEach((recipient) => {
    sendNotification({
      recipient,
      actor: actor._id,
      type,
      title,
      message,
      entityType: 'task',
      entityId: task._id,
      link: '/tasks',
    });
  });
};

// Việc đóng lại với kết quả xấu: người theo dõi cũng cần biết, và cần biết vì sao.
const notifyTaskFailed = (task, actor) =>
  notifyTaskPeople(task, actor, {
    type: 'task_failed',
    title: 'Công việc thất bại',
    message: `${actor.name} đánh dấu "${task.title}" là Thất bại. Lý do: ${task.failureReason}`,
  });

const notifyDeadlineChanged =(task, actor, oldEndDate, newEndDate, reason) =>
  notifyTaskPeople(task, actor, {
    type: 'task_deadline_changed',
    title: 'Đổi hạn công việc',
    message: `${actor.name} đổi hạn "${task.title}": ${formatDay(oldEndDate)} → ${formatDay(newEndDate)}${reason ? `. Lý do: ${reason}` : ''}`,
  });

/**
 * Công việc này có thuộc công ty của người gọi không.
 *
 * Nhận task đã populate `project` (cần `companyName`). Trả `true` khi được phép.
 *
 * Có helper riêng vì nhánh bình luận từng bỏ qua hẳn bước này: `addComment` và
 * `deleteComment` chỉ `findById` rồi làm luôn, nên biết id là chen được vào
 * công việc của công ty khác — và admin của công ty khác còn xóa được bình luận
 * của người ta, do điều kiện miễn trừ chỉ xét `role === 'admin'` chứ không xét
 * cùng công ty.
 */
const belongsToCompany = (task, user) => {
  const userCompany = user?.companyName || 'Công ty Công nghệ RAO';
  if (user?.role === 'superadmin') return true;
  if (!task.project?.companyName) return true;
  return task.project.companyName === userCompany;
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
  const ids = [...new Set(dependencyTaskIds(dependencies))];
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
    const graph = new Map(all.map((t) => [String(t._id), dependencyTaskIds(t.dependencies)]));

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
 * Người gọi có quyền kết luận kết quả công việc này không.
 * Admin và quản lý dự án có; ngoài ra là danh sách người đánh giá của công việc, thiếu
 * thì lấy của dự án. Người thực hiện thì không bao giờ — kể cả khi thuộc một trong ba nhóm đó.
 */
const canApproveReview = (task, project, user) => {
  // Bước duyệt cần người thứ hai: người thực hiện không tự duyệt việc mình làm, kể cả khi là
  // admin, quản lý dự án hay có tên trong danh sách đánh giá (khớp utils/taskPermissions.js bên web).
  const assigneeId = task?.assignee?._id || task?.assignee;
  if (assigneeId && assigneeId.toString() === user._id.toString()) return false;
  if (user.role === 'admin') return true;
  const managerId = project?.manager?._id || project?.manager;
  if (managerId && managerId.toString() === user._id.toString()) return true;
  return resolveReviewers(task, project).includes(user._id.toString());
};

module.exports = {
  STATUS_TRAIL_FIELDS,
  companyProjectScope,
  recalculateParentTaskProgress,
  recalculateProjectProgress,
  notifyTaskFailed,
  notifyDeadlineChanged,
  belongsToCompany,
  validateDependencies,
  canApproveReview,
};
