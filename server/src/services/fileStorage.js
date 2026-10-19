const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Nơi lưu nội dung tệp đính kèm. Mọi đọc/ghi tệp đều đi qua đây, để đổi sang S3 chỉ cần
 * thay module này: ngoài nó không ai biết tệp nằm trên đĩa.
 *
 * Khóa lưu (`key`) do chính module này sinh — chuỗi ngẫu nhiên, không lấy gì từ request —
 * nên tên tệp người dùng gửi lên không bao giờ thành đường dẫn trên đĩa.
 */

const rootDir = () => path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));

const KEY_PATTERN = /^[a-f0-9]{32}$/;

const pathOf = (key) => {
  // Khóa luôn do `save` sinh ra; chặn ở đây phòng khi dữ liệu trong DB bị sửa tay.
  if (!KEY_PATTERN.test(String(key))) throw new Error('Khóa lưu tệp không hợp lệ');
  return path.join(rootDir(), key);
};

/** Ghi nội dung, trả về khóa để lưu vào DB. */
async function save(buffer) {
  await fs.promises.mkdir(rootDir(), { recursive: true });
  const key = crypto.randomBytes(16).toString('hex');
  await fs.promises.writeFile(pathOf(key), buffer, { flag: 'wx' });
  return key;
}

/** Luồng đọc nội dung; null nếu tệp không còn trên đĩa. */
function stream(key) {
  const file = pathOf(key);
  return fs.existsSync(file) ? fs.createReadStream(file) : null;
}

/** Xóa nội dung. Tệp đã mất từ trước thì bỏ qua — mục tiêu là "không còn", không phải "vừa xóa". */
async function remove(key) {
  await fs.promises.rm(pathOf(key), { force: true });
}

module.exports = { save, stream, remove };
