/**
 * Nguồn duy nhất cho cấu hình JWT.
 *
 * Trước đây mỗi nơi tự đọc process.env.JWT_SECRET kèm một giá trị dự phòng khác nhau
 * (`auth.controller` dùng 'default_jwt_secret_key_rao_2026', còn `middleware/auth` và
 * `server.js` dùng 'default_secret'). Khi thiếu biến môi trường, token ký ở nơi này
 * không verify được ở nơi kia: đăng nhập thành công nhưng mọi request cần xác thực
 * đều trả 401. Gom về một chỗ để không thể lệch lại.
 */

const { isRelaxedEnv } = require('./env');

const DEV_FALLBACK_SECRET = 'rao_dev_only_insecure_secret';

const getJwtSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  // Khóa dự phòng nằm công khai trong mã nguồn: ai đọc repo cũng ký được token của
  // bất kỳ tài khoản nào. Chỉ dùng khi NODE_ENV ghi rõ development/test — bỏ trống
  // cũng bị từ chối, vì "quên đặt NODE_ENV" chính là cách nó lọt lên máy chủ thật.
  if (!isRelaxedEnv()) {
    throw new Error(
      'JWT_SECRET là bắt buộc. Chỉ được bỏ trống khi NODE_ENV=development hoặc test ' +
      `(hiện tại: ${process.env.NODE_ENV || 'chưa đặt'}).`
    );
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

/**
 * Tuổi thọ access token. Ngắn có chủ đích: access token không thu hồi được,
 * nên cửa sổ dùng lại một token bị đánh cắp đúng bằng con số này.
 *
 * `JWT_EXPIRE` cũ **không còn được dùng** cho access token. Giữ nguyên nó làm
 * mặc định sẽ âm thầm cấp access token sống 7 ngày cho mọi .env đang có, tức là
 * xóa sạch lợi ích của việc thêm refresh token. Thấy biến cũ thì cảnh báo.
 */
const getAccessTokenExpire = () => {
  if (process.env.JWT_EXPIRE && !getAccessTokenExpire._warned) {
    console.warn(
      '⚠️  JWT_EXPIRE không còn được dùng. Access token dùng ACCESS_TOKEN_EXPIRE ' +
      `(hiện tại: ${process.env.ACCESS_TOKEN_EXPIRE || '15m'}), refresh token dùng REFRESH_TOKEN_EXPIRE.`
    );
    getAccessTokenExpire._warned = true;
  }
  return process.env.ACCESS_TOKEN_EXPIRE || '15m';
};

/** Tuổi thọ refresh token, tính bằng ngày. Đây là token thu hồi được. */
const getRefreshTokenDays = () => {
  const days = Number(process.env.REFRESH_TOKEN_DAYS || 7);
  return Number.isFinite(days) && days > 0 ? days : 7;
};

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

module.exports = {
  getJwtSecret,
  getAccessTokenExpire,
  getRefreshTokenDays,
  assertJwtConfig,
};
