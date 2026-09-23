const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userName: {
      type: String,
      default: 'Hệ thống',
    },
    userEmail: {
      type: String,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ['project', 'task', 'resource', 'department', 'optimization', 'auth', 'system'],
      default: 'system',
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.Mixed,
    },
    entityTitle: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    // Khóa phân lập công ty, cùng quy ước với các model còn lại.
    //
    // Thiếu trường này thì nhật ký không có ranh giới nào: `getActivityLogs` bỏ
    // bộ lọc khi người gọi là `admin` — mà admin công ty nào cũng là admin — nên
    // họ đọc được vết hoạt động của mọi công ty, gồm cả tên thực thể và mô tả.
    // Nặng hơn, `clearActivityLogs` từng gọi `deleteMany({})`: một admin bất kỳ
    // xóa sạch nhật ký kiểm toán của **toàn hệ thống**.
    companyName: {
      type: String,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ entityType: 1, action: 1 });
activityLogSchema.index({ companyName: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
