const mongoose = require('mongoose');

const taskGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên nhóm công việc là bắt buộc'],
      trim: true,
      maxlength: [150, 'Tên nhóm không vượt quá 150 ký tự'],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Dự án là bắt buộc'],
    },
    color: {
      type: String,
      default: '#3b82f6',
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isOpen: {
      type: Boolean,
      default: true,
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
  { timestamps: true }
);

taskGroupSchema.index({ project: 1, order: 1 });
taskGroupSchema.index({ companyName: 1 });

module.exports = mongoose.model('TaskGroup', taskGroupSchema);
