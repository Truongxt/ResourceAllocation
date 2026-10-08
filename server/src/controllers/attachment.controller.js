const multer = require('multer');
const Task = require('../models/Task');
const Attachment = require('../models/Attachment');
const fileStorage = require('../services/fileStorage');
const { logActivity } = require('../services/activityLog.service');
const {
  MAX_FILE_SIZE,
  MAX_FILES_PER_TASK,
  contentTypeOf,
  decodeFileName,
  removeAttachments,
} = require('../services/attachment.service');

// Giữ trong bộ nhớ cho tới khi kiểm xong đuôi và số lượng: tệp bị từ chối không chạm đĩa.
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
}).single('file');

/**
 * Chốt nhận tệp. Phân lập công ty và chặn dự án lưu trữ đã xong trước đó, ở
 * `guardTaskCompany` (router.param), nên request bị chặn không đọc tới body.
 */
const parseUpload = (req, res, next) => {
  parser(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Tệp vượt quá 10 MB' });
    }
    return res.status(400).json({ success: false, message: 'Chỉ gửi một tệp, ở trường "file"' });
  });
};

const toClient = (doc) => {
  const json = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  delete json.storageKey;
  return json;
};

const findTask = (id) => Task.findById(id).select('title project').populate('project', 'name manager companyName');

/**
 * @desc    Danh sách tệp của một công việc, mới nhất trước
 * @route   GET /api/tasks/:id/attachments
 */
const listAttachments = async (req, res, next) => {
  try {
    const task = await findTask(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });

    const attachments = await Attachment.find({ task: task._id })
      .populate('uploadedBy', 'name email avatar')
      .sort('-createdAt')
      .lean();
    res.json({ success: true, data: { attachments } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tải một tệp lên công việc (multipart, trường `file`)
 * @route   POST /api/tasks/:id/attachments
 */
const uploadAttachment = async (req, res, next) => {
  try {
    const task = await findTask(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Chưa chọn tệp' });

    const originalName = decodeFileName(req.file.originalname).slice(0, 255);
    const mimeType = contentTypeOf(originalName);
    if (!mimeType) {
      return res.status(400).json({
        success: false,
        message: 'Loại tệp không được hỗ trợ. Nhận tài liệu văn phòng, PDF, văn bản, ảnh và tệp nén.',
      });
    }
    if ((await Attachment.countDocuments({ task: task._id })) >= MAX_FILES_PER_TASK) {
      return res.status(400).json({
        success: false,
        message: `Mỗi công việc có tối đa ${MAX_FILES_PER_TASK} tệp — xóa bớt tệp cũ trước`,
      });
    }

    const storageKey = await fileStorage.save(req.file.buffer);
    const created = await Attachment.create({
      task: task._id,
      companyName: task.project?.companyName,
      originalName,
      mimeType,
      size: req.file.size,
      storageKey,
      uploadedBy: req.user._id,
    });
    await created.populate('uploadedBy', 'name email avatar');

    logActivity({
      req,
      action: 'UPLOAD_ATTACHMENT',
      entityType: 'task',
      entityId: task._id,
      entityTitle: task.title,
      description: `Đính kèm "${originalName}" vào công việc "${task.title}"`,
      details: { size: req.file.size },
    });

    res.status(201).json({ success: true, data: { attachment: toClient(created) } });
  } catch (error) {
    next(error);
  }
};

/** Tệp thuộc đúng công việc `:id`; null nếu không. Id của việc khác cũng là "không tìm thấy". */
const findOwnAttachment = (req, withKey = false) => {
  const query = Attachment.findOne({ _id: req.params.attachmentId, task: req.params.id });
  return withKey ? query.select('+storageKey') : query;
};

/**
 * @desc    Tải tệp về
 * @route   GET /api/tasks/:id/attachments/:attachmentId/download
 */
const downloadAttachment = async (req, res, next) => {
  try {
    const attachment = await findOwnAttachment(req, true);
    if (!attachment) return res.status(404).json({ success: false, message: 'Không tìm thấy tệp' });

    const content = fileStorage.stream(attachment.storageKey);
    if (!content) return res.status(404).json({ success: false, message: 'Tệp không còn trên máy chủ' });

    // Luôn là tải về: tệp người dùng gửi lên không được mở ngay trên origin của app.
    res.attachment(attachment.originalName);
    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', attachment.size);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    content.on('error', next);
    content.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa tệp — người tải lên, admin, hoặc quản lý của dự án
 * @route   DELETE /api/tasks/:id/attachments/:attachmentId
 */
const deleteAttachment = async (req, res, next) => {
  try {
    const task = await findTask(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    const attachment = await findOwnAttachment(req);
    if (!attachment) return res.status(404).json({ success: false, message: 'Không tìm thấy tệp' });

    const me = String(req.user._id);
    const managerId = task.project?.manager?._id || task.project?.manager;
    const allowed = String(attachment.uploadedBy) === me
      || req.user.isOwner
      || req.user.role === 'admin'
      || (managerId && String(managerId) === me);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ người tải lên hoặc quản lý dự án mới xóa được tệp này',
      });
    }

    await removeAttachments({ _id: attachment._id });

    logActivity({
      req,
      action: 'DELETE_ATTACHMENT',
      entityType: 'task',
      entityId: task._id,
      entityTitle: task.title,
      description: `Xóa tệp "${attachment.originalName}" khỏi công việc "${task.title}"`,
    });

    res.json({ success: true, message: 'Đã xóa tệp' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  parseUpload,
  listAttachments,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
};
