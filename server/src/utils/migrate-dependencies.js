/**
 * Chuyển `Task.dependencies` từ mảng ObjectId phẳng sang mảng `{ task, type }`.
 *
 *   node src/utils/migrate-dependencies.js            # chạy khô, chỉ liệt kê
 *   node src/utils/migrate-dependencies.js -- --apply # sửa thật
 *
 * Mọi quan hệ cũ đều là finish-to-start: đó là ngữ nghĩa duy nhất mà hệ thống từng
 * cài, nên gán loại đó không phải là suy đoán mà là ghi lại đúng thứ vẫn đang chạy.
 *
 * Script làm việc trực tiếp trên collection, không qua Mongoose model: model mới chỉ
 * hiểu dạng mới, nên đọc bản ghi cũ qua nó sẽ bị cast rỗng và migration tự xóa mất
 * đúng thứ nó cần sửa.
 *
 * Chạy lại nhiều lần vô hại — bản ghi đã ở dạng mới bị bỏ qua.
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const { DEFAULT_DEPENDENCY_TYPE } = require('../services/taskDependency.service');

const APPLY = process.argv.includes('--apply');

/** Phần tử đã ở dạng mới chưa. */
const isNewShape = (dep) => dep && typeof dep === 'object' && !(dep instanceof mongoose.Types.ObjectId) && 'task' in dep;

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/resource_allocation';
  await mongoose.connect(uri);
  console.log(`\nDatabase : ${uri}`);
  console.log(`Chế độ   : ${APPLY ? 'SỬA THẬT (--apply)' : 'chạy khô (thêm -- --apply để sửa thật)'}\n`);

  const tasks = mongoose.connection.db.collection('tasks');
  const cursor = tasks.find({ dependencies: { $exists: true, $ne: [] } });

  let scanned = 0;
  let needMigration = 0;
  let migrated = 0;
  let edges = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    scanned++;

    const deps = doc.dependencies || [];
    if (deps.every(isNewShape)) continue;

    needMigration++;
    const converted = deps.map((dep) =>
      isNewShape(dep) ? dep : { task: dep, type: DEFAULT_DEPENDENCY_TYPE }
    );
    edges += converted.length;

    console.log(
      `  ${doc.title || doc._id}  —  ${deps.length} phụ thuộc → ${DEFAULT_DEPENDENCY_TYPE}`
    );

    if (APPLY) {
      await tasks.updateOne({ _id: doc._id }, { $set: { dependencies: converted } });
      migrated++;
    }
  }

  console.log('\n' + '─'.repeat(52));
  console.log(`  Công việc có phụ thuộc : ${scanned}`);
  console.log(`  Cần chuyển đổi         : ${needMigration}`);
  console.log(`  Tổng số quan hệ        : ${edges}`);
  if (APPLY) {
    console.log(`  Đã chuyển đổi          : ${migrated}`);
  } else if (needMigration) {
    console.log('\n  Chưa sửa gì. Chạy lại với  -- --apply  để áp dụng.');
  }
  console.log('─'.repeat(52) + '\n');

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('❌ Migration thất bại:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
