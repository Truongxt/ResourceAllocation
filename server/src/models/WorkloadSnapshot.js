const mongoose = require('mongoose');

/**
 * Ảnh chụp tải của một nhân sự trong một ngày — do job `workload-snapshot` ghi.
 *
 * `GET /analytics/workload-trend` SUY RA tải từ lịch công việc hiện tại; nó không trả lời
 * được "tuần trước tải của An là bao nhiêu" vì lịch đã đổi từ đó. Bảng này giữ con số
 * ĐÃ GHI NHẬN tại từng ngày. Khóa duy nhất `(resource, date)`: chạy lại job trong ngày
 * thì ghi đè, không thêm bản ghi.
 */
const workloadSnapshotSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },          // nửa đêm (giờ server) của ngày chụp
    resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    companyName: { type: String, default: null, index: true },
    workload: { type: Number, default: 0 },        // giờ của tuần cao điểm — cùng phép tính trang Utilization
    unscheduled: { type: Number, default: 0 },     // giờ đã giao nhưng chưa có ngày
    capacity: { type: Number, default: 0 },        // maxCapacity × fte (giờ/tuần)
    utilization: { type: Number, default: 0 },     // %
    openTasks: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

workloadSnapshotSchema.index({ resource: 1, date: 1 }, { unique: true });
workloadSnapshotSchema.index({ companyName: 1, date: 1 });

module.exports = mongoose.model('WorkloadSnapshot', workloadSnapshotSchema);
