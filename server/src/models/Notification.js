const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      // Danh sách này phải phủ hết mọi giá trị `type` mà controller thực sự gửi.
      // Thiếu một giá trị thì Notification.create ném ValidationError, và
      // sendNotification nuốt lỗi rồi trả null — thông báo mất không dấu vết.
      enum: [
        'task_assigned',
        'task_status_changed',
        'task_updated',
        'task_comment',
        'task_follower_added',
        'task_subtask_added',
        'task_review_requested',
        'task_review_approved',
        'task_review_rejected',
        'project_updated',
        'project_member_added',
        'optimization_completed',
        'optimization_applied',
        'system',
        'system_alert',
      ],
      default: 'system',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    entityType: {
      type: String,
      enum: ['task', 'project', 'resource', 'optimization', 'user', 'system'],
      default: 'system',
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    link: {
      type: String,
      trim: true,
      default: '/',
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);