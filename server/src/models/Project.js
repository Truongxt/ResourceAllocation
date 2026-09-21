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
      sparse: true,
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
          type: Number,
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
    companyName: {
      type: String,
      trim: true,
      default: 'Công ty Công nghệ RAO',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Base Wework: Department (Phân nhóm / Phòng ban cấp cha)
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    // Base Wework: Phân loại dự án (help.base.vn/articles/63000270225)
    projectType: {
      type: String,
      enum: ['internal', 'client'],
      default: 'internal',
    },
    // Base Wework: Màu sắc nhận diện dự án
    color: {
      type: String,
      trim: true,
      default: '#6366f1',
    },
    // Base Wework: Mẫu dự án (Template)
    template: {
      type: String,
      trim: true,
      default: null,
    },
    // Base Wework: Cấu hình phân quyền thao tác trong dự án
    permissions: {
      allowAssigneeEditDeadline: { type: Boolean, default: false },
      allowAssigneeEditTitleDesc: { type: Boolean, default: false },
      allowAssigneeReassign: { type: Boolean, default: false },
      allowFollowerComment: { type: Boolean, default: true },
      allowMembersCreateTasks: { type: Boolean, default: true },
      allowCreatorDeleteTask: { type: Boolean, default: false },
      allowAssigneeDeleteTask: { type: Boolean, default: false },
      allowFollowerMarkDone: { type: Boolean, default: false },
      allowMembersViewAllTasks: { type: Boolean, default: true },
      allowGuestCreateTask: { type: Boolean, default: false },
    },
    // Base Wework: cấu hình đánh dấu công việc Thất bại. Bật theo từng dự án chứ
    // không bật toàn hệ thống — một dự án nghiên cứu chấp nhận thất bại là chuyện
    // thường, một dự án bàn giao khách hàng thì không.
    failureConfig: {
      enabled: { type: Boolean, default: false },
      // Admin và quản lý dự án luôn được phép, không cần khai ở đây.
      allowedRoles: {
        type: [String],
        enum: ['assigner', 'assignee', 'follower'],
        default: [],
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

projectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
});

projectSchema.index({ status: 1 });
projectSchema.index({ manager: 1 });
projectSchema.index({ department: 1 });
projectSchema.index({ companyName: 1 });
projectSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Project', projectSchema);