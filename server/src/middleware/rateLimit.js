const rateLimit = require('express-rate-limit');

/**
 * Giới hạn tần suất request.
 *
 * Endpoint đăng nhập / đăng ký bị siết chặt hơn hẳn phần còn lại: đó là chỗ duy
 * nhất mà thử sai hàng loạt có giá trị với kẻ tấn công. Các endpoint khác đã có
 * `protect` chặn nếu không có token hợp lệ.
 *
 * Ngưỡng đặt qua biến môi trường để môi trường kiểm thử nới ra được — bộ e2e đăng
 * nhập nhiều lần liên tiếp từ cùng một IP.
 */

const minutes = (n) => n * 60 * 1000;

const message = (text) => ({ success: false, message: text });

const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || minutes(15),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Chỉ đếm lần thất bại: đăng nhập đúng liên tục không bị khoá.
  skipSuccessfulRequests: true,
  message: message('Quá nhiều lần thử đăng nhập. Vui lòng đợi ít phút rồi thử lại.'),
});

const apiLimiter = rateLimit({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS) || minutes(15),
  max: Number(process.env.API_RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Quá nhiều request. Vui lòng thử lại sau.'),
});

module.exports = { authLimiter, apiLimiter };
