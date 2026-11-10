/**
 * Công việc — bình luận, checklist, người theo dõi, công việc con.
 *
 * Tách từ `task.controller.js` — route vẫn lấy handler qua file đó.
 */

const mongoose = require('mongoose');
const Task = require('../../models/Task');
const Project = require('../../models/Project');
const User = require('../../models/User');
const { sendNotification } = require('../../services/socket.service');
const { placementError } = require('../../services/projectLifecycle.service');
const { companyOf, usersError } = require('../../services/companyRefs.service');
const { belongsToCompany } = require('./shared');

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

    const task = await Task.findById(req.params.id).populate('project', 'companyName');
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });

    if (!belongsToCompany(task, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền bình luận vào công việc của công ty khác',
      });
    }

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
    const task = await Task.findById(req.params.id).populate('project', 'companyName');
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });

    if (!belongsToCompany(task, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thao tác trên công việc của công ty khác',
      });
    }

    const comment = task.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });

    // Chỉ cho phép xóa bình luận của chính mình hoặc admin — và admin ở đây đã
    // chắc chắn cùng công ty nhờ kiểm tra bên trên.
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

    const refError = await usersError(assignee, companyOf(req.user));
    if (refError) return res.status(400).json({ success: false, message: refError });

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
    // Đánh lại order theo vị trí còn lại — không thì mục thêm sau (order =
    // checklist.length) sẽ trùng order với mục đã xóa trước đó, và thứ tự
    // hiển thị lệ thuộc vào thứ tự mảng thay vì vào order.
    task.checklist.forEach((c, idx) => {
      c.order = idx;
    });
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
    // Người theo dõi nhận thông báo về công việc — người công ty khác thì không được
    const companyError = await usersError(toAdd, companyOf(req.user));
    if (companyError) {
      return res.status(400).json({ success: false, message: companyError });
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

    const refError = await usersError([assignee, ...(Array.isArray(followers) ? followers : [])], companyOf(req.user));
    if (refError) {
      return res.status(400).json({ success: false, message: refError });
    }
    const placement = placementError(await Project.findById(parent.project).select('isArchived isTemplate'), { assignee });
    if (placement) return res.status(placement.status).json({ success: false, message: placement.message });

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

module.exports = {
  addComment,
  deleteComment,
  addChecklistItem,
  toggleChecklistItem,
  removeChecklistItem,
  addFollower,
  removeFollower,
  getSubtasks,
  createSubtask,
};
