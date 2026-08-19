/**
 * Kiểm thử lớp bảo vệ ở tầng HTTP: security header, CORS, và giới hạn tần suất.
 *
 * Giới hạn tần suất là trạng thái toàn cục theo IP, nên không kiểm được trên server
 * dùng chung với các bộ khác (chạm ngưỡng là những bộ sau đăng nhập không nổi).
 * Vì vậy phần đó dựng một app express riêng trên cổng tạm, gắn đúng middleware thật.
 */

import { createRequire } from 'module';
import { API, call, ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const express = require('express');
const rateLimitModule = require('../src/middleware/rateLimit');

// ══════════════════════════════════════════════
S('Security headers (helmet)');
{
  const res = await fetch(`${API}/health`);
  const headers = res.headers;

  ok(headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff');
  ok(!!headers.get('x-frame-options') || !!headers.get('content-security-policy'),
    'Có chống nhúng iframe (X-Frame-Options)', headers.get('x-frame-options') || '');
  ok(headers.get('x-powered-by') === null, 'Không lộ X-Powered-By: Express');
  ok(!!headers.get('strict-transport-security'), 'Có Strict-Transport-Security');
}

// ══════════════════════════════════════════════
S('CORS chỉ nhận origin của client');
{
  const allowed = process.env.CLIENT_URL || 'http://localhost:5173';

  const good = await fetch(`${API}/health`, { headers: { Origin: allowed } });
  ok(good.headers.get('access-control-allow-origin') === allowed,
    'Origin hợp lệ được chấp nhận', good.headers.get('access-control-allow-origin') || '');

  const bad = await fetch(`${API}/health`, { headers: { Origin: 'http://ke-tan-cong.example' } });
  ok(bad.headers.get('access-control-allow-origin') === null,
    'Origin lạ KHÔNG được cấp header cho phép',
    bad.headers.get('access-control-allow-origin') || '(không có)');

  // Request không kèm Origin (curl, health check hạ tầng) vẫn phải đi được
  const noOrigin = await call('GET', '/health', { raw: true });
  ok(noOrigin.status === 200, 'Request không kèm Origin vẫn được phục vụ');
}

// ══════════════════════════════════════════════
S('Giới hạn tần suất đăng nhập');
{
  // App riêng, ngưỡng nhỏ, dùng đúng middleware của ứng dụng.
  process.env.AUTH_RATE_LIMIT_MAX = '3';
  process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';
  delete require.cache[require.resolve('../src/middleware/rateLimit')];
  const { authLimiter } = require('../src/middleware/rateLimit');

  const app = express();
  app.use(express.json());
  app.post('/login', authLimiter, (req, res) => {
    if (req.body?.password === 'dung') return res.json({ success: true });
    res.status(401).json({ success: false });
  });

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://localhost:${server.address().port}/login`;

  const attempt = (password) =>
    fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

  const codes = [];
  for (let i = 0; i < 5; i++) codes.push((await attempt('sai')).status);

  ok(codes.slice(0, 3).every((c) => c === 401), '3 lần thử đầu vẫn được trả lời bình thường',
    codes.join(', '));
  ok(codes[3] === 429 && codes[4] === 429, 'Vượt ngưỡng thì bị chặn với 429', codes.join(', '));

  const blocked = await attempt('dung');
  ok(blocked.status === 429, 'Đang bị khoá thì mật khẩu đúng cũng không qua');

  const body = await blocked.json();
  ok(/quá nhiều/i.test(body.message || ''), 'Thông báo bằng tiếng Việt, nói rõ lý do', body.message);

  server.close();

  // Trả lại cấu hình để không ảnh hưởng lần require sau
  delete process.env.AUTH_RATE_LIMIT_MAX;
  delete process.env.AUTH_RATE_LIMIT_WINDOW_MS;
  delete require.cache[require.resolve('../src/middleware/rateLimit')];
}

// ══════════════════════════════════════════════
S('Đăng nhập đúng không bị tính vào ngưỡng');
{
  ok(rateLimitModule.authLimiter !== undefined, 'authLimiter được export');
  ok(rateLimitModule.apiLimiter !== undefined, 'apiLimiter được export');

  // skipSuccessfulRequests = true nên đăng nhập đúng liên tiếp không bao giờ bị khoá
  const results = [];
  for (let i = 0; i < 4; i++) {
    results.push((await call('POST', '/auth/login', {
      body: { email: 'admin@rao.com', password: 'password123' },
    })).status);
  }
  ok(results.every((s) => s === 200), 'Đăng nhập đúng nhiều lần liên tiếp vẫn qua', results.join(', '));
}

process.exit(summary() === 0 ? 0 : 1);
