/**
 * Loại toán tử MongoDB ra khỏi dữ liệu người dùng gửi lên.
 *
 * Vì sao cần: body của request được `express.json()` parse thành object rồi đi
 * thẳng vào truy vấn Mongoose. Gửi `{"email": {"$gt": ""}}` là biến điều kiện
 * "email bằng X" thành "email lớn hơn chuỗi rỗng" — tức khớp mọi bản ghi.
 * Từng route có `express-validator` chặn được phần lớn, nhưng đó là phòng thủ
 * theo từng chỗ: quên một route là hở một route. Đây là lớp chặn chung.
 *
 * Quy tắc: xóa mọi khóa bắt đầu bằng `$` (toán tử) hoặc chứa `.` (đường dẫn
 * lồng nhau, dùng để đi vòng), cộng ba khóa gây ô nhiễm prototype.
 *
 * Cố ý **xóa** chứ không từ chối cả request: một khóa lạ lọt vào từ thư viện
 * bên thứ ba không nên làm hỏng thao tác hợp lệ của người dùng.
 */

/** Khóa gây ô nhiễm prototype — rẻ tiền để loại, đắt tiền nếu bỏ qua. */
const POLLUTING_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Độ sâu tối đa. Payload lồng sâu vô hạn là một cách làm nghẽn CPU. */
const MAX_DEPTH = 12;

function isDangerousKey(key) {
  return key.startsWith('$') || key.includes('.') || POLLUTING_KEYS.has(key);
}

/**
 * Xóa khóa nguy hiểm ngay trên object được truyền vào.
 *
 * Sửa tại chỗ chứ không tạo object mới, vì `req.query` trong Express 4 là getter
 * có nhớ đệm — gán đè lên nó không ăn.
 *
 * @returns {string[]} danh sách khóa đã xóa, để ghi log
 */
function sanitizeInPlace(value, depth = 0, removed = []) {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') return removed;

  if (Array.isArray(value)) {
    for (const item of value) sanitizeInPlace(item, depth + 1, removed);
    return removed;
  }

  for (const key of Object.keys(value)) {
    if (isDangerousKey(key)) {
      delete value[key];
      removed.push(key);
      continue;
    }
    sanitizeInPlace(value[key], depth + 1, removed);
  }

  return removed;
}

/** Middleware Express: dọn body, query và params trước khi vào controller. */
function sanitizeRequest(req, res, next) {
  const removed = [
    ...sanitizeInPlace(req.body),
    ...sanitizeInPlace(req.query),
    ...sanitizeInPlace(req.params),
  ];

  if (removed.length > 0) {
    // Ghi lại: dữ liệu bình thường không chứa khóa như vậy, nên mỗi dòng ở đây
    // đáng để nhìn. In cả đường dẫn để còn lần ra nguồn.
    console.warn(`Đã loại khóa nguy hiểm khỏi ${req.method} ${req.originalUrl}: ${removed.join(', ')}`);
  }

  next();
}

module.exports = { sanitizeRequest, sanitizeInPlace, isDangerousKey };
