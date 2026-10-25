// Bố cục màn Gantt trên mobile: trục thời gian, vị trí và độ rộng từng thanh. Logic thuần,
// không phụ thuộc React Native — chạy và kiểm thử được bằng node (tests/gantt.test.mjs).
// CPM, mốc, thời lượng dùng chung với web qua `gantt.js`.

import { isMilestone } from './gantt.js';

const DAY_MS = 86400000;

/** Thanh ngắn hơn thế này thì khó chạm trúng trên điện thoại. */
export const MIN_BAR_WIDTH = 24;

const startOfDay = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/** Số ngày giữa hai mốc đầu ngày. `round` để ngày chuyển giờ mùa hè không làm lệch một ngày. */
const dayDiff = (from, to) => Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);

/**
 * @param {Array} tasks
 * @param {{ dayWidth: number, today?: Date, padDays?: number }} options
 * @returns {{
 *   start: Date, totalDays: number, width: number, todayOffset: number,
 *   rows: Array<{ task, left: number, width: number, milestone: boolean }>,
 *   unscheduled: Array,
 * }}
 *   Thanh trải từ đầu ngày bắt đầu tới đầu ngày kết thúc, giống web. Việc thiếu ngày bắt đầu
 *   hoặc kết thúc không vẽ được thanh, nên vào `unscheduled` thay vì biến mất.
 */
export function buildGanttLayout(tasks, { dayWidth, today = new Date(), padDays = 2 }) {
  const scheduled = [];
  const unscheduled = [];
  tasks.forEach((task) => {
    (task.startDate && task.endDate ? scheduled : unscheduled).push(task);
  });
  scheduled.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  // Trục bao trọn mọi việc và cả hôm nay, cộng `padDays` mỗi bên.
  let first = startOfDay(today);
  let last = startOfDay(today);
  scheduled.forEach((task) => {
    const s = startOfDay(task.startDate);
    const e = startOfDay(task.endDate);
    if (s < first) first = s;
    if (e > last) last = e;
  });
  const start = new Date(first.getFullYear(), first.getMonth(), first.getDate() - padDays);
  const totalDays = dayDiff(start, last) + padDays;

  const rows = scheduled.map((task) => {
    const milestone = isMilestone(task);
    const offset = dayDiff(start, task.startDate) * dayWidth;
    if (milestone) return { task, left: offset + dayWidth / 2, width: 0, milestone };
    const days = Math.max(0, dayDiff(task.startDate, task.endDate));
    return { task, left: offset, width: Math.max(days * dayWidth, MIN_BAR_WIDTH), milestone };
  });

  return {
    start,
    totalDays,
    width: totalDays * dayWidth,
    todayOffset: dayDiff(start, today) * dayWidth + dayWidth / 2,
    rows,
    unscheduled,
  };
}
