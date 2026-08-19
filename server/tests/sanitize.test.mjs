/**
 * Kiểm thử đơn vị cho `src/middleware/sanitize.js`.
 *
 * Không cần server hay database. Trọng tâm: middleware phải cắt đúng khóa nguy
 * hiểm và **không được đụng vào dữ liệu hợp lệ** — cắt nhầm còn tệ hơn không cắt,
 * vì nó làm hỏng thao tác bình thường theo cách rất khó lần ra.
 */

import { createRequire } from 'module';
import { ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { sanitizeInPlace, isDangerousKey } = require('../src/middleware/sanitize');

// ══════════════════════════════════════════════
S('Nhận diện khóa nguy hiểm');
{
  ok(isDangerousKey('$gt') === true, 'Toán tử $gt');
  ok(isDangerousKey('$where') === true, 'Toán tử $where');
  ok(isDangerousKey('user.role') === true, 'Khóa chứa dấu chấm — đường đi vòng vào field lồng nhau');
  ok(isDangerousKey('__proto__') === true, 'Khóa gây ô nhiễm prototype');
  ok(isDangerousKey('constructor') === true, 'constructor');

  ok(isDangerousKey('email') === false, 'Khóa thường không bị đụng');
  ok(isDangerousKey('estimatedHours') === false, 'camelCase bình thường');
  ok(isDangerousKey('giá$') === false, 'Dấu $ ở giữa/cuối tên không phải toán tử');
}

// ══════════════════════════════════════════════
S('Cắt toán tử khỏi payload');
{
  const login = { email: { $gt: '' }, password: '123456' };
  sanitizeInPlace(login);
  ok(Object.keys(login.email).length === 0,
    'Kinh điển: {"email": {"$gt": ""}} bị rút ruột, không còn khớp mọi bản ghi');
  ok(login.password === '123456', 'Trường hợp lệ bên cạnh vẫn nguyên vẹn');

  const nested = { filter: { project: { $ne: null }, status: 'todo' } };
  sanitizeInPlace(nested);
  ok(nested.filter.$ne === undefined && nested.filter.project.$ne === undefined,
    'Cắt được cả toán tử nằm sâu bên trong');
  ok(nested.filter.status === 'todo', 'Field cùng cấp không bị vạ lây');

  const inArray = { skills: [{ name: 'React', $where: 'sleep(5000)' }, { name: 'Node' }] };
  sanitizeInPlace(inArray);
  ok(inArray.skills[0].$where === undefined, 'Cắt được toán tử nằm trong phần tử mảng');
  ok(inArray.skills[0].name === 'React' && inArray.skills[1].name === 'Node',
    'Mảng giữ nguyên thứ tự và nội dung hợp lệ');
}

// ══════════════════════════════════════════════
S('Không đụng dữ liệu hợp lệ');
{
  const real = {
    title: 'Thiết kế màn hình đăng nhập',
    estimatedHours: 8,
    progress: 0,
    requiredSkills: [{ name: 'Figma', level: 3, weight: 1 }],
    dependencies: ['507f1f77bcf86cd799439011'],
    startDate: '2026-03-02',
    description: 'Giá $100, dùng ký tự $ trong nội dung',
  };
  const before = JSON.stringify(real);
  sanitizeInPlace(real);
  ok(JSON.stringify(real) === before,
    'Payload tạo task thật đi qua nguyên vẹn, kể cả nội dung có ký tự $');

  const nulls = { a: null, b: undefined, c: 0, d: '', e: false };
  sanitizeInPlace(nulls);
  ok(nulls.c === 0 && nulls.d === '' && nulls.e === false,
    'Giá trị falsy hợp lệ không bị nhầm là rỗng rồi xóa mất');
}

// ══════════════════════════════════════════════
S('Giới hạn độ sâu');
{
  // Payload lồng sâu là một cách làm nghẽn CPU. Đệ quy phải dừng, không được tràn stack.
  let deep = { value: 'đáy' };
  for (let i = 0; i < 500; i++) deep = { nested: deep };

  let threw = false;
  try {
    sanitizeInPlace(deep);
  } catch {
    threw = true;
  }
  ok(threw === false, 'Payload lồng 500 tầng không làm tràn stack');

  const removed = sanitizeInPlace({ $bad: 1, ok: 2 });
  ok(removed.length === 1 && removed[0] === '$bad',
    'Trả về danh sách khóa đã cắt để còn ghi log');
}

summary();
