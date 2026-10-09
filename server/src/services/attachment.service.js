const path = require('path');
const Attachment = require('../models/Attachment');
const fileStorage = require('./fileStorage');

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES_PER_TASK = 20;

/**
 * Đuôi tệp được nhận, kèm Content-Type khi tải về. Danh sách cho phép chứ không phải danh
 * sách cấm: thiếu một đuôi nguy hiểm trong danh sách cấm là đủ để có lỗ hổng. Không có
 * `.html`, `.svg`, `.js` — những thứ trình duyệt chạy được nếu lỡ mở trên origin của app.
 *
 * Content-Type lấy theo đuôi, không theo thứ client khai.
 */
const ALLOWED_TYPES = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
  '.rtf': 'application/rtf',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',
};

/** Content-Type theo đuôi; null nếu đuôi không được nhận. Chỉ xét đuôi cuối: `a.pdf.exe` là `.exe`. */
const contentTypeOf = (fileName) => ALLOWED_TYPES[path.extname(String(fileName)).toLowerCase()] || null;

/**
 * Tên tệp từ multipart. busboy (dưới multer) đọc tên theo latin1, nên "Báo cáo.pdf" tới đây
 * thành "BÃ¡o cÃ¡o.pdf". Đã có ký tự ngoài latin1 nghĩa là tên đã đúng UTF-8; còn không thì
 * giải lại, và chỉ nhận kết quả nếu nó là UTF-8 hợp lệ (tên latin1 thật vẫn giữ nguyên).
 */
const decodeFileName = (name) => {
  const raw = String(name || '');
  if ([...raw].some((ch) => ch.charCodeAt(0) > 0xff)) return raw;
  const decoded = Buffer.from(raw, 'latin1').toString('utf8');
  return decoded.includes('�') ? raw : decoded;
};

/** Xóa mọi tệp khớp `filter` — cả nội dung trên đĩa lẫn bản ghi. Trả về số tệp đã xóa. */
const removeAttachments = async (filter) => {
  const found = await Attachment.find(filter).select('+storageKey').lean();
  if (!found.length) return 0;
  await Promise.all(found.map((a) => fileStorage.remove(a.storageKey)));
  await Attachment.deleteMany({ _id: { $in: found.map((a) => a._id) } });
  return found.length;
};

module.exports = {
  MAX_FILE_SIZE,
  MAX_FILES_PER_TASK,
  contentTypeOf,
  decodeFileName,
  removeAttachments,
};
