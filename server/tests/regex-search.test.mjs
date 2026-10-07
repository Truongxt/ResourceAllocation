/**
 * Ô tìm kiếm nhận chuỗi người dùng gõ, không phải biểu thức chính quy.
 *
 * Bảy controller từng dựng `new RegExp(req.query.search, 'i')` thẳng từ chuỗi
 * nhập: gõ `(` là `SyntaxError` → 500, còn một mẫu như `(a+)+$` có thể làm nghẽn
 * cả tiến trình Node (ReDoS). Bộ này gửi đúng những ký tự đó tới từng endpoint.
 */
import { call, ok, section as S, summary } from './helpers.mjs';

const admin = await call('POST', '/auth/login', {
  body: { email: 'admin@rao.com', password: 'password123' },
});
const T = admin.data.token;

const ENDPOINTS = [
  ['/tasks', 'search'],
  ['/projects', 'search'],
  ['/resources', 'search'],
  ['/resources', 'skill'],
  ['/departments', 'search'],
  ['/activity-logs', 'search'],
  ['/auth/users', 'search'],
];

// ══════════════════════════════════════════════
S('Ký tự đặc biệt của regex không làm hỏng tìm kiếm');
for (const [path, param] of ENDPOINTS) {
  for (const raw of ['(', '[', '*', '\\']) {
    const r = await call('GET', `${path}?${param}=${encodeURIComponent(raw)}`, { token: T });
    ok(r.status === 200, `${path}?${param}=${raw} → 200`, `status=${r.status}`);
  }
}

// ══════════════════════════════════════════════
S('Chuỗi được so khớp theo đúng nghĩa đen');
{
  // Dữ liệu mẫu có công việc "Phát triển Giao diện Quản lý Đơn hàng (React)".
  // Trước đây "(React)" bị hiểu là nhóm bắt → khớp cả chữ "React" không ngoặc.
  const literal = await call('GET', `/tasks?search=${encodeURIComponent('(React)')}`, { token: T });
  const titles = (literal.data?.tasks || []).map((t) => t.title);
  ok(titles.length > 0 && titles.every((t) => t.includes('(React)')),
    'Tìm "(React)" chỉ ra công việc có đúng chuỗi đó', titles.join(' | '));

  // Mẫu ReDoS kinh điển: phải trả lời ngay chứ không treo tiến trình
  const started = Date.now();
  const redos = await call('GET', `/tasks?search=${encodeURIComponent('(a+)+$')}`, { token: T });
  ok(redos.status === 200 && Date.now() - started < 2000,
    'Mẫu (a+)+$ được coi là chữ thường, trả lời ngay', `${Date.now() - started}ms`);
}

process.exit(summary() ? 1 : 0);
