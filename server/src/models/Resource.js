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
    // Skill Matrix
    skills: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        level: {
          type: Number,
          enum: [1, 2, 3, 4], // 1=Beginner, 2=Intermediate, 3=Advanced, 4=Expert
          required: true,
        },
        yearsOfExperience: {
          type: Number,
          default: 0,
        },
      },
    ],
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
  if (this.maxCapacity === 0) return 0;
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

module.exports = mongoose.model('Resource', resourceSchema);
