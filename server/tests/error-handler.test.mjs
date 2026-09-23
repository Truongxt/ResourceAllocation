/**
 * Bộ bắt lỗi toàn cục.
 *
 * Kiểm đơn vị, không cần database: dựng `err` giả rồi xem nó trả ra gì.
 *
 * Lý do bộ này tồn tại: bản thân bộ bắt lỗi từng **ném lỗi**. Nhánh trùng khóa
 * đọc `err.keyValue`, nhưng lỗi ghi hàng loạt (`insertMany`) cũng mang
 * `code: 11000` mà không có `keyValue` — `Object.keys(undefined)` ném ngay tại
 * chỗ, Express rơi về handler mặc định, client nhận **500 rỗng**: không
 * `success`, không `message`, không gì cả.
 *
 * Kiểu hỏng này đắt hơn nó trông: nó không chỉ làm hỏng một endpoint mà còn
 * **xóa mất manh mối** của mọi lỗi đi qua nhánh đó. Một lỗi chỉ mục ở collection
 * departments đã biến thành "500 không rõ nguyên nhân" trên cả web lẫn mobile.
 *
 * Nguyên tắc bộ này khóa: bộ bắt lỗi phải luôn trả JSON có `success` và
 * `message`, với **mọi** hình dạng lỗi — kể cả hình dạng nó chưa từng thấy.
 */

import { createRequire } from 'module';
import { ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { errorHandler } = require('../src/middleware/error');

/** Dựng `res` giả đủ dùng cho handler. */
const fakeRes = (initialStatus = 200) => {
  const res = {
    statusCode: initialStatus,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

const run = (err) => {
  const res = fakeRes();
  errorHandler(err, {}, res, () => {});
  return res;
};

// ══════════════════════════════════════════════
S('Luôn trả JSON dùng được');
{
  const shapes = [
    ['Error thường', new Error('Hỏng gì đó')],
    ['ObjectId sai', Object.assign(new Error('x'), { name: 'CastError', kind: 'ObjectId' })],
    ['Trùng khóa một bản ghi', Object.assign(new Error('x'), { code: 11000, keyValue: { email: 'a@b.c' } })],
    // Đây là hình dạng đã làm handler ném lỗi.
    ['Trùng khóa GHI HÀNG LOẠT (không có keyValue)', Object.assign(new Error('x'), { code: 11000 })],
    // Không phải chỗ nào cũng ném `Error` chuẩn.
    ['Object rỗng', {}],
    ['Chuỗi bị ném thẳng', 'hỏng rồi'],
  ];
  // Không kiểm `null`: Express coi giá trị falsy là "không có lỗi" nên không bao
  // giờ gọi handler với nó. Viết code phòng thủ cho ca không tồn tại chỉ làm
  // nhiễu chỗ thật sự cần đọc.

  for (const [label, err] of shapes) {
    let res;
    let threw = null;
    try {
      res = run(err);
    } catch (e) {
      threw = e;
    }

    ok(!threw, `${label} — handler KHÔNG tự ném lỗi`, threw ? String(threw.message) : '');
    if (threw) continue;

    ok(res.body?.success === false, `${label} — có success=false`);
    ok(
      typeof res.body?.message === 'string' && res.body.message.length > 0,
      `${label} — có message không rỗng`,
      `message=${res.body?.message}`
    );
  }
}

// ══════════════════════════════════════════════
S('Phân loại đúng mã trạng thái');
{
  const cast = run(Object.assign(new Error('x'), { name: 'CastError', kind: 'ObjectId' }));
  ok(cast.statusCode === 400, 'ObjectId sai → 400', `status=${cast.statusCode}`);
  ok(cast.body.message === 'ID không hợp lệ', 'Kèm thông điệp dễ hiểu');

  const dup = run(Object.assign(new Error('x'), { code: 11000, keyValue: { email: 'a@b.c' } }));
  ok(dup.statusCode === 400, 'Trùng khóa → 400', `status=${dup.statusCode}`);
  ok(dup.body.message.includes('email'), 'Nói rõ trường nào trùng', dup.body.message);

  // Không biết trường nào thì vẫn phải nói được điều gì đó có nghĩa, thay vì im lặng.
  const bulk = run(Object.assign(new Error('x'), { code: 11000 }));
  ok(bulk.statusCode === 400, 'Trùng khóa hàng loạt → 400', `status=${bulk.statusCode}`);
  ok(
    !bulk.body.message.includes('undefined') && !bulk.body.message.includes('null'),
    'Thông điệp không lòi ra undefined/null',
    bulk.body.message
  );

  // Dạng lồng của MongoBulkWriteError: vẫn moi ra được tên trường.
  const bulkNested = run(
    Object.assign(new Error('x'), {
      code: 11000,
      writeErrors: [{ err: { keyValue: { name: 'Engineering' } } }],
    })
  );
  ok(bulkNested.body.message.includes('name'), 'Dạng lồng vẫn nói được tên trường', bulkNested.body.message);

  const validation = run(
    Object.assign(new Error('x'), {
      name: 'ValidationError',
      errors: { title: { message: 'Tiêu đề là bắt buộc' } },
    })
  );
  ok(validation.statusCode === 400, 'Lỗi validate → 400', `status=${validation.statusCode}`);
  ok(validation.body.message === 'Tiêu đề là bắt buộc', 'Giữ nguyên lời của schema');

  const plain = run(new Error('Hỏng'));
  ok(plain.statusCode === 500, 'Lỗi không phân loại được → 500', `status=${plain.statusCode}`);
}

process.exit(summary() ? 1 : 0);
