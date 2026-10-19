// Calendar days are interpreted in Vietnam, independently of the server timezone.
const DAY = 86400000;
const ZONE = 'Asia/Ho_Chi_Minh';
const ACTIVE = ['todo', 'in_progress', 'review'];
const round = (value) => Math.round(value * 100) / 100;
const calendarDay = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const stamp = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value ? stamp : null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).map(({ type, value: part }) => [type, part]));
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
};
const key = (stamp) => new Date(stamp).toISOString().slice(0, 10);
const workingDay = (stamp) => ![0, 6].includes(new Date(stamp).getUTCDay());
function workingDays(from, to) {
  if (to < from) return 0;
  const days = Math.floor((to - from) / DAY) + 1;
  let count = Math.floor(days / 7) * 5;
  for (let i = 0; i < days % 7; i++) if (workingDay(from + i * DAY)) count++;
  return count;
}
function reportingPeriod(query = {}, now = new Date()) {
  if (Boolean(query.from) !== Boolean(query.to)) throw new Error('Cần chọn cả ngày bắt đầu và kết thúc');
  let from, to;
  if (query.from) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(query.from) || !/^\d{4}-\d{2}-\d{2}$/.test(query.to)) throw new Error('Ngày phải có định dạng YYYY-MM-DD');
    from = calendarDay(query.from); to = calendarDay(query.to);
  } else {
    const today = calendarDay(now);
    const weekday = new Date(today).getUTCDay();
    from = today - ((weekday + 6) % 7) * DAY;
    to = from + 6 * DAY;
  }
  if (from === null || to === null || to < from || to - from >= 366 * DAY) throw new Error('Khoảng xem phải hợp lệ và không vượt quá 366 ngày');
  return { from: key(from), to: key(to), timezone: ZONE, start: from, end: to };
}
function workloadInPeriod(resource, tasks, period) {
  const weeklyCapacity = (resource.maxCapacity ?? 40) * (resource.fte ?? 1);
  const leaves = (resource.unavailablePeriods || []).map((leave) => [calendarDay(leave.startDate), calendarDay(leave.endDate)]);
  let availableDays = 0;
  for (let day = period.start; day <= period.end; day += DAY) {
    if (workingDay(day) && !leaves.some(([start, end]) => start !== null && end !== null && day >= start && day <= end)) availableDays++;
  }
  const breakdown = [];
  let workload = 0, unscheduledWorkload = 0;
  for (const task of tasks) {
    if (!ACTIVE.includes(task.status)) continue;
    const hours = Math.max(0, Number(task.estimatedHours) || 0);
    const start = calendarDay(task.startDate), end = calendarDay(task.endDate);
    const base = { taskId: task._id, title: task.title, estimatedHours: hours, startDate: task.startDate, endDate: task.endDate, status: task.status };
    if (start === null || end === null || end < start) {
      unscheduledWorkload += hours;
      breakdown.push({ ...base, scheduled: false, periodHours: 0 });
      continue;
    }
    if (end < period.start || start > period.end) continue;
    const totalDays = workingDays(start, end);
    const overlapStart = Math.max(start, period.start), overlapEnd = Math.min(end, period.end);
    // Weekend-only tasks retain their estimated hours and have zero normal capacity.
    const days = totalDays || Math.floor((end - start) / DAY) + 1;
    const overlapDays = totalDays ? workingDays(overlapStart, overlapEnd) : Math.floor((overlapEnd - overlapStart) / DAY) + 1;
    const periodHours = hours * overlapDays / days;
    workload += periodHours;
    if (overlapDays > 0) breakdown.push({ ...base, scheduled: true, workingDays: days, periodDays: overlapDays, hoursPerDay: round(hours / days), periodHours: round(periodHours) });
  }
  const capacity = weeklyCapacity / 5 * availableDays;
  return { workload: round(workload), capacity: round(capacity), weeklyCapacity, baseWeeklyCapacity: resource.maxCapacity ?? 40, fte: resource.fte ?? 1, availableDays,
    unscheduledWorkload: round(unscheduledWorkload), breakdown,
    utilizationRate: capacity > 0 ? Math.round(workload / capacity * 100) : workload > 0 ? 101 : 0,
    noCapacity: capacity === 0 };
}
module.exports = { reportingPeriod, workloadInPeriod, calendarDay, workingDays };
