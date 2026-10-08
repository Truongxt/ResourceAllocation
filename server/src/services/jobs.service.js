/**
 * Job định kỳ. Hệ thống KHÔNG tự hẹn giờ: cron bên ngoài gọi `POST /api/internal/jobs/:name`
 * (xem `routes/internal.routes.js`). Vì vậy mỗi job phải chạy lại được an toàn — cron có
 * thể gọi lại khi timeout, hoặc gọi trùng vào hai instance.
 *
 * `staleAfterHours`: quá ngần ấy giờ không có lần chạy thành công thì `/jobs/status` báo
 * `stale`. Ngưỡng rộng hơn chu kỳ một chút để một lần trễ không thành báo động giả.
 */

const JobRun = require('../models/JobRun');
const { generatePendingRecurringTasks } = require('./recurringTask.service');
const { takeWorkloadSnapshots } = require('./workloadSnapshot.service');

const JOBS = {
  'recurring-tasks': {
    description: 'Sinh công việc từ các cấu hình lặp lại đã đến hạn',
    schedule: 'mỗi giờ',
    staleAfterHours: 3,
    run: async () => ({ generated: (await generatePendingRecurringTasks()).length }),
  },
  'workload-snapshot': {
    description: 'Chụp tải hằng ngày của mọi nhân sự (lịch sử cho báo cáo)',
    schedule: 'mỗi ngày',
    staleAfterHours: 30,
    run: takeWorkloadSnapshots,
  },
};

const isKnownJob = (name) => Object.prototype.hasOwnProperty.call(JOBS, name);

/** Chạy một job và ghi lại `JobRun`. Lỗi của job được ghi rồi ném tiếp. */
const runJob = async (name) => {
  const record = await JobRun.create({ name });
  try {
    const result = await JOBS[name].run();
    record.status = 'success';
    record.result = result;
    return result;
  } catch (error) {
    record.status = 'failed';
    record.error = error.message || String(error);
    throw error;
  } finally {
    record.finishedAt = new Date();
    await record.save();
  }
};

/** Lần chạy gần nhất và lần thành công gần nhất của từng job. */
const jobStatus = async (now = new Date()) =>
  Promise.all(Object.entries(JOBS).map(async ([name, job]) => {
    const [lastRun, lastSuccess] = await Promise.all([
      JobRun.findOne({ name }).sort({ startedAt: -1 }).lean(),
      JobRun.findOne({ name, status: 'success' }).sort({ startedAt: -1 }).lean(),
    ]);
    const lastSuccessAt = lastSuccess?.finishedAt || null;
    return {
      name,
      description: job.description,
      schedule: job.schedule,
      staleAfterHours: job.staleAfterHours,
      lastRunAt: lastRun?.startedAt || null,
      lastStatus: lastRun?.status || null,
      lastError: lastRun?.status === 'failed' ? lastRun.error : '',
      lastSuccessAt,
      // Chưa từng chạy thành công cũng là stale: đó đúng là trường hợp quên cấu hình cron.
      stale: !lastSuccessAt || now - new Date(lastSuccessAt) > job.staleAfterHours * 3600 * 1000,
    };
  }));

module.exports = { JOBS, isKnownJob, runJob, jobStatus };
