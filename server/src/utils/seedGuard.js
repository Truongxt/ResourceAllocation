/**
 * Chốt chặn cho `npm run seed`.
 *
 * Seeder xóa sạch mọi collection rồi tạo lại dữ liệu mẫu, trên bất cứ database nào
 * `MONGODB_URI` đang trỏ tới. Gõ nhầm lệnh trong một shell đang mang biến môi trường
 * của máy chủ thật là mất toàn bộ dữ liệu khách hàng, không có bước hỏi lại.
 *
 * Quy tắc: chỉ tự chạy khi database nằm trên chính máy này VÀ không phải production.
 * Mọi trường hợp khác phải thêm `--force`. Dev, `server/tests` và e2e đều dùng Mongo
 * local nên không bị ảnh hưởng.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/** Danh sách host trong chuỗi kết nối; `null` nếu không đọc được. */
const hostsOf = (uri) => {
  const match = /^mongodb(\+srv)?:\/\/([^/?]+)/i.exec(String(uri || '').trim());
  if (!match) return null;
  // `mongodb+srv` phân giải qua DNS ra một cụm máy chủ — không bao giờ là máy này.
  if (match[1]) return [match[2]];
  return match[2]
    .slice(match[2].lastIndexOf('@') + 1) // bỏ user:password@
    .split(',')
    .map((host) => host.trim().replace(/:\d+$/, '').replace(/^\[|\]$/g, '').toLowerCase())
    .filter(Boolean);
};

/**
 * @returns {string|null} Lý do từ chối, hoặc `null` nếu được phép chạy.
 */
const seedRefusal = ({ uri, nodeEnv, force }) => {
  if (force) return null;
  if (nodeEnv === 'production') return 'NODE_ENV=production';

  const hosts = hostsOf(uri);
  if (!hosts || !hosts.length) return `không đọc được host trong MONGODB_URI`;
  const remote = hosts.find((host) => !LOCAL_HOSTS.has(host));
  return remote ? `database không nằm trên máy này (${remote})` : null;
};

module.exports = { seedRefusal, hostsOf };
