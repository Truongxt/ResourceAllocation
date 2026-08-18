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
      enum: [
        'task_assigned',
        'task_status_changed',
        'task_updated',
        'project_updated',
        'project_member_added',
        'optimization_completed',
        'optimization_applied',
        'system',
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
      enum: ['task', 'project', 'resource', 'optimization', 'system'],
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