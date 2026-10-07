/**
 * Nguồn duy nhất cho danh sách origin được phép, dùng chung cho REST API (`app.js`)
 * và Socket.IO (`server.js`).
 *
 * Trước đây Socket.IO nhận nguyên chuỗi `CLIENT_URL`, còn REST thì tách theo dấu
 * phẩy. Khai báo nhiều origin thì REST chạy được còn realtime âm thầm không bao
 * giờ kết nối — giao diện không báo lỗi gì, chỉ là thông báo tức thì không đến.
 */

const DEFAULT_CLIENT_URL = 'http://localhost:5173';

// Ở môi trường dev, cho phép thiết bị di động trong mạng LAN kết nối thẳng
const DEV_LAN_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/;

const parseAllowedOrigins = (clientUrl = process.env.CLIENT_URL) =>
  (clientUrl || DEFAULT_CLIENT_URL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const isOriginAllowed = (origin, env = process.env) => {
  // Request không kèm Origin (curl, health check của hạ tầng) được đi qua
  if (!origin) return true;
  if (parseAllowedOrigins(env.CLIENT_URL).includes(origin)) return true;
  return env.NODE_ENV !== 'production' && DEV_LAN_ORIGIN.test(origin);
};

/** Dạng callback mà cả `cors` lẫn Socket.IO đều nhận. */
const corsOrigin = (origin, callback) => {
  if (isOriginAllowed(origin)) return callback(null, true);
  callback(new Error(`Origin không được phép: ${origin}`));
};

module.exports = { parseAllowedOrigins, isOriginAllowed, corsOrigin };
