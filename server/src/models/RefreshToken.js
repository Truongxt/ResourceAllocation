const mongoose = require('mongoose');

/**
 * Refresh token — token **thu hồi được**, khác access token (JWT) không thu hồi được.
 *
 * Ba quyết định đáng nói:
 *
 * 1. **Chỉ lưu bản băm.** Giá trị thật chỉ tồn tại trong cookie của người dùng.
 *    Lộ database thì kẻ đọc được cũng không có token dùng được, giống cách lưu mật khẩu.
 *
 * 2. **Xoay vòng.** Mỗi lần làm mới sinh token mới và thu hồi token cũ, ghi lại
 *    `replacedBy` để nối thành chuỗi. Nhờ chuỗi này mà phát hiện được tái sử dụng.
 *
 * 3. **`family` gom cả chuỗi về một mối.** Khi một token đã thu hồi bị dùng lại —
 *    dấu hiệu token bị đánh cắp và phát lại — thu hồi cả họ chứ không riêng cái đó,
 *    vì lúc ấy không phân biệt được ai là chủ thật.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // SHA-256 của token thật. Không bao giờ lưu giá trị gốc.
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Cả chuỗi xoay vòng bắt nguồn từ một lần đăng nhập dùng chung giá trị này.
    family: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    // Vì sao bị thu hồi: rotated | logout | logout_all | password_changed | reuse_detected
    revokedReason: {
      type: String,
      default: null,
    },
    replacedBy: {
      type: String, // tokenHash của token kế tiếp trong chuỗi
      default: null,
    },
    userAgent: String,
    ipAddress: String,
  },
  { timestamps: true }
);

// MongoDB tự dọn bản ghi đã quá hạn. Không cần cron, và không để bảng phình mãi.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.virtual('isActive').get(function () {
  return !this.revokedAt && this.expiresAt > new Date();
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
