const mongoose = require('mongoose');

/**
 * Tệp đính kèm của một công việc. Nội dung nằm ở `services/fileStorage.js` dưới khóa
 * `storageKey`; ở đây chỉ có siêu dữ liệu.
 *
 * Tách khỏi `Task` để tải công việc không kéo theo danh sách tệp. Không lưu dự án: việc chuyển
 * được sang dự án khác (`moveTask`), nên mọi truy vấn theo dự án phải đi qua `task`.
 */
const attachmentSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    companyName: { type: String, trim: true },
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
    mimeType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, required: true, min: 0 },
    // Không bao giờ trả ra client: đó là chi tiết của nơi lưu, không phải của tệp.
    storageKey: { type: String, required: true, select: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('Attachment', attachmentSchema);
