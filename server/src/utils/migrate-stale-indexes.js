/**
 * Xóa các chỉ mục cũ còn sót lại từ thời schema chưa có `companyName`.
 *
 *   node src/utils/migrate-stale-indexes.js            # chạy khô, chỉ liệt kê
 *   node src/utils/migrate-stale-indexes.js -- --apply # xóa thật
 *
 * Vì sao cần: Mongoose **tạo** chỉ mục mới nhưng không bao giờ **xóa** chỉ mục cũ.
 * Khi `Department` chuyển sang unique theo cặp `{name, companyName}`, chỉ mục
 * `name_1` unique của bản trước vẫn nằm nguyên trong database. Hai chỉ mục cùng
 * tồn tại, và cái cũ thắng: nó cấm hai công ty khác nhau cùng có phòng ban tên
 * "Engineering".
 *
 * Hậu quả đo được: mọi công ty mới đăng ký đều nhận **500** khi mở trang Phòng
 * ban, vì bước nhân bản bộ phòng ban mẫu đụng `E11000 duplicate key ... index:
 * name_1`. Không có thông báo nào nói ra điều đó — endpoint chỉ trả 500 rỗng.
 *
 * Đây là lỗi **dữ liệu**, không phải lỗi mã nguồn: code đã khai đúng chỉ mục từ
 * lâu. Sửa code không giúp được gì; phải dọn database.
 *
 * Chạy lại nhiều lần vô hại — chỉ mục đã xóa thì bỏ qua.
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const APPLY = process.argv.includes('--apply');

/**
 * Chỉ mục cần xóa, theo từng collection.
 *
 * Chỉ liệt kê những chỉ mục mà schema hiện tại **đã có bản thay thế theo công ty**.
 * Không xóa theo kiểu "cái nào không khai trong schema thì xóa": làm vậy sẽ quét
 * nhầm cả chỉ mục do vận hành tạo tay để chữa truy vấn chậm.
 */
const STALE = {
  departments: ['name_1', 'code_1', 'isActive_1_name_1'],
};

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/resource_allocation';
  await mongoose.connect(uri);
  console.log(`\nDatabase : ${uri}`);
  console.log(`Chế độ   : ${APPLY ? 'XÓA THẬT (--apply)' : 'chạy khô (thêm -- --apply để xóa thật)'}\n`);

  let found = 0;
  let dropped = 0;

  for (const [collName, staleNames] of Object.entries(STALE)) {
    const coll = mongoose.connection.db.collection(collName);

    let indexes;
    try {
      indexes = await coll.indexes();
    } catch {
      console.log(`  ${collName}: chưa có collection, bỏ qua`);
      continue;
    }

    const present = indexes.map((i) => i.name);
    console.log(`  ${collName}: ${present.length} chỉ mục`);

    for (const name of staleNames) {
      if (!present.includes(name)) {
        console.log(`    ✓ ${name} — không còn, bỏ qua`);
        continue;
      }

      found++;
      const info = indexes.find((i) => i.name === name);
      console.log(
        `    ✗ ${name} — chỉ mục cũ, key=${JSON.stringify(info.key)}${info.unique ? ' UNIQUE' : ''}`
      );

      if (APPLY) {
        await coll.dropIndex(name);
        dropped++;
        console.log(`      → đã xóa`);
      }
    }
  }

  console.log('\n' + '─'.repeat(52));
  console.log(`  Chỉ mục cũ còn sót : ${found}`);
  if (APPLY) {
    console.log(`  Đã xóa             : ${dropped}`);
    console.log('\n  Mongoose sẽ tự dựng lại chỉ mục đúng ở lần khởi động sau.');
  } else if (found) {
    console.log('\n  Chưa xóa gì. Chạy lại với  -- --apply  để áp dụng.');
  }
  console.log('─'.repeat(52) + '\n');

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('❌ Migration thất bại:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
