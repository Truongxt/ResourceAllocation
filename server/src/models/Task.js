const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tên công việc là bắt buộc'],
      trim: true,
      maxlength: [300, 'Tên công việc không vượt quá 300 ký tự'],
    },
    description: {
      type: String,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Dự án là bắt buộc'],
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'in_review', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    // Task scheduling
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
    // Assignment
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
    },
    // Required skills for this task
    requiredSkills: [
      {
        skill: {
          type: String,
          required: true,
        },
        level: {
          type: Number,
          enum: [1, 2, 3, 4], // 1=Beginner, 2=Intermediate, 3=Advanced, 4=Expert
          default: 1,
        },
      },
    ],
    // Dependencies (predecessor tasks)
    dependencies: [
      {
        task: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Task',
        },
        type: {
          type: String,
          enum: ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'],
          default: 'finish_to_start',
        },
      },
    ],
    // Effort / complexity
    storyPoints: {
      type: Number,
      default: 0,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completedAt: {
      type: Date,
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

// Indexes
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1 });
taskSchema.index({ startDate: 1, endDate: 1 });

// Auto-set completedAt when status changes to 'done'
taskSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'done' && !this.completedAt) {
    this.completedAt = new Date();
    this.progress = 100;
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
