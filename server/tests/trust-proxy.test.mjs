/**
 * Kiểm thử cho `TRUST_PROXY` (`src/config/proxy.js` và chỗ `app.js` áp dụng nó).
 * Không cần database.
 *
 * Lỗi mà bộ này canh: server chạy sau reverse proxy mà không khai thì mọi khách
 * hàng chung một IP, và giới hạn tần suất của một người khóa tất cả. Chiều ngược
 * lại cũng phải chặn: tin proxy bừa thì ai cũng tự đặt được IP cho mình.
 */

import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { parseTrustProxy } = require('../src/config/proxy');

const throws = (fn) => { try { fn(); return false; } catch { return true; } };

// ══════════════════════════════════════════════
S('Đọc giá trị');
{
  ok(parseTrustProxy('') === undefined, 'Bỏ trống → không đặt gì');
  ok(parseTrustProxy('false') === undefined, 'false → không đặt gì');
  ok(parseTrustProxy('0') === undefined, '0 lớp proxy → không đặt gì');
  ok(parseTrustProxy(' 1 ') === 1, 'Số lớp proxy thành số, bỏ khoảng trắng', String(parseTrustProxy(' 1 ')));
  ok(parseTrustProxy('2') === 2, 'Hai lớp proxy');
  ok(parseTrustProxy('loopback, 10.0.0.0/8') === 'loopback, 10.0.0.0/8', 'Dải IP giữ nguyên dạng chuỗi');
  ok(throws(() => parseTrustProxy('true')), 'true bị từ chối — cho phép giả mạo IP');
  ok(throws(() => parseTrustProxy('TRUE')), 'TRUE cũng bị từ chối');
}

// ══════════════════════════════════════════════
S('app.js áp dụng đúng');
{
  const serverDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  // Mỗi giá trị một tiến trình riêng: app.js đọc biến môi trường lúc được nạp.
  // In ra IP mà Express suy ra cho một request đi qua đúng một proxy ở 127.0.0.1.
  const script = `
    const app = require('./app');
    const req = Object.create(app.request);
    req.app = app;
    req.socket = { remoteAddress: '127.0.0.1' };
    req.headers = { 'x-forwarded-for': '203.0.113.7' };
    console.log(req.ip);
  `;
  const ipWith = (value) => {
    const env = { ...process.env };
    delete env.TRUST_PROXY;
    if (value !== undefined) env.TRUST_PROXY = value;
    const run = spawnSync('node', ['-e', script], { cwd: serverDir, env, encoding: 'utf8', timeout: 30000 });
    return { ip: run.stdout.trim(), status: run.status, err: run.stderr };
  };

  const none = ipWith(undefined);
  ok(none.ip === '127.0.0.1', 'Không khai: bỏ qua X-Forwarded-For (hành vi cũ)', none.ip || none.err.slice(0, 200));

  const one = ipWith('1');
  ok(one.ip === '203.0.113.7', 'TRUST_PROXY=1: lấy IP thật của khách', one.ip || one.err.slice(0, 200));

  const bad = ipWith('true');
  ok(bad.status !== 0 && /TRUST_PROXY=true/.test(bad.err), 'TRUST_PROXY=true: server không khởi động', `status=${bad.status}`);
}

process.exit(summary() === 0 ? 0 : 1);
