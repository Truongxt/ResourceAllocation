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
  },
  {
    timestamps: true,
  }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ entityType: 1, action: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
