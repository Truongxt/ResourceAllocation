const mongoose = require('mongoose');

const recurringTaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tiêu đề công việc lặp lại là bắt buộc'],
      trim: true,
      maxlength: [300, 'Tiêu đề không vượt quá 300 ký tự'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Mô tả không vượt quá 5000 ký tự'],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Dự án là bắt buộc'],
    },
    taskGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskGroup',
      default: null,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    estimatedHours: {
      type: Number,
      default: 8,
      min: 0,
    },
    checklist: [
      {
        title: { type: String, required: true, trim: true },
        assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    subtasks: [
      {
        title: { type: String, required: true, trim: true },
        assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        estimatedHours: { type: Number, default: 2 },
      },
    ],
    // Chu kỳ lặp: hàng ngày, hàng tuần, hàng tháng, hàng quý, hàng năm
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'weekly',
    },
    interval: {
      type: Number,
      default: 1,
      min: 1,
    },
    daysOfWeek: [
      {
        type: Number,
        min: 0,
        max: 6, // 0 = Sunday, 1 = Monday, ... 6 = Saturday
      },
    ],
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
      default: 1,
    },
    durationHours: {
      type: Number,
      default: 8,
      min: 0.5,
    },
    startDate: {
      type: Date,
      required: [true, 'Ngày bắt đầu chu kỳ là bắt buộc'],
    },
    endDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastGeneratedAt: {
      type: Date,
      default: null,
    },
    nextRunDate: {
      type: Date,
      default: null,
    },
    companyName: {
      type: String,
      trim: true,
      default: 'Công ty Công nghệ RAO',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

recurringTaskSchema.index({ project: 1, isActive: 1 });
recurringTaskSchema.index({ nextRunDate: 1, isActive: 1 });
recurringTaskSchema.index({ companyName: 1 });

module.exports = mongoose.model('RecurringTask', recurringTaskSchema);
