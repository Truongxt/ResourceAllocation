/**
 * Kiểm thử đơn vị cho `src/utils/seedGuard.js` — chốt chặn của `npm run seed`.
 * Không cần server hay database.
 *
 * Lỗi mà bộ này canh: seeder xóa sạch mọi collection trên bất cứ database nào
 * `MONGODB_URI` trỏ tới. Chỉ database trên chính máy này mới được seed không hỏi.
 */

import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { seedRefusal } = require('../src/utils/seedGuard');

const local = 'mongodb://localhost:27017/resource_allocation';

// ══════════════════════════════════════════════
S('Database trên máy này: chạy thẳng');
{
  ok(seedRefusal({ uri: local, nodeEnv: 'development' }) === null, 'localhost');
  ok(seedRefusal({ uri: 'mongodb://127.0.0.1:27017/rao_test', nodeEnv: 'test' }) === null, '127.0.0.1');
  ok(seedRefusal({ uri: 'mongodb://[::1]:27017/rao' }) === null, 'IPv6 loopback, không khai NODE_ENV');
  ok(seedRefusal({ uri: 'mongodb://u:p%40ss@localhost/rao' }) === null, 'Có user:password, không có cổng');
}

// ══════════════════════════════════════════════
S('Database ở xa hoặc production: từ chối');
{
  ok(seedRefusal({ uri: 'mongodb://db.rao.vn:27017/rao', nodeEnv: 'development' }),
    'Host ở xa', seedRefusal({ uri: 'mongodb://db.rao.vn:27017/rao' }));
  ok(seedRefusal({ uri: 'mongodb+srv://u:p@cluster0.abcde.mongodb.net/rao' }), 'Atlas (mongodb+srv)');
  ok(seedRefusal({ uri: 'mongodb://localhost:27017,db2.rao.vn:27017/rao' }),
    'Replica set có một máy ở xa');
  ok(seedRefusal({ uri: 'mongodb://localhost@db.rao.vn/rao' }),
    'User tên "localhost" không đánh lừa được');
  ok(seedRefusal({ uri: 'mongodb://localhost.evil.example/rao' }), 'Tên miền bắt đầu bằng "localhost"');
  ok(seedRefusal({ uri: local, nodeEnv: 'production' }) === 'NODE_ENV=production',
    'Production thì từ chối cả database local');
  ok(seedRefusal({ uri: 'khong-phai-uri' }), 'Chuỗi không đọc được thì từ chối, không đoán');
}

// ══════════════════════════════════════════════
S('--force: người chạy đã chủ động xác nhận');
{
  ok(seedRefusal({ uri: 'mongodb://db.rao.vn/rao', nodeEnv: 'production', force: true }) === null,
    'Có --force thì cho chạy');
}

// ══════════════════════════════════════════════
S('Seeder thật: thoát trước khi kết nối database');
{
  const serverDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  // Host không tồn tại: nếu chốt chặn hỏng thì lệnh treo ở bước kết nối chứ không thoát ngay.
  const run = spawnSync('node', ['src/utils/seeder.js'], {
    cwd: serverDir,
    env: { ...process.env, NODE_ENV: 'development', MONGODB_URI: 'mongodb://db.invalid:27017/rao' },
    encoding: 'utf8',
    timeout: 20000,
  });
  ok(run.status === 1, 'Thoát với mã 1', `status=${run.status}`);
  ok(/Từ chối seed/.test(run.stderr), 'Nói rõ lý do và cách ép chạy', run.stderr.trim().split('\n')[0]);
}

process.exit(summary() === 0 ? 0 : 1);
