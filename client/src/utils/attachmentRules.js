// Quy tắc của tệp đính kèm phía client. Phải khớp server (`server/src/controllers/attachment.controller.js`,
// `server/src/services/attachment.service.js`) — server kiểm lại tất cả, ở đây chỉ để không bày nút vô ích.
// Logic thuần, chạy được bằng node (tests/attachment-rules.test.mjs). Mobile dùng bản chép nguyên.

/** Chặn sớm ở client để khỏi đẩy cả tệp lớn lên mới nhận 413. */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const idOf = (value) => String((value && value._id) || value || '');

/** Tải lên: có quyền sửa ở phân hệ Công việc, và dự án không lưu trữ (chỉ đọc). */
export function canWriteAttachments(task, canManageTasks) {
  return Boolean(canManageTasks) && !task?.project?.isArchived;
}

/** Xóa: như tải lên, cộng thêm phải là người tải lên, admin, Owner, hoặc quản lý của dự án. */
export function canDeleteAttachment(attachment, task, user, canManageTasks) {
  if (!user || !canWriteAttachments(task, canManageTasks)) return false;
  const me = idOf(user._id);
  return idOf(attachment?.uploadedBy) === me
    || Boolean(user.isOwner)
    || user.role === 'admin'
    || idOf(task?.project?.manager) === me;
}
