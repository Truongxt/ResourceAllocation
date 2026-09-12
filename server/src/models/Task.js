const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tiêu đề công việc là bắt buộc'],
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
    parentTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'review', 'done', 'blocked'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    actualHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    checklist: [
      {
        title: { type: String, required: true, trim: true },
        isCompleted: { type: Boolean, default: false },
        assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        order: { type: Number, default: 0 },
      },
    ],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true, maxlength: 3000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    requiredSkills: [
      {
        name: String,
        // Cùng thang với Resource.skills[].level (enum 1-4). Trước đây nhận tới 5,
        // nên yêu cầu mức 5 vĩnh viễn không ai đạt được: điểm khớp là
        // min(level_nhân_sự, level_yêu_cầu) / level_yêu_cầu, tối đa 4/5 = 0.8.
        // Bản ghi cũ còn level 5 được dọn bằng `npm run migrate:skill-level`.
        level: {
          type: Number,
          min: 1,
          max: 4,
          default: 3,
        },
        weight: {
          type: Number,
          min: 0,
          max: 1,
          default: 1,
        },
      },
    ],
    dependencies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
    companyName: {
      type: String,
      trim: true,
      default: 'Công ty Công nghệ RAO',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Base Wework: Báo cáo kết quả công việc khi hoàn thành
    resultReport: {
      summary: {
        type: String,
        maxlength: [3000, 'Báo cáo kết quả không vượt quá 3000 ký tự'],
        default: '',
      },
      deliverableLinks: [
        {
          title: { type: String, trim: true },
          url: { type: String, trim: true },
        },
      ],
      attachments: [
        {
          name: { type: String, trim: true },
          url: { type: String, trim: true },
          size: { type: Number, default: 0 },
        },
      ],
      actualHours: {
        type: Number,
        default: 0,
        min: 0,
      },
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      submittedAt: {
        type: Date,
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      approvedAt: {
        type: Date,
      },
    },
    // Base Wework: Lịch sử gia hạn / điều chỉnh thời hạn hoàn thành
    deadlineHistory: [
      {
        oldEndDate: { type: Date },
        newEndDate: { type: Date },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, trim: true, maxlength: 500 },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    // Base Wework: Liên kết công việc lặp lại gốc
    recurringTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecurringTask',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: lấy danh sách subtasks
taskSchema.virtual('subtasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'parentTask',
});

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ followers: 1 });
taskSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Task', taskSchema);