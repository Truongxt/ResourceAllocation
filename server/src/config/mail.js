/**
 * Cấu hình gửi email.
 *
 * Nguyên tắc: **mặc định tắt**. Email chỉ bật khi có đủ cấu hình thật, vì một
 * hệ thống không gửi được mail vẫn phải chạy bình thường — mất thông báo phụ
 * thì chấp nhận được, chết luồng giao việc thì không.
 */

const path = require('path');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

function cleanEnvVal(val) {
  if (!val) return '';
  return String(val).trim().replace(/^["']|["']$/g, '');
}

/**
 * Quyết định có gửi email hay không, dựa trên biến môi trường.
 *
 * @returns {{enabled: boolean, reason?: string, host?: string, port?: number,
 *            secure?: boolean, auth?: object, from?: string}}
 */
function readMailConfig(env = process.env) {
  if (env.NODE_ENV === 'test') {
    return { enabled: false, reason: 'đang chạy kiểm thử' };
  }

  // Luôn nạp lại .env mới nhất nếu ở môi trường dev để nhận cấu hình ngay lập tức mà không cần restart server
  if (env.NODE_ENV !== 'test') {
    try {
      dotenv.config({ path: path.join(__dirname, '../../../.env'), override: true });
    } catch {
      /* ignore */
    }
  }

  if (String(env.EMAIL_ENABLED || '').toLowerCase() === 'false') {
    return { enabled: false, reason: 'EMAIL_ENABLED=false' };
  }

  const host = cleanEnvVal(env.SMTP_HOST);
  const from = cleanEnvVal(env.MAIL_FROM);

  if (!host) return { enabled: false, reason: 'thiếu SMTP_HOST' };
  if (!from) return { enabled: false, reason: 'thiếu MAIL_FROM' };

  const port = Number(env.SMTP_PORT || 587);
  if (!Number.isFinite(port) || port <= 0) {
    return { enabled: false, reason: `SMTP_PORT không hợp lệ: ${env.SMTP_PORT}` };
  }

  const user = cleanEnvVal(env.SMTP_USER);
  const pass = cleanEnvVal(env.SMTP_PASS);

  return {
    enabled: true,
    host,
    port,
    // Cổng 465 là SMTPS (TLS ngay từ đầu); các cổng khác dùng STARTTLS.
    secure: String(env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
    auth: user ? { user, pass } : undefined,
    from,
  };
}

let cachedTransporter = null;
let lastTransporterKey = null;

/** Transporter dùng chung, tự động tái tạo khi cấu hình SMTP thay đổi. Trả null khi email đang tắt. */
function getTransporter(env = process.env) {
  const config = readMailConfig(env);
  if (!config.enabled) {
    cachedTransporter = null;
    lastTransporterKey = null;
    return null;
  }

  const currentKey = `${config.host}:${config.port}:${config.auth?.user}:${config.auth?.pass}:${config.from}`;
  if (!cachedTransporter || lastTransporterKey !== currentKey) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
    lastTransporterKey = currentKey;
  }

  return cachedTransporter;
}

/** Dùng trong kiểm thử để tránh transporter của lần chạy trước dính sang. */
function resetTransporter() {
  cachedTransporter = null;
  lastTransporterKey = null;
}

module.exports = { readMailConfig, getTransporter, resetTransporter };
