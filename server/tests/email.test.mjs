/**
 * Kiểm thử đơn vị cho tầng email: quyết định BẬT/TẮT và nội dung thư.
 *
 * Không cần server, database, hay SMTP. Trọng tâm là hai điều dễ sai và đắt khi sai:
 *   1. Email phải **mặc định tắt** — cấu hình thiếu thì hệ thống vẫn chạy, không
 *      được ném lỗi làm hỏng luồng giao việc.
 *   2. Chỉ loại thông báo "được giao việc" mới gửi mail, để hộp thư không bị ngập.
 */

import { createRequire } from 'module';
import { ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { readMailConfig } = require('../src/config/mail');
const { buildNotificationEmail, shouldEmail } = require('../src/services/email.service');

/** env tối thiểu để email được coi là đã cấu hình đủ. */
const fullEnv = {
  NODE_ENV: 'development',
  SMTP_HOST: 'smtp.example.com',
  MAIL_FROM: 'RAO <no-reply@rao.local>',
};

// ══════════════════════════════════════════════
S('Quyết định bật/tắt email');
{
  ok(readMailConfig({ NODE_ENV: 'development' }).enabled === false,
    'Không khai báo gì → TẮT, không nổ lỗi');

  ok(readMailConfig({ NODE_ENV: 'development' }).reason === 'thiếu SMTP_HOST',
    'Nói rõ thiếu cái gì chứ không im lặng');

  ok(readMailConfig({ ...fullEnv, MAIL_FROM: '' }).reason === 'thiếu MAIL_FROM',
    'Có host nhưng thiếu người gửi → vẫn tắt, nêu đúng lý do');

  ok(readMailConfig(fullEnv).enabled === true,
    'Đủ SMTP_HOST và MAIL_FROM → BẬT');

  ok(readMailConfig({ ...fullEnv, NODE_ENV: 'test' }).enabled === false,
    'Đang chạy kiểm thử thì luôn tắt — bộ test không được gửi mail thật');

  ok(readMailConfig({ ...fullEnv, EMAIL_ENABLED: 'false' }).enabled === false,
    'EMAIL_ENABLED=false tắt hẳn dù đã khai báo đủ SMTP');

  ok(readMailConfig({ ...fullEnv, SMTP_PORT: 'không-phải-số' }).enabled === false,
    'Cổng sai định dạng → tắt kèm lý do, không để nodemailer nổ lúc gửi');
}

// ══════════════════════════════════════════════
S('Cổng và TLS');
{
  ok(readMailConfig(fullEnv).port === 587, 'Không khai báo cổng → mặc định 587');

  ok(readMailConfig({ ...fullEnv, SMTP_PORT: '465' }).secure === true,
    'Cổng 465 tự bật secure — đó là SMTPS, TLS ngay từ đầu');

  ok(readMailConfig({ ...fullEnv, SMTP_PORT: '587' }).secure === false,
    'Cổng 587 để secure=false vì dùng STARTTLS');

  ok(readMailConfig({ ...fullEnv, SMTP_SECURE: 'true' }).secure === true,
    'SMTP_SECURE=true ép bật dù cổng không phải 465');

  ok(readMailConfig(fullEnv).auth === undefined,
    'Không có SMTP_USER → không gửi khối auth (relay nội bộ không cần đăng nhập)');

  ok(readMailConfig({ ...fullEnv, SMTP_USER: 'u', SMTP_PASS: 'p' }).auth?.user === 'u',
    'Có SMTP_USER thì kèm auth');
}

// ══════════════════════════════════════════════
S('Loại thông báo nào được gửi mail');
{
  ok(shouldEmail('task_assigned') === true, 'Được giao việc → có gửi mail');
  ok(shouldEmail('task_status_changed') === false,
    'Đổi trạng thái → KHÔNG gửi, nếu không hộp thư ngập ngay ngày đầu');
  ok(shouldEmail('optimization_completed') === false, 'Chạy xong tối ưu hóa → không gửi');
  ok(shouldEmail('system') === false, 'Thông báo hệ thống → không gửi');
}

// ══════════════════════════════════════════════
S('Nội dung thư');
{
  const notification = {
    type: 'task_assigned',
    title: 'Công việc mới được phân công',
    message: 'Bạn đã được gán công việc "Thiết kế UI" trong dự án Web',
    link: '/tasks',
  };

  const mail = buildNotificationEmail(notification, { name: 'Nam', email: 'nam@rao.com' }, {
    clientUrl: 'https://rao.example.com',
  });

  ok(mail.to === 'nam@rao.com', 'Gửi đúng địa chỉ người nhận');
  ok(mail.subject === notification.title, 'Tiêu đề thư lấy từ tiêu đề thông báo');
  ok(mail.text.includes('Chào Nam'), 'Xưng hô bằng tên người nhận');
  ok(mail.text.includes(notification.message), 'Thân thư có nội dung thông báo');

  ok(mail.text.includes('https://rao.example.com/tasks'),
    'Link ghép từ CLIENT_URL, không thừa dấu gạch chéo',
    mail.text.match(/https:\S+/)?.[0]);

  const noSlash = buildNotificationEmail(notification, { email: 'a@b.c' }, {
    clientUrl: 'https://rao.example.com/',
  });
  ok(noSlash.text.includes('https://rao.example.com/tasks'),
    'CLIENT_URL có dấu / ở cuối cũng không sinh ra //');
  ok(noSlash.text.includes('Chào bạn'), 'Người nhận không có tên → xưng hô trung tính');

  const hostile = buildNotificationEmail(
    { ...notification, message: 'Công việc <script>alert(1)</script>' },
    { name: '<b>Nam</b>', email: 'a@b.c' },
    { clientUrl: 'https://rao.example.com' }
  );
  ok(!hostile.html.includes('<script>'),
    'Nội dung do người dùng nhập được escape trong bản HTML');
  ok(!hostile.html.includes('<b>Nam</b>'), 'Tên người nhận cũng được escape');
  ok(hostile.text.includes('<script>alert(1)</script>'),
    'Bản text giữ nguyên — text/plain không diễn giải thẻ nên không cần escape');
}

summary();
