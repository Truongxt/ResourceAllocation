/**
 * Đặt lại mật khẩu cho tài khoản dev/test.
 *
 *   node src/utils/set-test-pw.js <mật-khẩu> <email> [email...]
 *
 * Email và mật khẩu nhận qua tham số thay vì viết cứng trong file, để mã nguồn
 * không mang theo tài khoản thật của ai.
 */
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Nạp .env gốc theo đường dẫn tuyệt đối — cùng cách với seeder, không phụ thuộc cwd
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function setPw() {
  const [password, ...emails] = process.argv.slice(2);
  if (!password || !emails.length) {
    console.error('Cách dùng: node src/utils/set-test-pw.js <mật-khẩu> <email> [email...]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/resource_allocation');
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const hashed = await bcrypt.hash(password, 12);

  for (const email of emails) {
    const { matchedCount } = await User.updateOne(
      { email: email.toLowerCase() },
      { $set: { password: hashed } }
    );
    console.log(matchedCount ? `✓ Đã đặt lại mật khẩu: ${email}` : `✗ Không tìm thấy: ${email}`);
  }

  await mongoose.disconnect();
}

setPw();
