/**
 * Chụp tải hằng ngày của mọi nhân sự đang hoạt động, mọi công ty.
 *
 * Con số phải là ĐÚNG con số trang Utilization đang hiện: cùng tập trạng thái "đang mở",
 * cùng `weeklyLoadOf` (tuần cao điểm), cùng capacity `maxCapacity × fte`. Tự tính theo
 * một cách khác thì lịch sử và hiện tại sẽ không nối được vào nhau.
 */

const Resource = require('../models/Resource');
const Task = require('../models/Task');
const WorkloadSnapshot = require('../models/WorkloadSnapshot');
const { weeklyLoadOf } = require('../analytics/workloadTrend');

// Cùng tập với `getUtilizationBreakdown`.
const OPEN_STATUSES = ['todo', 'in_progress', 'review'];

/** Nửa đêm (giờ server) của ngày chứa `date` — khóa ngày của ảnh chụp. */
const dayKey = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const round1 = (n) => Math.round(n * 10) / 10;

async function takeWorkloadSnapshots(now = new Date()) {
  const date = dayKey(now);
  const resources = await Resource.find({ isActive: true }).select('user companyName maxCapacity fte').lean();
  const userIds = resources.map((r) => r.user).filter(Boolean);

  const tasks = await Task.find({ assignee: { $in: userIds }, status: { $in: OPEN_STATUSES } })
    .select('assignee estimatedHours startDate endDate')
    .lean();
  const tasksByUser = new Map();
  tasks.forEach((t) => {
    const key = String(t.assignee);
    if (!tasksByUser.has(key)) tasksByUser.set(key, []);
    tasksByUser.get(key).push(t);
  });

  const ops = resources.map((r) => {
    const own = tasksByUser.get(String(r.user)) || [];
    const { peakWeekHours, unscheduledHours } = weeklyLoadOf(own);
    const capacity = (r.maxCapacity || 40) * (r.fte || 1);
    return {
      updateOne: {
        filter: { resource: r._id, date },
        update: {
          $set: {
            user: r.user || null,
            companyName: r.companyName || null,
            workload: round1(peakWeekHours),
            unscheduled: round1(unscheduledHours),
            capacity,
            utilization: capacity > 0 ? Math.round((peakWeekHours / capacity) * 100) : 0,
            openTasks: own.length,
          },
        },
        upsert: true,
      },
    };
  });

  if (ops.length) await WorkloadSnapshot.bulkWrite(ops, { ordered: false });
  return { date, snapshots: ops.length };
}

module.exports = { takeWorkloadSnapshots, dayKey };
