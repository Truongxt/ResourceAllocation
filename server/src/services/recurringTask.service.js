const RecurringTask = require('../models/RecurringTask');
const Task = require('../models/Task');
const Project = require('../models/Project');

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
 * Trần số lượt sinh bù cho một cấu hình trong MỘT lần gọi. Cron ngừng lâu (ví dụ lỡ 3 tháng
 * của một việc hằng ngày) mà sinh hết một lượt thì đổ cả trăm việc quá hạn vào cùng lúc;
 * phần vượt trần được sinh nốt ở các lần gọi sau.
 */
const MAX_CATCH_UP_PER_RUN = 31;

/**
 * Tự động quét và sinh các công việc đã đến hạn.
 *
 * Mỗi cấu hình được sinh bù **mọi** lượt đã đến hạn (tối đa `MAX_CATCH_UP_PER_RUN`), mỗi việc
 * mang đúng ngày của lượt đó. Trước đây mỗi lần gọi chỉ sinh một lượt, nên cron lỡ nhiều lượt
 * thì phải đợi chừng ấy lần gọi mới đuổi kịp.
 */
async function generatePendingRecurringTasks() {
  const now = new Date();
  const pendingRecurring = await RecurringTask.find({
    isActive: true,
    $or: [{ nextRunDate: { $lte: now } }, { nextRunDate: null }],
  });

  const generatedTasks = [];

  // Dự án lưu trữ là chỉ đọc, mẫu nằm ngoài mọi tính toán: không sinh việc vào đó.
  // Lưu trữ vốn bị chặn khi còn cấu hình đang bật — đây là lớp chặn thứ hai cho dữ liệu cũ.
  const inactive = new Set((await Project.find({
    _id: { $in: pendingRecurring.map((item) => item.project) },
    $or: [{ isArchived: true }, { isTemplate: true }],
  }).distinct('_id')).map(String));

  for (const item of pendingRecurring) {
    if (inactive.has(String(item.project))) continue;
    let current = item.nextRunDate ?? null;
    for (let n = 0; n < MAX_CATCH_UP_PER_RUN; n++) {
      const done = await generateOccurrence(item, current, now);
      if (!done) break; // lượt này đã bị lần chạy khác nhận, hoặc lỗi
      generatedTasks.push(done.task);
      if (!done.nextDate || done.nextDate > now) break;
      current = done.nextDate;
    }
  }

  return generatedTasks;
}

/**
 * Nhận rồi sinh đúng một lượt, bắt đầu lúc `current` (null: cấu hình chưa có mốc, sinh ngay).
 * @returns {Promise<null | { task, nextDate: Date | null }>} null nếu không nhận được hoặc lỗi
 */
async function generateOccurrence(item, current, now) {
  try {
    const taskStart = current || now;
    const taskEnd = new Date(taskStart.getTime() + (item.durationHours || 8) * 3600 * 1000);

    // 0. NHẬN lượt này trước khi tạo gì. Job được cron bên ngoài gọi, có thể gọi trùng
    // (gọi lại khi timeout, hai instance): hai lần chạy cùng đọc thấy cấu hình đến hạn.
    // Chỉ lần nào đổi được `nextRunDate` từ đúng giá trị cũ mới được sinh việc. Lỡ tạo
    // việc lỗi sau khi đã nhận thì mất một lượt — vẫn hơn sinh trùng.
    const nextDate = calculateNextRunDate(item, taskStart);
    const claimed = await RecurringTask.findOneAndUpdate(
      { _id: item._id, isActive: true, nextRunDate: current },
      { $set: { nextRunDate: nextDate, lastGeneratedAt: now, ...(nextDate ? {} : { isActive: false }) } },
    );
    if (!claimed) return null;

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

    // Mốc sinh tiếp theo đã được ghi lúc nhận lượt (bước 0); hết chu kỳ thì đã tắt.
    return { task: newTask, nextDate };
  } catch (err) {
    console.error(`[RecurringTask] Error generating task for ${item._id}:`, err);
    return null;
  }
}

module.exports = {
  calculateNextRunDate,
  getPreviewDates,
  generatePendingRecurringTasks,
};
