/**
 * Nguồn duy nhất cho câu hỏi "có được nới lỏng cấu hình an toàn không".
 *
 * Trước đây mỗi nơi tự so `NODE_ENV === 'production'` rồi mới siết. Quên đặt biến
 * đó trên máy chủ thật — không lỗi nào nổ ra — là server ký token bằng khóa dev
 * nằm công khai trong mã nguồn, cookie refresh không bật `secure`, giới hạn đăng
 * nhập sai nới lên 200 và CORS nhận mọi IP mạng LAN.
 *
 * Nay đảo chiều: mặc định là chặt. Chỉ nới khi `NODE_ENV` ghi RÕ `development`
 * hoặc `test`; bỏ trống, gõ sai (`prod`, `staging`…) đều coi như production.
 */
const RELAXED = new Set(['development', 'test']);

const isRelaxedEnv = (env = process.env) => RELAXED.has(env.NODE_ENV);

/**
 * Cookie refresh có cờ `secure` hay không.
 *
 * `COOKIE_SECURE` khai rõ `true`/`false` thì theo đó — `false` là lối thoát cho
 * triển khai nội bộ chạy HTTP thường, phải tự tay ghi ra chứ không tự nhiên mà có.
 * Bỏ trống thì bật ở mọi môi trường không được nới lỏng.
 */
const isCookieSecure = (env = process.env) => {
  const explicit = String(env.COOKIE_SECURE || '').trim().toLowerCase();
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return !isRelaxedEnv(env);
};

module.exports = { isRelaxedEnv, isCookieSecure };
