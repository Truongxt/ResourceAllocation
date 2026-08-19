const mongoose = require('mongoose');

const optimizationResultSchema = new mongoose.Schema(
  {
    algorithm: {
      type: String,
      enum: ['genetic', 'csp', 'hybrid'],
      required: true,
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      default: 'running',
    },
    // Input parameters
    parameters: {
      populationSize: Number,
      maxGenerations: Number,
      crossoverRate: Number,
      mutationRate: Number,
      weights: {
        workloadBalance: Number,
        skillMatch: Number,
        cost: Number,
        overallocation: Number,
      },
    },
    // Scope
    projectFilter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    taskCount: { type: Number, default: 0 },
    resourceCount: { type: Number, default: 0 },
    // Results
    fitness: { type: Number, default: 0 },
    assignments: [
      {
        task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
        taskTitle: String,
        resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource' },
        resourceName: String,
        skillMatch: Number,
        estimatedHours: Number,
      },
    ],
    metrics: {
      workloadVariance: Number,
      averageSkillMatch: Number,
      totalCost: Number,
      overallocatedResources: Number,
      averageUtilization: Number,
      resourceUtilization: [
        {
          resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource' },
          name: String,
          workload: Number,
          capacity: Number,
          utilization: Number,
          isOverloaded: Boolean,
        },
      ],
    },
    convergenceHistory: [
      {
        generation: Number,
        fitness: Number,
      },
    ],
    constraintReport: {
      satisfied: Number,
      violated: Number,
      // Trước đây chỉ lưu hai con số, nên "violated: 1" không cho biết vi phạm gì.
      // Từ khi có H4, một lời giải có thể vừa đạt capacity vừa vướng thứ tự phụ thuộc.
      details: {
        satisfied: [
          {
            _id: false,
            type: { type: String }, // 'capacity' | 'dependency'
            subject: String, // tên nhân sự, hoặc "Việc trước → Việc sau"
            detail: String,
          },
        ],
        violated: [
          {
            _id: false,
            type: { type: String },
            subject: String,
            detail: String,
          },
        ],
      },
    },
    // Performance
    executionTime: { type: Number, default: 0 }, // ms
    generations: { type: Number, default: 0 },
    iterations: { type: Number, default: 0 },
    // Applied
    isApplied: { type: Boolean, default: false },
    appliedAt: Date,
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Meta
    errorMessage: String,
    runBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

optimizationResultSchema.index({ algorithm: 1, createdAt: -1 });
optimizationResultSchema.index({ status: 1 });

module.exports = mongoose.model('OptimizationResult', optimizationResultSchema);
