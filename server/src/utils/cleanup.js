/**
 * Dọn dữ liệu tồn đọng trong database đang chạy.
 *
 *   npm run cleanup           chỉ liệt kê, KHÔNG xóa gì
 *   npm run cleanup -- --apply  thực sự xóa
 *
 * Mặc định là chạy khô vì đây là thao tác xóa dữ liệu thật: phải nhìn thấy con số
 * trước rồi mới quyết định.
 *
 * Ba nhóm được xử lý:
 *
 *   1. Notification trỏ tới user không còn tồn tại — thông báo mồ côi, không ai đọc được.
 *   2. OptimizationResult của CSP có `fitness: 0` dù `status: 'completed'` — bản ghi tạo
 *      trước khi CSP dùng chung `scoring.js`; con số 0 đó là sai chứ không phải kết quả kém,
 *      để lại sẽ làm lệch mọi so sánh trong lịch sử.
 *   3. OptimizationResult trỏ tới dự án không còn tồn tại.
 *
 * ActivityLog **không** bị đụng tới, kể cả khi user đã bị xóa: nhật ký cố ý lưu sẵn
 * `userName`/`userEmail` để còn đọc được sau khi tài khoản biến mất. Xóa đi là mất vết kiểm toán.
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const User = require('../models/User');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const OptimizationResult = require('../models/OptimizationResult');

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/resource_allocation';
const APPLY = process.argv.includes('--apply');

async function findOrphans() {
  const [userIds, projectIds] = await Promise.all([
    User.find().distinct('_id'),
    Project.find().distinct('_id'),
  ]);

  const [orphanNotifications, legacyCsp, orphanResults] = await Promise.all([
    Notification.find({ recipient: { $nin: userIds } }).select('_id title'),
    OptimizationResult.find({ algorithm: 'csp', status: 'completed', fitness: 0 })
      .select('_id createdAt'),
    OptimizationResult.find({
      projectFilter: { $ne: null, $nin: projectIds },
    }).select('_id algorithm'),
  ]);

  return { orphanNotifications, legacyCsp, orphanResults };
}

async function cleanup() {
  await mongoose.connect(MONGO_URI);
  console.log(`Đã kết nối: ${MONGO_URI}`);
  console.log(APPLY ? '\nCHẾ ĐỘ XÓA THẬT (--apply)\n' : '\nCHẠY KHÔ — không xóa gì. Thêm --apply để xóa thật.\n');

  const { orphanNotifications, legacyCsp, orphanResults } = await findOrphans();

  const groups = [
    ['Thông báo trỏ tới user đã bị xóa', orphanNotifications, Notification],
    ['Kết quả CSP cũ có fitness = 0 (sai, không phải kém)', legacyCsp, OptimizationResult],
    ['Kết quả tối ưu hóa trỏ tới dự án đã bị xóa', orphanResults, OptimizationResult],
  ];

  let total = 0;
  for (const [label, docs, Model] of groups) {
    console.log(`${docs.length.toString().padStart(5)}  ${label}`);
    total += docs.length;
    if (APPLY && docs.length) {
      await Model.deleteMany({ _id: { $in: docs.map((d) => d._id) } });
    }
  }

  console.log(`\n${APPLY ? 'Đã xóa' : 'Sẽ xóa'} tổng cộng ${total} bản ghi.`);
  if (!total) console.log('Database sạch, không có gì để dọn.');

  await mongoose.connection.close();
  process.exit(0);
}

cleanup().catch(async (error) => {
  console.error('Lỗi khi dọn dữ liệu:', error.message);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
