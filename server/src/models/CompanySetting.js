const mongoose = require('mongoose');

const companySettingSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Tên công ty là bắt buộc'],
      unique: true,
      trim: true,
    },
    // Base Wework: Phân quyền tạo phòng ban / dự án (https://help.base.vn/support/solutions/articles/63000270226)
    createProjectPermission: {
      type: String,
      enum: ['only_admin', 'all_members'],
      default: 'only_admin',
    },
    createDepartmentPermission: {
      type: String,
      enum: ['only_admin', 'all_members'],
      default: 'only_admin',
    },
  },
  {
    timestamps: true,
  }
);

companySettingSchema.index({ companyName: 1 }, { unique: true });

module.exports = mongoose.model('CompanySetting', companySettingSchema);
