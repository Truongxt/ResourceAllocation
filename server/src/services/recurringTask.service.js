const RecurringTask = require('../models/RecurringTask');
const Task = require('../models/Task');

/**
 * Tính toán thời điểm sinh tiếp theo dựa trên cấu hình chu kỳ
 * @param {Object} config - Cấu hình chu kỳ lặp
 * @param {Date} fromDate - Mốc thời gian tính tiếp theo (mặc định là hiện tại hoặc ngày sinh gần nhất)
 * @returns {Date|null}
 */
function calculateNextRunDate(config, fromDate = new Date()) {
  const { frequency, interval = 1, daysOfWeek = [], dayOfMonth = 1, startDate, endDate } = config;
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  let current = new Date(fromDate);
  if (current < start) {
    current = new Date(start);
  }

  const result = new Date(current);

  if (frequency === 'daily') {
    result.setDate(result.getDate() + interval);
  } else if (frequency === 'weekly') {
    // Sắp xếp các thứ được chọn
    const validDays = daysOfWeek.length > 0 ? [...daysOfWeek].sort((a, b) => a - b) : [1]; // Mặc định thứ 2
    let found = false;
    let lookAhead = 1;

    // Tìm thứ tiếp theo trong tuần này hoặc tuần sau
    while (!found && lookAhead <= 14 * interval) {
      const candidate = new Date(current);
      candidate.setDate(candidate.getDate() + lookAhead);
      const day = candidate.getDay(); // 0 = Chủ nhật, 1 = Thứ 2...

      if (validDays.includes(day)) {
        result.setTime(candidate.getTime());
        found = true;
        break;
      }
      lookAhead++;
    }
    if (!found) {
      result.setDate(result.getDate() + 7 * interval);
    }
  } else if (frequency === 'monthly') {
    result.setMonth(result.getMonth() + interval);
    result.setDate(Math.min(dayOfMonth, 28)); // Đảm bảo không vượt quá số ngày của tháng ngắn
  } else if (frequency === 'quarterly') {
    result.setMonth(result.getMonth() + 3 * interval);
    result.setDate(Math.min(dayOfMonth, 28));
  } else if (frequency === 'yearly') {
    result.setFullYear(result.getFullYear() + interval);
  }

  // Đặt giờ sinh mặc định lúc 07:00:00 sáng
  result.setHours(7, 0, 0, 0);

  if (end && result > end) {
    return null; // Đã quá hạn chu kỳ
  }

  return result;
}

/**
 * Lấy danh sách 10 lần sinh sắp tới để xem trước (Preview)
 */
function getPreviewDates(config, count = 10) {
  const dates = [];
  let currentRef = new Date(config.startDate || new Date());
  
  // Nếu ngày bắt đầu chưa tới 7h, tính từ 7h của ngày bắt đầu
  currentRef.setHours(7, 0, 0, 0);
  dates.push(new Date(currentRef));

  for (let i = 1; i < count; i++) {
    const next = calculateNextRunDate(config, dates[dates.length - 1]);
    if (!next) break;
    dates.push(next);
  }

  return dates;
}

/**
 * Tự động quét và sinh các công việc đã đến hạn
 */
async function generatePendingRecurringTasks() {
  const now = new Date();
  const pendingRecurring = await RecurringTask.find({
    isActive: true,
    $or: [{ nextRunDate: { $lte: now } }, { nextRunDate: null }],
  });

  const generatedTasks = [];

  for (const item of pendingRecurring) {
    try {
      const taskStart = item.nextRunDate || now;
      const taskEnd = new Date(taskStart.getTime() + (item.durationHours || 8) * 3600 * 1000);

      // 1. Tạo công việc cha
      const newTask = await Task.create({
        title: item.title,
        description: item.description,
        project: item.project,
        taskGroup: item.taskGroup,
        assignee: item.assignee,
        followers: item.followers,
        priority: item.priority,
        estimatedHours: item.estimatedHours,
        startDate: taskStart,
        endDate: taskEnd,
        status: 'todo',
        progress: 0,
        checklist: (item.checklist || []).map((c, idx) => ({
          title: c.title,
          assignee: c.assignee || item.assignee,
          isCompleted: false,
          order: idx,
        })),
        companyName: item.companyName,
        createdBy: item.createdBy,
        recurringTaskId: item._id,
      });

      // 2. Tạo các công việc con (nếu có)
      if (item.subtasks && item.subtasks.length > 0) {
        for (const sub of item.subtasks) {
          await Task.create({
            title: sub.title,
            project: item.project,
            taskGroup: item.taskGroup,
            parentTask: newTask._id,
            assignee: sub.assignee || item.assignee,
            priority: item.priority,
            estimatedHours: sub.estimatedHours || 2,
            startDate: taskStart,
            endDate: taskEnd,
            status: 'todo',
            progress: 0,
            companyName: item.companyName,
            createdBy: item.createdBy,
            recurringTaskId: item._id,
          });
        }
      }

      // 3. Tính mốc sinh tiếp theo
      const nextDate = calculateNextRunDate(item, taskStart);
      item.lastGeneratedAt = now;
      item.nextRunDate = nextDate;
      if (!nextDate) {
        item.isActive = false; // Đã hết hạn chu kỳ
      }
      await item.save();

      generatedTasks.push(newTask);
    } catch (err) {
      console.error(`[RecurringTask] Error generating task for ${item._id}:`, err);
    }
  }

  return generatedTasks;
}

module.exports = {
  calculateNextRunDate,
  getPreviewDates,
  generatePendingRecurringTasks,
};
