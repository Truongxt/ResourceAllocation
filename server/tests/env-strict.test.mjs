/**
 * Kiểm thử cho `src/config/env.js` và những nơi dựa vào nó: mặc định là chặt, chỉ
 * nới khi `NODE_ENV` ghi rõ `development` hoặc `test`. Không cần server hay database.
 *
 * Lỗi mà bộ này canh: quên đặt `NODE_ENV=production` trên máy chủ thật — không lỗi
 * nào nổ ra — là server ký token bằng khóa dev công khai, cookie refresh không
 * `secure`, giới hạn đăng nhập sai nới lên 200 và CORS nhận mọi IP mạng LAN.
 */

import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { isRelaxedEnv, isCookieSecure } = require('../src/config/env');
const { isOriginAllowed } = require('../src/config/cors');

const serverDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Chạy một đoạn mã trong tiến trình riêng với đúng các biến môi trường đã cho. */
const runWith = (vars, script) => {
  const env = { ...process.env };
  for (const key of ['NODE_ENV', 'JWT_SECRET', 'COOKIE_SECURE', 'AUTH_RATE_LIMIT_MAX']) delete env[key];
  const run = spawnSync('node', ['-e', script], {
    cwd: serverDir, env: { ...env, ...vars }, encoding: 'utf8', timeout: 30000,
  });
  return { out: run.stdout.trim(), err: run.stderr, status: run.status };
};

// ══════════════════════════════════════════════
S('Môi trường nào được nới lỏng');
{
  ok(isRelaxedEnv({ NODE_ENV: 'development' }), 'development');
  ok(isRelaxedEnv({ NODE_ENV: 'test' }), 'test');
  ok(!isRelaxedEnv({ NODE_ENV: 'production' }), 'production: chặt');
  ok(!isRelaxedEnv({}), 'Bỏ trống: chặt — đây là ca từng lọt');
  ok(!isRelaxedEnv({ NODE_ENV: 'prod' }), 'Gõ sai "prod": chặt');
  ok(!isRelaxedEnv({ NODE_ENV: 'staging' }), 'staging: chặt');
  ok(!isRelaxedEnv({ NODE_ENV: 'Development' }), 'Sai hoa thường: chặt, không đoán');
}

// ══════════════════════════════════════════════
S('JWT_SECRET');
{
  const script = `console.log(require('./src/config/jwt').getJwtSecret())`;

  const unset = runWith({}, script);
  ok(unset.status !== 0 && /JWT_SECRET là bắt buộc/.test(unset.err),
    'Thiếu NODE_ENV và thiếu JWT_SECRET: từ chối, không dùng khóa dev', `status=${unset.status}`);

  const typo = runWith({ NODE_ENV: 'prod' }, script);
  ok(typo.status !== 0, 'NODE_ENV=prod thiếu JWT_SECRET: từ chối', `status=${typo.status}`);

  const dev = runWith({ NODE_ENV: 'development' }, script);
  ok(dev.status === 0 && dev.out === 'rao_dev_only_insecure_secret',
    'development thiếu JWT_SECRET: vẫn chạy bằng khóa tạm', dev.out || dev.err.slice(0, 120));

  const real = runWith({ JWT_SECRET: 'khoa-that' }, script);
  ok(real.status === 0 && real.out === 'khoa-that', 'Có JWT_SECRET thì dùng nó, bất kể NODE_ENV', real.out);
}

// ══════════════════════════════════════════════
S('Cookie refresh: cờ secure');
{
  ok(isCookieSecure({}) === true, 'Bỏ trống NODE_ENV: bật');
  ok(isCookieSecure({ NODE_ENV: 'production' }) === true, 'production: bật');
  ok(isCookieSecure({ NODE_ENV: 'development' }) === false, 'development: tắt (localhost chạy HTTP)');
  ok(isCookieSecure({ NODE_ENV: 'test' }) === false, 'test: tắt');
  ok(isCookieSecure({ NODE_ENV: 'development', COOKIE_SECURE: 'true' }) === true, 'COOKIE_SECURE=true thắng');
  ok(isCookieSecure({ COOKIE_SECURE: 'false' }) === false,
    'COOKIE_SECURE=false thắng — lối thoát cho triển khai HTTP nội bộ');
  ok(isCookieSecure({ COOKIE_SECURE: ' False ' }) === false, 'Không phân biệt hoa thường, khoảng trắng');
}

// ══════════════════════════════════════════════
S('Giới hạn đăng nhập sai khi không khai AUTH_RATE_LIMIT_MAX');
{
  // Đọc ngưỡng qua header chuẩn của chính middleware, thay vì soi cấu hình bên trong.
  const script = `
    const { authLimiter } = require('./src/middleware/rateLimit');
    const headers = {};
    const req = { ip: '203.0.113.7', method: 'POST', headers: {}, app: { get: () => false }, socket: {} };
    const res = {
      setHeader: (k, v) => { headers[k.toLowerCase()] = String(v); },
      getHeader: (k) => headers[k.toLowerCase()],
      on: () => {}, headersSent: false, statusCode: 200,
    };
    authLimiter(req, res, () => console.log(headers['ratelimit-limit']));
  `;
  const unset = runWith({}, script);
  ok(unset.out === '10', 'Bỏ trống NODE_ENV: 10', unset.out || unset.err.slice(0, 200));
  const dev = runWith({ NODE_ENV: 'development' }, script);
  ok(dev.out === '200', 'development: 200', dev.out || dev.err.slice(0, 200));
  const explicit = runWith({ NODE_ENV: 'development', AUTH_RATE_LIMIT_MAX: '5' }, script);
  ok(explicit.out === '5', 'Khai rõ thì dùng giá trị khai', explicit.out || explicit.err.slice(0, 200));
}

// ══════════════════════════════════════════════
S('CORS: IP mạng LAN');
{
  const lan = 'http://192.168.1.10:8081';
  ok(!isOriginAllowed(lan, { CLIENT_URL: 'https://app.rao.vn' }), 'Bỏ trống NODE_ENV: chặn');
  ok(!isOriginAllowed(lan, { NODE_ENV: 'staging', CLIENT_URL: 'https://app.rao.vn' }), 'staging: chặn');
  ok(isOriginAllowed(lan, { NODE_ENV: 'development' }), 'development: nhận');
  ok(isOriginAllowed('https://app.rao.vn', { CLIENT_URL: 'https://app.rao.vn' }),
    'Origin đã khai vẫn được nhận ở mọi môi trường');
}

process.exit(summary() === 0 ? 0 : 1);
