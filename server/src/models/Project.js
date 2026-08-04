const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên dự án là bắt buộc'],
      trim: true,
      maxlength: [200, 'Tên dự án không vượt quá 200 ký tự'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Mô tả không vượt quá 2000 ký tự'],
    },
    code: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [10, 'Mã dự án không vượt quá 10 ký tự'],
    },
    status: {
      type: String,
      enum: ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'],
      default: 'planning',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    startDate: {
      type: Date,
      required: [true, 'Ngày bắt đầu là bắt buộc'],
    },
    endDate: {
      type: Date,
      required: [true, 'Ngày kết thúc là bắt buộc'],
    },
    budget: {
      type: Number,
      default: 0,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project Manager là bắt buộc'],
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['lead', 'developer', 'designer', 'tester', 'devops'],
          default: 'developer',
        },
        allocation: {
          type: Number, // FTE percentage (0-100)
          default: 100,
          min: 0,
          max: 100,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    tags: [String],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: tasks count
projectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
});

// Index for faster queries
projectSchema.index({ status: 1 });
projectSchema.index({ manager: 1 });
projectSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Project', projectSchema);
