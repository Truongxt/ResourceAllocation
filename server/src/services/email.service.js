/**
 * Gửi email cho thông báo & Báo cáo tổng hợp.
 *
 * Mở rộng:
 * - Hỗ trợ các thông báo hành động quan trọng (giao việc, duyệt nghiệm thu, báo cáo thất bại,
 *   đổi hạn chót, phân bổ tối ưu hóa mới, thêm vào dự án).
 * - Tôn trọng tùy chọn nhận email cá nhân (user.emailPreferences).
 * - Giao diện HTML email responsive hiện đại, phân loại màu sắc và huy hiệu theo danh mục.
 * - Hỗ trợ email tổng hợp đầu ngày (Daily Digest) cho các việc đến hạn / quá hạn / chờ duyệt.
 */

const User = require('../models/User');
const Task = require('../models/Task');
const { readMailConfig, getTransporter } = require('../config/mail');

/**
 * Ánh xạ loại thông báo sang khóa tùy chọn trong `user.emailPreferences`.
 */
const TYPE_TO_PREFERENCE_KEY = {
  task_assigned: 'task_assigned',
  task_review_requested: 'task_review',
  task_review_approved: 'task_review',
  task_review_rejected: 'task_review',
  task_failed: 'task_failed',
  task_deadline_changed: 'task_deadline',
  optimization_applied: 'optimization_applied',
  project_member_added: 'project_member_added',
};

/** Loại thông báo được phép gửi mail. */
const EMAILED_TYPES = new Set(Object.keys(TYPE_TO_PREFERENCE_KEY));

/** Bỏ dấu / gạch chéo thừa để ghép link cho gọn. */
function joinUrl(base, path) {
  if (!base) return path;
  return `${base.replace(/\/+$/, '')}/${String(path || '').replace(/^\/+/, '')}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Lấy cấu hình hiển thị (màu sắc, huy hiệu, gradient) cho từng loại thông báo.
 */
function getNotificationTypeMetadata(type) {
  switch (type) {
    case 'task_assigned':
      return {
        badge: '🎯 Phân Công Công Việc Mới',
        badgeBg: '#eff6ff',
        badgeColor: '#1d4ed8',
        borderColor: '#2563eb',
        gradient: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
        actionText: 'Xem Công Việc Ngay',
      };
    case 'task_review_requested':
      return {
        badge: '⏳ Yêu Cầu Đánh Giá Nghiệm Thu',
        badgeBg: '#fffbeb',
        badgeColor: '#b45309',
        borderColor: '#f59e0b',
        gradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
        actionText: 'Đánh Giá Kết Quả Ngay',
      };
    case 'task_review_approved':
      return {
        badge: '✅ Kết Quả Đã Được Phê Duyệt',
        badgeBg: '#f0fdf4',
        badgeColor: '#15803d',
        borderColor: '#10b981',
        gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        actionText: 'Xem Chi Tiết Công Việc',
      };
    case 'task_review_rejected':
      return {
        badge: '↩️ Yêu Cầu Chỉnh Sửa Lại',
        badgeBg: '#fef2f2',
        badgeColor: '#b91c1c',
        borderColor: '#ef4444',
        gradient: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)',
        actionText: 'Xem Nhận Xét & Chỉnh Sửa',
      };
    case 'task_failed':
      return {
        badge: '⚠️ Công Việc Báo Cáo Thất Bại',
        badgeBg: '#fff1f2',
        badgeColor: '#be123c',
        borderColor: '#f43f5e',
        gradient: 'linear-gradient(135deg, #881337 0%, #e11d48 100%)',
        actionText: 'Xem Lý Do & Phương Án Xử Lý',
      };
    case 'task_deadline_changed':
      return {
        badge: '⏰ Cập Nhật Hạn Chót',
        badgeBg: '#faf5ff',
        badgeColor: '#6b21a8',
        borderColor: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)',
        actionText: 'Xem Lịch Tiến Độ',
      };
    case 'optimization_applied':
      return {
        badge: '⚡ Đã Áp Dụng Tối Ưu Phân Bổ Mới',
        badgeBg: '#f0f9ff',
        badgeColor: '#0369a1',
        borderColor: '#0284c7',
        gradient: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)',
        actionText: 'Xem Phân Bổ Chi Tiết',
      };
    case 'project_member_added':
      return {
        badge: '📁 Bạn Được Thêm Vào Dự Án Mới',
        badgeBg: '#ecfdf5',
        badgeColor: '#047857',
        borderColor: '#10b981',
        gradient: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
        actionText: 'Truy Cập Dự Án',
      };
    default:
      return {
        badge: '🔔 Thông Báo Mới',
        badgeBg: '#f1f5f9',
        badgeColor: '#334155',
        borderColor: '#64748b',
        gradient: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
        actionText: 'Xem Trong Ứng Dụng',
      };
  }
}

/**
 * Dựng nội dung email từ một thông báo.
 *
 * @param {{title: string, message: string, type?: string, link?: string}} notification
 * @param {{name?: string, email: string}} recipient
 * @param {{clientUrl?: string, companyName?: string}} options
 */
function buildNotificationEmail(notification, recipient, { clientUrl, companyName } = {}) {
  const greeting = recipient.name ? `Chào ${recipient.name},` : 'Chào bạn,';
  const url = joinUrl(clientUrl, notification.link || '/');
  const typeMeta = getNotificationTypeMetadata(notification.type);
  const company = companyName || 'Resource Allocation Optimization';

  const text = [
    greeting,
    '',
    notification.message,
    '',
    `Xem chi tiết: ${url}`,
    '',
    '— Resource Allocation Optimization',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b; }
    .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: ${typeMeta.gradient}; padding: 26px 24px; text-align: left; color: #ffffff; }
    .badge { display: inline-block; background: rgba(255, 255, 255, 0.22); color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .header h1 { margin: 0; font-size: 19px; font-weight: 700; color: #ffffff; line-height: 1.35; }
    .content { padding: 28px 24px; }
    .greeting { font-size: 15px; font-weight: 600; color: #334155; margin-bottom: 14px; }
    .msg-card { background: #f8fafc; border-left: 4px solid ${typeMeta.borderColor}; border-radius: 0 8px 8px 0; padding: 16px 18px; margin: 18px 0; font-size: 14.5px; line-height: 1.6; color: #0f172a; border-top: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; }
    .btn-container { text-align: center; margin: 26px 0 16px 0; }
    .btn { display: inline-block; background: ${typeMeta.borderColor}; color: #ffffff !important; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .footer { text-align: center; padding: 18px 20px; font-size: 11.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
    .footer p { margin: 4px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">${typeMeta.badge}</div>
      <h1>${escapeHtml(notification.title)}</h1>
    </div>
    <div class="content">
      <p class="greeting">${escapeHtml(greeting)}</p>
      <div class="msg-card">
        ${escapeHtml(notification.message)}
      </div>
      <div class="btn-container">
        <a href="${escapeHtml(url)}" target="_blank" class="btn">${typeMeta.actionText} (Xem chi tiết)</a>
      </div>
    </div>
    <div class="footer">
      <p><strong>${escapeHtml(company)}</strong> · Hệ Thống Quản Lý Tài Nguyên & Phân Bổ Công Việc</p>
      <p>Bạn nhận được email này theo cài đặt thông báo của tài khoản. Để tùy chỉnh, vui lòng vào Cài đặt > Tùy chọn Email.</p>
    </div>
  </div>
</body>
</html>
  `;

  return { to: recipient.email, subject: notification.title, text, html };
}

/**
 * Kiểm tra xem loại thông báo này có được gửi mail không (kết hợp với cài đặt cá nhân của người nhận).
 *
 * @param {string} type
 * @param {object} [userPreferences]
 * @returns {boolean}
 */
function shouldEmail(type, userPreferences) {
  if (!EMAILED_TYPES.has(type)) return false;
  if (!userPreferences) return true;

  const prefKey = TYPE_TO_PREFERENCE_KEY[type];
  if (!prefKey) return true;

  // Nếu người dùng đã chỉ định tắt rõ ràng: return false
  return userPreferences[prefKey] !== false;
}

/**
 * Gửi mail cho một thông báo đã tạo. Không bao giờ ném lỗi ra ngoài.
 *
 * @param {object} notification
 * @param {object} env
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
async function sendNotificationEmail(notification, env = process.env) {
  try {
    if (!notification || !EMAILED_TYPES.has(notification.type)) {
      return { sent: false, reason: 'loại thông báo này không gửi mail' };
    }

    const config = readMailConfig(env);
    if (!config.enabled) return { sent: false, reason: config.reason };

    const transporter = getTransporter(env);
    if (!transporter) return { sent: false, reason: 'chưa dựng được transporter' };

    const recipient = await User.findById(notification.recipient)
      .select('name email emailPreferences companyName')
      .lean();

    if (!recipient?.email) return { sent: false, reason: 'người nhận không có email' };

    if (!shouldEmail(notification.type, recipient.emailPreferences)) {
      return { sent: false, reason: 'người dùng đã tắt nhận email cho loại thông báo này' };
    }

    const clientUrl = (env.CLIENT_URL || '').split(',')[0].trim();
    const message = buildNotificationEmail(notification, recipient, {
      clientUrl,
      companyName: recipient.companyName,
    });

    await transporter.sendMail({ from: config.from, ...message });
    return { sent: true };
  } catch (error) {
    console.error('Gửi email thất bại:', error.message);
    return { sent: false, reason: error.message };
  }
}

/**
 * Ghi trạng thái email lúc khởi động để người vận hành biết ngay, khỏi đoán.
 */
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

/**
 * Dựng nội dung email tổng hợp đầu ngày (Daily Digest).
 */
function buildDailyDigestEmail({ user, summary, clientUrl, companyName }) {
  const company = companyName || user.companyName || 'Resource Allocation Optimization';
  const greeting = user.name ? `Chào ${user.name},` : 'Chào bạn,';
  const tasksUrl = joinUrl(clientUrl, '/tasks');
  const dateFormatted = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = `[${company}] Tóm tắt công việc đầu ngày — ${dateFormatted}`;

  const dueCount = summary.dueToday?.length || 0;
  const overdueCount = summary.overdue?.length || 0;
  const reviewCount = summary.pendingReviews?.length || 0;

  const text = [
    greeting,
    '',
    `Dưới đây là tổng hợp nhanh các công việc của bạn trong ngày ${dateFormatted}:`,
    `- Công việc đến hạn hôm nay: ${dueCount}`,
    `- Công việc đang quá hạn: ${overdueCount}`,
    `- Yêu cầu đang chờ bạn đánh giá/duyệt: ${reviewCount}`,
    '',
    `Xem danh sách công việc: ${tasksUrl}`,
    '',
    `— ${company}`,
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b; }
    .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #ffffff; }
    .header p { margin: 0; opacity: 0.85; font-size: 13.5px; }
    .content { padding: 28px 24px; }
    .greeting { font-size: 15px; font-weight: 600; margin-bottom: 14px; }
    .stat-row { display: flex; margin: 20px 0; gap: 12px; }
    .stat-card { flex: 1; padding: 14px; border-radius: 8px; text-align: center; }
    .stat-card.due { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
    .stat-card.overdue { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    .stat-card.review { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
    .stat-number { font-size: 24px; font-weight: 800; line-height: 1.2; margin-bottom: 4px; }
    .stat-label { font-size: 11.5px; font-weight: 600; text-transform: uppercase; }
    .task-list { margin: 20px 0; }
    .task-item { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13.5px; }
    .task-item:last-child { border-bottom: none; }
    .btn-container { text-align: center; margin: 26px 0 16px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .footer { text-align: center; padding: 16px 20px; font-size: 11.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📬 Bản Tin Công Việc Đầu Ngày</h1>
      <p>${escapeHtml(dateFormatted)} · ${escapeHtml(company)}</p>
    </div>
    <div class="content">
      <p class="greeting">${escapeHtml(greeting)}</p>
      <p style="font-size: 14px; color: #475569; margin: 0 0 16px 0;">Tổng hợp nhanh các nhiệm vụ cần chú ý trong ngày của bạn:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 12px; background: #eff6ff; border-radius: 8px; width: 33%; text-align: center;">
            <div style="font-size: 22px; font-weight: 800; color: #1e40af;">${dueCount}</div>
            <div style="font-size: 11px; font-weight: 600; color: #1e40af; text-transform: uppercase;">Đến hạn hôm nay</div>
          </td>
          <td style="width: 2%;"></td>
          <td style="padding: 12px; background: #fef2f2; border-radius: 8px; width: 33%; text-align: center;">
            <div style="font-size: 22px; font-weight: 800; color: #991b1b;">${overdueCount}</div>
            <div style="font-size: 11px; font-weight: 600; color: #991b1b; text-transform: uppercase;">Đang quá hạn</div>
          </td>
          <td style="width: 2%;"></td>
          <td style="padding: 12px; background: #fffbeb; border-radius: 8px; width: 33%; text-align: center;">
            <div style="font-size: 22px; font-weight: 800; color: #92400e;">${reviewCount}</div>
            <div style="font-size: 11px; font-weight: 600; color: #92400e; text-transform: uppercase;">Chờ đánh giá</div>
          </td>
        </tr>
      </table>

      ${summary.dueToday && summary.dueToday.length > 0 ? `
      <div style="margin-top: 20px;">
        <strong style="font-size: 13px; color: #1e40af;">📌 Công việc đến hạn hôm nay:</strong>
        <div style="background: #f8fafc; border-radius: 8px; margin-top: 8px; border: 1px solid #e2e8f0;">
          ${summary.dueToday.slice(0, 5).map((t) => `
            <div style="padding: 9px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">
              • <strong>${escapeHtml(t.title)}</strong> ${t.project?.name ? `<span style="color:#64748b">(${escapeHtml(t.project.name)})</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      ${summary.overdue && summary.overdue.length > 0 ? `
      <div style="margin-top: 16px;">
        <strong style="font-size: 13px; color: #991b1b;">⚠️ Công việc quá hạn cần hoàn thành gấp:</strong>
        <div style="background: #f8fafc; border-radius: 8px; margin-top: 8px; border: 1px solid #e2e8f0;">
          ${summary.overdue.slice(0, 5).map((t) => `
            <div style="padding: 9px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #991b1b;">
              • <strong>${escapeHtml(t.title)}</strong> ${t.project?.name ? `<span style="color:#64748b">(${escapeHtml(t.project.name)})</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      <div class="btn-container">
        <a href="${escapeHtml(tasksUrl)}" target="_blank" class="btn">Mở Danh Sách Công Việc</a>
      </div>
    </div>
    <div class="footer">
      <p><strong>${escapeHtml(company)}</strong> · Quản lý Công việc & Tối ưu Nguồn lực</p>
      <p>Để tắt nhận bản tin hàng ngày, vui lòng vào Cài đặt > Tùy chọn Email.</p>
    </div>
  </div>
</body>
</html>
  `;

  return { to: user.email, subject, text, html };
}

/**
 * Gửi email thử nghiệm (Test Email) để kiểm tra cấu hình SMTP.
 */
async function sendTestNotificationEmail({ recipient, clientUrl, companyName }, env = process.env) {
  try {
    if (!recipient || !recipient.email) {
      return { sent: false, reason: 'Không có địa chỉ email người nhận' };
    }

    const config = readMailConfig(env);
    if (!config.enabled) {
      return { sent: false, simulated: true, reason: config.reason };
    }

    const transporter = getTransporter(env);
    if (!transporter) {
      return { sent: false, reason: 'Chưa khởi tạo được mail transporter' };
    }

    const sampleNotification = {
      type: 'task_assigned',
      title: 'Kiểm tra cấu hình Email hệ thống',
      message: 'Chúc mừng! Máy chủ gửi thư SMTP của bạn đã được kết nối và hoạt động chính xác.',
      link: '/settings?tab=notifications',
    };

    const message = buildNotificationEmail(sampleNotification, recipient, {
      clientUrl: clientUrl || env.CLIENT_URL,
      companyName,
    });

    const info = await transporter.sendMail({ from: config.from, ...message });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('Gửi email thử nghiệm thất bại:', error.message);
    return { sent: false, reason: error.message };
  }
}

/**
 * Gửi email tổng hợp đầu ngày cho tất cả người dùng đã bật tùy chọn `daily_digest`.
 */
async function sendAllDailyDigests(now = new Date(), env = process.env) {
  const config = readMailConfig(env);
  if (!config.enabled) {
    return { sent: 0, reason: config.reason, skipped: true };
  }

  const transporter = getTransporter(env);
  if (!transporter) {
    return { sent: 0, reason: 'chưa dựng được transporter', skipped: true };
  }

  const users = await User.find({
    isActive: true,
    'emailPreferences.daily_digest': true,
  }).select('name email emailPreferences companyName');

  let sentCount = 0;
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  for (const user of users) {
    try {
      const [dueToday, overdue, pendingReviews] = await Promise.all([
        Task.find({
          assignee: user._id,
          status: { $nin: ['done', 'failed'] },
          endDate: { $gte: startOfDay, $lte: endOfDay },
        }).select('title endDate project').populate('project', 'name').limit(10),

        Task.find({
          assignee: user._id,
          status: { $nin: ['done', 'failed'] },
          endDate: { $lt: startOfDay },
        }).select('title endDate project').populate('project', 'name').limit(10),

        Task.find({
          reviewers: user._id,
          status: 'review',
        }).select('title project').populate('project', 'name').limit(10),
      ]);

      // Nếu không có việc nào cần chú ý, có thể bỏ qua để tránh làm phiền
      if (dueToday.length === 0 && overdue.length === 0 && pendingReviews.length === 0) {
        continue;
      }

      const clientUrl = (env.CLIENT_URL || '').split(',')[0].trim();
      const mail = buildDailyDigestEmail({
        user,
        summary: { dueToday, overdue, pendingReviews },
        clientUrl,
        companyName: user.companyName,
      });

      await transporter.sendMail({ from: config.from, ...mail });
      sentCount++;
    } catch (err) {
      console.error(`Lỗi gửi daily digest cho ${user.email}:`, err.message);
    }
  }

  return { processed: users.length, sent: sentCount };
}

module.exports = {
  TYPE_TO_PREFERENCE_KEY,
  EMAILED_TYPES,
  getNotificationTypeMetadata,
  buildNotificationEmail,
  buildUserWelcomeEmail,
  buildDailyDigestEmail,
  shouldEmail,
  sendNotificationEmail,
  sendUserWelcomeEmail,
  sendTestNotificationEmail,
  sendAllDailyDigests,
  logMailStatus,
};
