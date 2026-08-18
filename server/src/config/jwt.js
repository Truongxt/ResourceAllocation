/**
 * Nguồn duy nhất cho cấu hình JWT.
 *
 * Trước đây mỗi nơi tự đọc process.env.JWT_SECRET kèm một giá trị dự phòng khác nhau
 * (`auth.controller` dùng 'default_jwt_secret_key_rao_2026', còn `middleware/auth` và
 * `server.js` dùng 'default_secret'). Khi thiếu biến môi trường, token ký ở nơi này
 * không verify được ở nơi kia: đăng nhập thành công nhưng mọi request cần xác thực
 * đều trả 401. Gom về một chỗ để không thể lệch lại.
 */

const DEV_FALLBACK_SECRET = 'rao_dev_only_insecure_secret';

const getJwtSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET là bắt buộc khi NODE_ENV=production');
  }

  if (!getJwtSecret._warned) {
    console.warn(
      '⚠️  Chưa đặt JWT_SECRET — đang dùng khóa dự phòng chỉ dành cho môi trường dev. ' +
      'Hãy thêm JWT_SECRET vào .env trước khi triển khai.'
    );
    getJwtSecret._warned = true;
  }

  return DEV_FALLBACK_SECRET;
};

const getJwtExpire = () => process.env.JWT_EXPIRE || '7d';

/**
 * Kiểm tra cấu hình ngay lúc khởi động.
 *
 * getJwtSecret() là lazy — chỉ chạy khi ký hoặc verify token. Nếu không gọi hàm này
 * lúc boot, server ở production vẫn khởi động bình thường rồi mới ném lỗi ở request
 * đầu tiên, và lỗi đó bị middleware nuốt thành 401 khó lần ra nguyên nhân.
 */
const assertJwtConfig = () => {
  getJwtSecret();
};

module.exports = { getJwtSecret, getJwtExpire, assertJwtConfig };
