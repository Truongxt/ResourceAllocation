const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên phòng ban là bắt buộc'],
      trim: true,
      maxlength: [120, 'Tên phòng ban không vượt quá 120 ký tự'],
    },
    companyName: {
      type: String,
      trim: true,
      default: 'Công ty Công nghệ RAO',
    },
    code: {
      type: String,
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
    managers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    color: {
      type: String,
      trim: true,
      default: '#6366f1',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

departmentSchema.index({ name: 1, companyName: 1 }, { unique: true });
// `sparse` KHÔNG dùng được ở đây. Với chỉ mục ghép, MongoDB vẫn đưa document vào
// chỉ mục khi **một trong các** trường có mặt — mà `companyName` thì luôn có, nên
// sparse không bỏ qua được ai. Mọi phòng ban không đặt mã đều nằm chung một khóa
// `(null, <công ty>)`, và phòng ban thứ hai không mã của cùng công ty bị chặn với
// E11000 báo trùng 'code' — trong khi người dùng chưa hề nhập mã nào.
//
// `partialFilterExpression` mới diễn đạt đúng ý định: chỉ ràng buộc trùng lặp khi
// `code` thực sự là một chuỗi, còn bỏ trống thì không bị đụng nhau.
departmentSchema.index(
  { code: 1, companyName: 1 },
  { unique: true, partialFilterExpression: { code: { $type: 'string' } } }
);
departmentSchema.index({ isActive: 1, companyName: 1, name: 1 });

module.exports = mongoose.model('Department', departmentSchema);
