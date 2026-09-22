/**
 * Cổng, database và biến môi trường của lượt chạy e2e.
 *
 * Tách riêng khỏi `playwright.config.js` để `global-setup.js` lấy được cấu hình
 * mà không phải require ngược lại chính file config đang được Playwright nạp.
 *
 * Mọi giá trị đều **khác** môi trường phát triển và khác `server/tests`, nên chạy
 * kiểm thử không đụng tới dữ liệu đang làm việc dở:
 *
 *              môi trường dev   server/tests   e2e
 *   server     5000             5099           5098
 *   client     5173             —              5174
 *   database   ..._allocation   ..._test       ..._e2e
 */

const SERVER_PORT = process.env.E2E_SERVER_PORT || '5098';
const CLIENT_PORT = process.env.E2E_CLIENT_PORT || '5174';
const MONGODB_URI = process.env.E2E_MONGODB_URI || 'mongodb://localhost:27017/resource_allocation_e2e';

const BASE_URL = `http://localhost:${CLIENT_PORT}`;
const API_URL = `http://localhost:${SERVER_PORT}/api`;
const SOCKET_URL = `http://localhost:${SERVER_PORT}`;

// Môi trường cho tiến trình server test. Hai ngưỡng rate limit được nới ra vì cả
// bộ test đăng nhập liên tục từ cùng một IP — bản thân middleware giới hạn tần
// suất đã có bộ kiểm riêng ở `server/tests/security.test.mjs`.
const serverEnv = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: SERVER_PORT,
  MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET || 'rao_e2e_secret',
  CLIENT_URL: BASE_URL,
  AUTH_RATE_LIMIT_MAX: '10000',
  API_RATE_LIMIT_MAX: '100000',
};

// Biến VITE_* phải truyền qua đây chứ không đọc từ `.env`: file đó trỏ về cổng
// 5000 của môi trường phát triển. `VITE_SOCKET_URL` đặc biệt dễ quên — thiếu nó
// thì trang vẫn chạy, chỉ có realtime âm thầm không kết nối.
const clientEnv = {
  ...process.env,
  VITE_API_URL: API_URL,
  VITE_SOCKET_URL: SOCKET_URL,
};

module.exports = {
  SERVER_PORT, CLIENT_PORT, MONGODB_URI,
  BASE_URL, API_URL, SOCKET_URL,
  serverEnv, clientEnv,
};
