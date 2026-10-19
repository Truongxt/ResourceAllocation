const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    position: {
      type: String,
      trim: true,
      required: [true, 'Vị trí công việc là bắt buộc'],
    },
    department: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: 'Công ty Công nghệ RAO',
    },
    // Skill Matrix & Two-Way Competency Evaluation
    skills: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        // Cấp độ chính thức dùng cho phân bổ và thuật toán (1=Beginner, 2=Intermediate, 3=Advanced, 4=Expert)
        level: {
          type: Number,
          enum: [1, 2, 3, 4],
          required: true,
          default: 1,
        },
        // Nhân viên tự đánh giá
        selfLevel: {
          type: Number,
          enum: [1, 2, 3, 4],
          default: 1,
        },
        // Quản lý đánh giá lại / phê duyệt
        managerLevel: {
          type: Number,
          enum: [1, 2, 3, 4],
        },
        yearsOfExperience: {
          type: Number,
          default: 0,
        },
        // Trạng thái đánh giá
        evaluationStatus: {
          type: String,
          enum: ['draft', 'self_assessed', 'approved', 'returned'],
          default: 'approved',
        },
        managerFeedback: {
          type: String,
          trim: true,
          default: '',
        },
        evidence: { type: String, trim: true, maxlength: 2000, default: '' },
        submittedAt: Date,
        evaluatedAt: {
          type: Date,
        },
        evaluatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    evaluationVersion: { type: Number, default: 0 },
    skillEvaluationHistory: [{
      action: { type: String, enum: ['submitted', 'approved', 'returned'], required: true },
      actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      actorName: String,
      at: { type: Date, default: Date.now },
      changes: [{
        name: String, previousLevel: Number, selfLevel: Number, approvedLevel: Number,
        feedback: String, evidence: String,
      }],
    }],
    // Performance & Productivity Assessment
    performanceRating: {
      type: Number, // Thang điểm 1 - 5 sao
      min: 1,
      max: 5,
      default: 4.5,
    },
    performanceNotes: {
      type: String,
      trim: true,
      default: '',
    },
    // Capacity
    maxCapacity: {
      type: Number, // Max hours per week
      default: 40,
      min: 0,
    },
    fte: {
      type: Number, // Full Time Equivalent (0.0 - 1.0)
      default: 1.0,
      min: 0,
      max: 1.0,
    },
    // Current workload
    currentWorkload: {
      type: Number, // Current allocated hours per week
      default: 0,
      min: 0,
    },
    // Giờ công của task đã giao nhưng **chưa xếp lịch** (thiếu ngày bắt đầu/kết thúc).
    // Không đặt được lên trục thời gian nên không vào `currentWorkload`, nhưng cũng
    // không được phép biến mất: đây là khối việc đã cam kết mà chưa biết rơi vào tuần
    // nào. Xem `services/workload.service.js`.
    unscheduledWorkload: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Cost
    hourlyRate: {
      type: Number,
      default: 0,
    },
    // Availability
    availability: {
      type: String,
      enum: ['available', 'partially_available', 'unavailable'],
      default: 'available',
    },
    // Leave / unavailable periods
    unavailablePeriods: [
      {
        startDate: Date,
        endDate: Date,
        reason: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
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

// Virtual: utilization rate
resourceSchema.virtual('utilizationRate').get(function () {
  if (this.maxCapacity * this.fte === 0) return this.currentWorkload > 0 ? 101 : 0;
  return Math.round((this.currentWorkload / (this.maxCapacity * this.fte)) * 100);
});

// Virtual: is overloaded
resourceSchema.virtual('isOverloaded').get(function () {
  return this.currentWorkload > this.maxCapacity * this.fte;
});

// Indexes
resourceSchema.index({ 'skills.name': 1, 'skills.level': 1 });
resourceSchema.index({ availability: 1 });
resourceSchema.index({ department: 1 });
resourceSchema.index({ companyName: 1 });

module.exports = mongoose.model('Resource', resourceSchema);
