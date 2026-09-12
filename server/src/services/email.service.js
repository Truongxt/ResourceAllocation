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

/**
 * Dựng nội dung email gửi thông tin tài khoản và mật khẩu cho người dùng mới.
 *
 * @param {{
 *   user: { name: string, email: string, role?: string, jobTitle?: string, department?: string },
 *   plainPassword: string,
 *   companyName?: string,
 *   clientUrl?: string,
 * }} data
 */
function buildUserWelcomeEmail({ user, plainPassword, companyName, clientUrl }) {
  const company = companyName || 'Hệ thống Quản lý Tài nguyên';
  const roleNames = {
    admin: 'Quản trị hệ thống (Admin)',
    project_manager: 'Quản lý dự án (Project Manager)',
    member: 'Thành viên (Member)',
    guest: 'Khách (Guest)',
  };
  const roleText = roleNames[user.role] || user.role || 'Thành viên';
  const loginUrl = joinUrl(clientUrl || 'http://localhost:5173', '/login');

  const subject = `[${company}] Thông tin tài khoản và mật khẩu đăng nhập hệ thống`;

  const text = [
    `Kính gửi ${user.name},`,
    '',
    `Chào mừng bạn đến với ${company}! Tài khoản của bạn đã được khởi tạo thành công trên hệ thống.`,
    '',
    '--- THÔNG TIN ĐĂNG NHẬP ---',
    `• Email đăng nhập: ${user.email}`,
    `• Mật khẩu khởi tạo: ${plainPassword}`,
    `• Họ và tên: ${user.name}`,
    `• Vị trí / Chức danh: ${user.jobTitle || 'Chưa cập nhật'}`,
    `• Phòng ban: ${user.department || 'Chưa cập nhật'}`,
    `• Vai trò: ${roleText}`,
    `• Đơn vị: ${company}`,
    '',
    `Đăng nhập ngay tại: ${loginUrl}`,
    '',
    'LƯU Ý BẢO MẬT: Mật khẩu này được cấp mặc định lúc khởi tạo. Để đảm bảo an toàn, vui lòng đăng nhập và đổi lại mật khẩu của bạn tại mục Cài đặt tài khoản.',
    '',
    'Trân trọng,',
    `${company} - Đội ngũ Quản trị Hệ thống`,
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; color: #1e293b; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
    .header p { margin: 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; margin-bottom: 16px; }
    .card-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .card-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .password-highlight { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; background: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; }
    .btn-container { text-align: center; margin: 30px 0 20px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 3px 10px rgba(37, 99, 235, 0.35); }
    .security-notice { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 13px; color: #92400e; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(company)}</h1>
      <p>Thông Báo Cấp Tài Khoản Hệ Thống</p>
    </div>
    <div class="content">
      <p class="greeting">Kính gửi <strong>${escapeHtml(user.name)}</strong>,</p>
      <p>Chào mừng bạn gia nhập <strong>${escapeHtml(company)}</strong>. Ban quản trị đã khởi tạo tài khoản thành viên của bạn trên hệ thống.</p>

      <div class="card-box">
        <div class="card-title">🔑 Thông Tin Đăng Nhập Tài Khoản</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 9px 0; color: #64748b; font-size: 13.5px; width: 38%;">Email đăng nhập:</td>
            <td style="padding: 9px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${escapeHtml(user.email)}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #64748b; font-size: 13.5px;">Mật khẩu khởi tạo:</td>
            <td style="padding: 9px 0;"><span class="password-highlight">${escapeHtml(plainPassword)}</span></td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #64748b; font-size: 13.5px;">Họ và tên:</td>
            <td style="padding: 9px 0; color: #0f172a; font-size: 14px;">${escapeHtml(user.name)}</td>
          </tr>
          ${user.jobTitle ? `
          <tr>
            <td style="padding: 9px 0; color: #64748b; font-size: 13.5px;">Vị trí / Chức danh:</td>
            <td style="padding: 9px 0; color: #0f172a; font-size: 14px;">${escapeHtml(user.jobTitle)}</td>
          </tr>` : ''}
          ${user.department ? `
          <tr>
            <td style="padding: 9px 0; color: #64748b; font-size: 13.5px;">Phòng ban:</td>
            <td style="padding: 9px 0; color: #0f172a; font-size: 14px;">${escapeHtml(user.department)}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 9px 0; color: #64748b; font-size: 13.5px;">Vai trò hệ thống:</td>
            <td style="padding: 9px 0; color: #0f172a; font-size: 14px;">${escapeHtml(roleText)}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #64748b; font-size: 13.5px;">Tổ chức:</td>
            <td style="padding: 9px 0; color: #0f172a; font-size: 14px;">${escapeHtml(company)}</td>
          </tr>
        </table>
      </div>

      <div class="security-notice">
        <strong>⚠️ Lưu ý bảo mật:</strong> Mật khẩu trên được cấp mặc định lúc khởi tạo. Vui lòng đăng nhập và đổi lại mật khẩu cá nhân tại mục <em>Cài đặt &gt; Bảo mật & Phiên đăng nhập</em> ngay sau khi truy cập.
      </div>

      <div class="btn-container">
        <a href="${escapeHtml(loginUrl)}" target="_blank" class="btn">Đăng Nhập Ngay Vào Hệ Thống</a>
      </div>
    </div>
    <div class="footer">
      <p>Email này được gửi tự động từ hệ thống quản trị ${escapeHtml(company)}.</p>
      <p>Vui lòng không trả lời trực tiếp email này.</p>
    </div>
  </div>
</body>
</html>
  `;

  return { to: user.email, subject, text, html };
}

/**
 * Gửi email thông tin tài khoản và mật khẩu cho người dùng mới.
 *
 * @param {{
 *   user: object,
 *   plainPassword: string,
 *   companyName?: string,
 *   clientUrl?: string,
 * }} params
 * @param {object} env
 * @returns {Promise<{sent: boolean, reason?: string, simulated?: boolean, messageId?: string}>}
 */
async function sendUserWelcomeEmail(params, env = process.env) {
  try {
    const { user, plainPassword, companyName, clientUrl } = params;
    if (!user || !user.email) {
      return { sent: false, reason: 'Người dùng không có email' };
    }

    const config = readMailConfig(env);
    const effectiveClientUrl = (clientUrl || env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
    const mailMessage = buildUserWelcomeEmail({
      user,
      plainPassword,
      companyName: companyName || user.companyName,
      clientUrl: effectiveClientUrl,
    });

    if (!config.enabled) {
      console.log('\n================================================================================');
      console.log('📧 [MÔ PHỎNG GỬI EMAIL THÔNG TIN TÀI KHOẢN MỚI]');
      console.log(`• Gửi tới: ${user.email} (${user.name})`);
      console.log(`• Tiêu đề: ${mailMessage.subject}`);
      console.log(`• Mật khẩu khởi tạo: ${plainPassword}`);
      console.log(`• Đơn vị: ${companyName || user.companyName}`);
      console.log(`• Link đăng nhập: ${joinUrl(effectiveClientUrl, '/login')}`);
      console.log(`• Trạng thái SMTP: Chưa kích hoạt trong .env (${config.reason})`);
      console.log('================================================================================\n');
      return { sent: false, simulated: true, reason: config.reason, preview: { email: user.email, plainPassword } };
    }

    const transporter = getTransporter(env);
    if (!transporter) {
      return { sent: false, reason: 'Chưa khởi tạo được mail transporter' };
    }

    const info = await transporter.sendMail({
      from: config.from,
      to: mailMessage.to,
      subject: mailMessage.subject,
      text: mailMessage.text,
      html: mailMessage.html,
    });

    console.log(`✅ Đã gửi email thông tin tài khoản thành công tới ${user.email}: messageId=${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Lỗi gửi email tới ${params?.user?.email}:`, error.message);
    return { sent: false, reason: error.message };
  }
}

module.exports = {
  EMAILED_TYPES,
  buildNotificationEmail,
  buildUserWelcomeEmail,
  shouldEmail,
  sendNotificationEmail,
  sendUserWelcomeEmail,
  logMailStatus,
};
