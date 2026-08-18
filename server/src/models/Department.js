const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên phòng ban là bắt buộc'],
      unique: true,
      trim: true,
      maxlength: [120, 'Tên phòng ban không vượt quá 120 ký tự'],
    },
    code: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      maxlength: [12, 'Mã phòng ban không vượt quá 12 ký tự'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Mô tả không vượt quá 1000 ký tự'],
    },
    managerName: {
      type: String,
      trim: true,
      maxlength: [100, 'Tên quản lý không vượt quá 100 ký tự'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

departmentSchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model('Department', departmentSchema);
