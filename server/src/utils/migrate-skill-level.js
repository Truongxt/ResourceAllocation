/**
 * Đưa `Task.requiredSkills[].level` về thang 1-4.
 *
 *   npm run migrate:skill-level             chỉ liệt kê, KHÔNG sửa gì
 *   npm run migrate:skill-level -- --apply  thực sự sửa
 *
 * Vì sao cần: `Resource.skills[].level` là enum 1-4, còn `Task.requiredSkills[].level`
 * trước đây nhận tới 5. Điểm khớp kỹ năng là
 * `min(level_nhân_sự, level_yêu_cầu) / level_yêu_cầu`, nên một yêu cầu mức 5 thì nhân sự
 * giỏi nhất cũng chỉ đạt 4/5 = 0.8 — không bao giờ khớp tuyệt đối. Schema nay chốt max 4,
 * nhưng bản ghi tạo trước thay đổi đó vẫn còn 5 trong DB và sẽ **không lưu lại được**
 * (validator chặn) cho tới khi chạy script này.
 *
 * Hạ 5 xuống 4 chứ không xóa yêu cầu: mức 5 xưa nay vẫn có nghĩa "cao nhất có thể",
 * và 4 chính là cao nhất trên thang của nhân sự. Điểm khớp của các phương án cũ vì thế
 * tăng lên chứ không mất đi yêu cầu nào.
 *
 * Đây là script một lần. Sau khi mọi môi trường đã chạy xong thì xóa được.
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Task = require('../models/Task');

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/resource_allocation';
const APPLY = process.argv.includes('--apply');
const MAX_LEVEL = 4;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log(`Đã kết nối ${MONGO_URI}\n`);

  const affected = await Task.find({ 'requiredSkills.level': { $gt: MAX_LEVEL } })
    .select('title requiredSkills')
    .lean();

  if (!affected.length) {
    console.log('Không có công việc nào yêu cầu kỹ năng vượt thang. Không cần làm gì.');
    return;
  }

  console.log(`${affected.length} công việc có yêu cầu kỹ năng vượt thang:\n`);
  for (const task of affected) {
    const over = task.requiredSkills
      .filter((s) => s.level > MAX_LEVEL)
      .map((s) => `${s.name} Lv.${s.level} → Lv.${MAX_LEVEL}`)
      .join(', ');
    console.log(`  - ${task.title}: ${over}`);
  }

  if (!APPLY) {
    console.log('\nĐây là chạy khô. Thêm `-- --apply` để sửa thật.');
    return;
  }

  // updateMany với positional filter: chỉ chạm đúng phần tử vượt thang, giữ nguyên
  // name/weight và các kỹ năng khác trong cùng mảng.
  const result = await Task.updateMany(
    { 'requiredSkills.level': { $gt: MAX_LEVEL } },
    { $set: { 'requiredSkills.$[skill].level': MAX_LEVEL } },
    { arrayFilters: [{ 'skill.level': { $gt: MAX_LEVEL } }] }
  );

  console.log(`\nĐã sửa ${result.modifiedCount} công việc.`);

  const left = await Task.countDocuments({ 'requiredSkills.level': { $gt: MAX_LEVEL } });
  console.log(left === 0 ? 'Kiểm tra lại: không còn bản ghi nào vượt thang.' : `CÒN SÓT ${left} bản ghi!`);
}

run()
  .catch((err) => {
    console.error('Lỗi:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
