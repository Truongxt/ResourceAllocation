const mongoose = require('mongoose');

/**
 * Một lần chạy job định kỳ. Job được gọi từ cron BÊN NGOÀI, nên quên cấu hình cron là
 * job không bao giờ chạy mà không có lỗi nào nổ ra. Bảng này là bằng chứng duy nhất
 * job có chạy hay không — `GET /api/jobs/status` đọc từ đây.
 */
const jobRunSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    status: { type: String, enum: ['running', 'success', 'failed'], default: 'running' },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: '' },
  },
  { timestamps: false }
);

jobRunSchema.index({ name: 1, startedAt: -1 });
// Giữ 90 ngày là đủ để thấy job có chạy đều không; không để bảng phình mãi.
jobRunSchema.index({ startedAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = mongoose.model('JobRun', jobRunSchema);
