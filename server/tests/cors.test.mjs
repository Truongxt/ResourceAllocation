/**
 * Kiểm thử đơn vị cho `src/config/cors.js` — quy tắc origin dùng chung cho REST
 * và Socket.IO. Không cần server hay database.
 *
 * Bộ `security` đã kiểm CORS qua HTTP thật, nhưng chỉ với một origin. Lỗi mà bộ
 * này canh là khai báo NHIỀU origin: REST tách theo dấu phẩy còn Socket.IO từng
 * nhận nguyên chuỗi, nên realtime âm thầm không kết nối.
 */

import { createRequire } from 'module';
import { ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { parseAllowedOrigins, isOriginAllowed } = require('../src/config/cors');

const multi = 'https://app.rao.vn, https://admin.rao.vn';

// ══════════════════════════════════════════════
S('Danh sách origin');
{
  const list = parseAllowedOrigins(multi);
  ok(list.length === 2 && list[1] === 'https://admin.rao.vn',
    'Tách theo dấu phẩy và bỏ khoảng trắng', JSON.stringify(list));
  ok(parseAllowedOrigins('').join() === 'http://localhost:5173',
    'Bỏ trống thì dùng localhost:5173');
}

// ══════════════════════════════════════════════
S('Production: chỉ nhận origin đã khai báo');
{
  const env = { NODE_ENV: 'production', CLIENT_URL: multi };
  ok(isOriginAllowed('https://app.rao.vn', env), 'Origin thứ nhất được nhận');
  ok(isOriginAllowed('https://admin.rao.vn', env), 'Origin thứ hai được nhận — chỗ Socket.IO từng hỏng');
  ok(!isOriginAllowed('https://evil.example', env), 'Origin lạ bị chặn');
  ok(!isOriginAllowed('http://192.168.1.10:8081', env), 'IP mạng LAN bị chặn ở production');
  ok(isOriginAllowed(undefined, env), 'Request không kèm Origin (curl, health check) đi qua');
}

// ══════════════════════════════════════════════
S('Dev: nhận thêm thiết bị trong mạng LAN');
{
  const env = { NODE_ENV: 'development', CLIENT_URL: 'http://localhost:5173' };
  ok(isOriginAllowed('http://192.168.1.10:8081', env), '192.168.x.x');
  // Regex cũ chỉ khớp ba nhóm số cho dải 172 và 10, nên địa chỉ đủ bốn nhóm bị chặn
  ok(isOriginAllowed('http://172.27.37.181:8081', env), '172.x.x.x đủ bốn nhóm số');
  ok(isOriginAllowed('http://10.0.2.2:8081', env), '10.x.x.x đủ bốn nhóm số');
  ok(!isOriginAllowed('https://evil.example', env), 'Tên miền lạ vẫn bị chặn');
}

process.exit(summary() === 0 ? 0 : 1);
