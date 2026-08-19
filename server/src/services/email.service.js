/**
 * Gửi email cho thông báo.
 *
 * Chỉ một số loại thông báo mới gửi mail. Gửi tất cả thì hộp thư của người dùng
 * ngập ngay ngày đầu — mỗi lần ai đó đổi trạng thái một công việc là một cái mail —
 * và người ta sẽ lọc thẳng vào thùng rác, tức là mất luôn cái đáng lẽ phải đọc.
 * Mốc chọn lọc: chỉ gửi khi có việc **được giao cho người đó**, vì đó là thứ họ
 * cần biết ngay cả khi không mở ứng dụng.
 */

const User = require('../models/User');
const { readMailConfig, getTransporter } = require('../config/mail');

/** Loại thông báo được phép gửi mail. */
const EMAILED_TYPES = new Set(['task_assigned']);

/** Bỏ dấu / gạch chéo thừa để ghép link cho gọn. */
function joinUrl(base, path) {
  if (!base) return path;
  return `${base.replace(/\/+$/, '')}/${String(path || '').replace(/^\/+/, '')}`;
}

/**
 * Dựng nội dung email từ một thông báo. Hàm thuần — không đọc env, không gửi đi đâu.
 *
 * @param {{title: string, message: string, link?: string}} notification
 * @param {{name?: string, email: string}} recipient
 * @param {{clientUrl?: string}} options
 */
function buildNotificationEmail(notification, recipient, { clientUrl } = {}) {
  const greeting = recipient.name ? `Chào ${recipient.name},` : 'Chào bạn,';
  const url = joinUrl(clientUrl, notification.link || '/');

  const text = [
    greeting,
    '',
    notification.message,
    '',
    `Xem chi tiết: ${url}`,
    '',
    '— Resource Allocation Optimization',
  ].join('\n');

  const html = [
    `<p>${escapeHtml(greeting)}</p>`,
    `<p>${escapeHtml(notification.message)}</p>`,
    `<p><a href="${escapeHtml(url)}">Xem chi tiết</a></p>`,
    '<hr>',
    '<p style="color:#64748b;font-size:12px">Resource Allocation Optimization</p>',
  ].join('\n');

  return { to: recipient.email, subject: notification.title, text, html };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Loại thông báo này có gửi mail không. */
function shouldEmail(type) {
  return EMAILED_TYPES.has(type);
}

/**
 * Gửi mail cho một thông báo đã tạo. Không bao giờ ném lỗi ra ngoài: hỏng mail
 * không được phép làm hỏng việc giao task.
 *
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
async function sendNotificationEmail(notification, env = process.env) {
  try {
    if (!notification || !shouldEmail(notification.type)) {
      return { sent: false, reason: 'loại thông báo này không gửi mail' };
    }

    const config = readMailConfig(env);
    if (!config.enabled) return { sent: false, reason: config.reason };

    const transporter = getTransporter(env);
    if (!transporter) return { sent: false, reason: 'chưa dựng được transporter' };

    const recipient = await User.findById(notification.recipient).select('name email').lean();
    if (!recipient?.email) return { sent: false, reason: 'người nhận không có email' };

    const clientUrl = (env.CLIENT_URL || '').split(',')[0].trim();
    const message = buildNotificationEmail(notification, recipient, { clientUrl });

    await transporter.sendMail({ from: config.from, ...message });
    return { sent: true };
  } catch (error) {
    console.error('Gửi email thất bại:', error.message);
    return { sent: false, reason: error.message };
  }
}

/** Ghi trạng thái email lúc khởi động để người vận hành biết ngay, khỏi đoán. */
function logMailStatus(env = process.env) {
  const config = readMailConfig(env);
  if (config.enabled) {
    console.log(`Email: BẬT — gửi qua ${config.host}:${config.port}, from ${config.from}`);
  } else {
    console.log(`Email: TẮT (${config.reason}). Thông báo chỉ hiện trong ứng dụng.`);
  }
}

module.exports = {
  EMAILED_TYPES,
  buildNotificationEmail,
  shouldEmail,
  sendNotificationEmail,
  logMailStatus,
};
