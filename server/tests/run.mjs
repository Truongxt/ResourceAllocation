/**
 * Trình chạy kiểm thử end-to-end.
 *
 * Toàn bộ chạy trên một database riêng và một cổng riêng, nên không đụng tới dữ liệu
 * và server đang dùng để phát triển. Mỗi bộ được nạp lại dữ liệu mẫu trước khi chạy,
 * vì các bộ có tạo/xóa bản ghi và không được phép ảnh hưởng lẫn nhau.
 *
 *   npm test              chạy tất cả
 *   npm test api          chỉ chạy các bộ có tên khớp "api"
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');

const PORT = process.env.TEST_PORT || '5099';
const DB = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/resource_allocation_test';

const SUITES = [
  // Bộ đơn vị, không cần server lẫn database — chạy trước để lỗi thuật toán lộ ra sớm.
  { name: 'scoring', file: 'scoring.test.mjs', label: 'Thang điểm dùng chung' },
  { name: 'csp', file: 'csp.test.mjs', label: 'CSP — ràng buộc H3/H4' },
  { name: 'hybrid', file: 'hybrid.test.mjs', label: 'Hybrid — bàn giao CSP → GA' },
  { name: 'security', file: 'security.test.mjs', label: 'Header, CORS, giới hạn tần suất' },
  { name: 'api', file: 'api.test.mjs', label: 'REST API' },
  { name: 'project-detail', file: 'project-detail.test.mjs', label: 'Trang chi tiết dự án' },
  { name: 'socket', file: 'socket.test.mjs', label: 'Socket.IO realtime' },
];

const filter = process.argv[2];
const selected = filter ? SUITES.filter((s) => s.name.includes(filter)) : SUITES;

if (!selected.length) {
  console.error(`Không có bộ nào khớp "${filter}". Có: ${SUITES.map((s) => s.name).join(', ')}`);
  process.exit(1);
}

// Môi trường chung cho server và các bộ test
const env = {
  ...process.env,
  NODE_ENV: 'test',
  PORT,
  TEST_PORT: PORT,
  MONGODB_URI: DB,
  JWT_SECRET: process.env.JWT_SECRET || 'rao_test_secret',
  // Bộ e2e đăng nhập và gọi API liên tục từ cùng một IP; ngưỡng thật sẽ chặn giữa chừng.
  // Bản thân middleware giới hạn tần suất được kiểm riêng trong bộ `security`.
  AUTH_RATE_LIMIT_MAX: '10000',
  API_RATE_LIMIT_MAX: '100000',
};

// Không dùng shell: trên Windows, shell tạo một tiến trình bọc ngoài và child.kill()
// chỉ giết cái vỏ đó, để lại server node chiếm cổng sau khi chạy xong.
const run = (cmd, args, opts = {}) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: SERVER_DIR, env, ...opts });
    let out = '';
    child.stdout?.on('data', (d) => { out += d; if (opts.inherit) process.stdout.write(d); });
    child.stderr?.on('data', (d) => { out += d; if (opts.inherit) process.stderr.write(d); });
    child.on('close', (code) => resolve({ code, out }));
  });

const seed = () => run('node', ['src/utils/seeder.js']);

const waitForServer = async (timeoutMs = 20000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${PORT}/api/health`);
      if (res.ok) return true;
    } catch {
      /* chưa lên, thử lại */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
};

console.log(`\n\x1b[1mRAO end-to-end tests\x1b[0m`);
console.log(`  database : ${DB}`);
console.log(`  server   : http://localhost:${PORT}`);
console.log(`  suites   : ${selected.map((s) => s.name).join(', ')}`);

const seeded = await seed();
if (seeded.code !== 0) {
  console.error('\n❌ Không seed được database test. MongoDB đã chạy chưa?');
  console.error(seeded.out.trim().split('\n').slice(-3).join('\n'));
  process.exit(1);
}

const server = spawn('node', ['server.js'], { cwd: SERVER_DIR, env });
let serverLog = '';
server.stdout.on('data', (d) => { serverLog += d; });
server.stderr.on('data', (d) => { serverLog += d; });

const shutdown = () => { if (!server.killed) server.kill(); };
process.on('exit', shutdown);
process.on('SIGINT', () => { shutdown(); process.exit(130); });

if (!(await waitForServer())) {
  console.error('\n❌ Server không khởi động được:');
  console.error(serverLog.trim().split('\n').slice(-8).join('\n'));
  shutdown();
  process.exit(1);
}

let failed = 0;
for (const suite of selected) {
  // Nạp lại dữ liệu mẫu để mỗi bộ bắt đầu từ cùng một trạng thái
  await seed();
  const result = await run('node', [path.join('tests', suite.file)], { inherit: true });
  if (result.code !== 0) {
    failed++;
    console.log(`\x1b[31m  → bộ "${suite.name}" thất bại\x1b[0m`);
  }
}

shutdown();

console.log(`\n${'━'.repeat(52)}`);
if (failed) {
  console.log(`\x1b[31m  ${failed}/${selected.length} bộ thất bại\x1b[0m`);
} else {
  console.log(`\x1b[32m  Tất cả ${selected.length} bộ đều đạt\x1b[0m`);
}
console.log('━'.repeat(52) + '\n');

process.exit(failed ? 1 : 0);
