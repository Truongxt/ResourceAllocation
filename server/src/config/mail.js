/**
 * Cấu hình gửi email.
 *
 * Nguyên tắc: **mặc định tắt**. Email chỉ bật khi có đủ cấu hình thật, vì một
 * hệ thống không gửi được mail vẫn phải chạy bình thường — mất thông báo phụ
 * thì chấp nhận được, chết luồng giao việc thì không.
 */

const nodemailer = require('nodemailer');

/**
 * Quyết định có gửi email hay không, dựa trên biến môi trường.
 *
 * Hàm thuần: nhận env vào, trả quyết định ra, không đụng mạng — nhờ vậy kiểm thử
 * được đầy đủ các nhánh mà không cần server SMTP.
 *
 * @returns {{enabled: boolean, reason?: string, host?: string, port?: number,
 *            secure?: boolean, auth?: object, from?: string}}
 */
function readMailConfig(env = process.env) {
  if (env.NODE_ENV === 'test') {
    return { enabled: false, reason: 'đang chạy kiểm thử' };
  }

  if (String(env.EMAIL_ENABLED || '').toLowerCase() === 'false') {
    return { enabled: false, reason: 'EMAIL_ENABLED=false' };
  }

  const host = (env.SMTP_HOST || '').trim();
  const from = (env.MAIL_FROM || '').trim();

  if (!host) return { enabled: false, reason: 'thiếu SMTP_HOST' };
  if (!from) return { enabled: false, reason: 'thiếu MAIL_FROM' };

  const port = Number(env.SMTP_PORT || 587);
  if (!Number.isFinite(port) || port <= 0) {
    return { enabled: false, reason: `SMTP_PORT không hợp lệ: ${env.SMTP_PORT}` };
  }

  const user = (env.SMTP_USER || '').trim();
  const pass = env.SMTP_PASS || '';

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

/** Transporter dùng chung, dựng một lần. Trả null khi email đang tắt. */
function getTransporter(env = process.env) {
  const config = readMailConfig(env);
  if (!config.enabled) return null;

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  return cachedTransporter;
}

/** Dùng trong kiểm thử để tránh transporter của lần chạy trước dính sang. */
function resetTransporter() {
  cachedTransporter = null;
}

module.exports = { readMailConfig, getTransporter, resetTransporter };
