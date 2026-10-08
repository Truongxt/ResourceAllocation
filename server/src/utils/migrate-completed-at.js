/**
 * Khôi phục `completedAt` cho việc đã Hoàn thành mà thiếu mốc này.
 *
 *   npm run migrate:completed-at              chỉ liệt kê, KHÔNG sửa gì
 *   npm run migrate:completed-at -- --apply   ghi mốc cho những việc suy ra được
 *
 * Vì sao cần: trước bản vá `152df0e`, đường `PUT /tasks/:id` (kể cả kéo thẻ Kanban sang
 * Hoàn thành) đổi trạng thái mà không ghi `completedAt`. Báo cáo kết quả theo người đo đúng
 * hạn bằng `completedAt`, nên các việc đó rơi vào nhóm "xong nhưng không có mốc".
 *
 * Nguồn mốc, theo thứ tự tin cậy:
 *   1. `reviewRequestedAt` của chính việc — mốc báo hoàn thành, đúng quy ước của `completedAt`.
 *   2. Nhật ký hoạt động: lần **vào** trạng thái done cuối cùng (sửa tên sau khi xong không
 *      tính là xong lần nữa). Chỉ dùng khi nhật ký kết thúc đúng ở done.
 * Không suy ra được thì liệt kê ra để người chạy quyết. Không đoán bằng `updatedAt`: đó là
 * lần sửa gần nhất, không phải lúc xong.
 *
 * Đây là script một lần. Chạy lại vô hại — việc đã có mốc thì bỏ qua.
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const toId = (v) => String((v && v._id) || v);

/** Trạng thái của việc ngay sau hành động được ghi trong nhật ký; null nếu bản ghi không nói. */
const statusAfter = (entry) => {
  const d = entry.details || {};
  switch (entry.action) {
    case 'UPDATE_TASK_STATUS':
    case 'TASK_MARKED_FAILED':
      return d.newStatus || null;
    case 'UPDATE_TASK':
      return d.status || null;
    case 'TASK_REVIEW_APPROVED':
      return 'done';
    case 'TASK_REVIEW_REJECTED':
      return 'in_progress';
    default:
      return null;
  }
};

/** Các hành động đọc ở trên — để truy vấn nhật ký chỉ lấy đúng chừng ấy. */
const STATUS_ACTIONS = [
  'UPDATE_TASK_STATUS',
  'TASK_MARKED_FAILED',
  'UPDATE_TASK',
  'TASK_REVIEW_APPROVED',
  'TASK_REVIEW_REJECTED',
];

/**
 * Quyết định thuần, không chạm DB — để kiểm thử được.
 *
 * @returns {{ fixes: Array<{id, title, completedAt, source}>, unresolved: Array<{id, title, reason}> }}
 */
function planCompletedAtBackfill({ tasks, logs }) {
  const byTask = new Map();
  for (const entry of logs) {
    const status = statusAfter(entry);
    if (!status) continue;
    const key = toId(entry.entityId);
    if (!byTask.has(key)) byTask.set(key, []);
    byTask.get(key).push({ at: new Date(entry.createdAt), status });
  }

  const fixes = [];
  const unresolved = [];
  for (const task of tasks) {
    if (task.status !== 'done' || task.completedAt) continue;
    const base = { id: toId(task._id), title: task.title };

    if (task.reviewRequestedAt) {
      fixes.push({ ...base, completedAt: new Date(task.reviewRequestedAt), source: 'reviewRequestedAt' });
      continue;
    }

    const history = (byTask.get(base.id) || []).sort((a, b) => a.at - b.at);
    if (!history.length) {
      unresolved.push({ ...base, reason: 'không có nhật ký đổi trạng thái' });
      continue;
    }
    const last = history[history.length - 1];
    if (last.status !== 'done') {
      unresolved.push({ ...base, reason: `nhật ký kết thúc ở "${last.status}", không khớp trạng thái hiện tại` });
      continue;
    }
    // Lùi về đầu chuỗi done cuối cùng: đó là lúc việc thật sự xong.
    let i = history.length - 1;
    while (i > 0 && history[i - 1].status === 'done') i -= 1;
    fixes.push({ ...base, completedAt: history[i].at, source: 'nhật ký hoạt động' });
  }

  return { fixes, unresolved };
}

async function run() {
  dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });
  const Task = require('../models/Task');
  const ActivityLog = require('../models/ActivityLog');

  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/resource_allocation';
  const APPLY = process.argv.includes('--apply');

  await mongoose.connect(MONGO_URI);
  console.log(`Đã kết nối ${MONGO_URI}\n`);

  const tasks = await Task.find({ status: 'done', completedAt: null })
    .select('title status completedAt reviewRequestedAt')
    .lean();
  if (!tasks.length) {
    console.log('Không có việc Hoàn thành nào thiếu completedAt. Không cần làm gì.');
    return;
  }
  const logs = await ActivityLog.find({
    entityType: 'task',
    entityId: { $in: tasks.map((t) => t._id) },
    action: { $in: STATUS_ACTIONS },
  })
    .select('entityId action details createdAt')
    .lean();
  const plan = planCompletedAtBackfill({ tasks, logs });

  if (plan.fixes.length) {
    console.log(`${plan.fixes.length} việc suy ra được mốc hoàn thành:\n`);
    for (const f of plan.fixes) console.log(`  - ${f.title}: ${f.completedAt.toISOString()} (${f.source})`);
  }
  if (plan.unresolved.length) {
    console.log(`\n${plan.unresolved.length} việc KHÔNG suy ra được — để nguyên, cần người quyết:\n`);
    for (const u of plan.unresolved) console.log(`  - ${u.title} (${u.reason})`);
  }

  if (!APPLY) {
    console.log('\nĐây là chạy khô. Thêm `-- --apply` để ghi thật.');
    return;
  }

  for (const f of plan.fixes) {
    // Điều kiện completedAt: null để chạy song song hay chạy lại cũng không ghi đè mốc đã có.
    await Task.updateOne({ _id: f.id, completedAt: null }, { $set: { completedAt: f.completedAt } });
  }
  console.log(`\nĐã ghi completedAt cho ${plan.fixes.length} việc.`);
}

if (require.main === module) {
  run()
    .catch((err) => {
      console.error('Lỗi:', err.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}

module.exports = { planCompletedAtBackfill, STATUS_ACTIONS };
