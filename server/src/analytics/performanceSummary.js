/**
 * Báo cáo kết quả theo người: gom việc theo người thực hiện.
 *
 * Hàm thuần, không đụng DB — controller lo chọn tập người và tập việc (theo deadline
 * trong kỳ), ở đây chỉ phân loại và đếm.
 *
 * Mỗi việc rơi vào đúng một nhóm, nên luôn có:
 *   total = done + failed + pendingReview + overdue + open
 *   done  = onTime + late + doneNoTimestamp
 */

const OPEN_STATUSES = new Set(['todo', 'in_progress', 'blocked']);
const COUNT_KEYS = ['total', 'done', 'onTime', 'late', 'doneNoTimestamp', 'failed', 'pendingReview', 'overdue', 'open', 'extensions'];

const emptyCounts = () => Object.fromEntries(COUNT_KEYS.map((k) => [k, 0]));

const idOf = (v) => (v && typeof v === 'object' && v._id ? String(v._id) : v ? String(v) : null);

// Mẫu số chỉ gồm việc đo được. Việc `done` không có `completedAt` (từ trước khi có
// luồng đánh giá) không có mốc để so, nên không được nhét vào "đúng hạn" cho đẹp số.
const withRate = (c) => {
  const measured = c.onTime + c.late;
  return { ...c, onTimeRate: measured > 0 ? Math.round((c.onTime / measured) * 100) : null };
};

const classify = (c, task, now) => {
  c.total += 1;
  const end = task.endDate ? new Date(task.endDate) : null;

  if (task.status === 'done') {
    c.done += 1;
    // Đúng/trễ hạn đo bằng lúc người làm bấm hoàn thành (`completedAt`), KHÔNG bằng
    // `reviewedAt`: người thực hiện không chịu trách nhiệm cho việc duyệt chậm.
    if (!task.completedAt || !end) c.doneNoTimestamp += 1;
    else if (new Date(task.completedAt) <= end) c.onTime += 1;
    else c.late += 1;
  } else if (task.status === 'failed') {
    c.failed += 1;
  } else if (task.status === 'review') {
    // Còn có thể bị trả lại, nên chưa xét đúng hay trễ hạn.
    c.pendingReview += 1;
  } else if (OPEN_STATUSES.has(task.status)) {
    if (end && end < now) c.overdue += 1;
    else c.open += 1;
  }

  // Gia hạn = lùi deadline ra sau. Kéo deadline lên sớm hơn không phải gia hạn.
  (task.deadlineHistory || []).forEach((h) => {
    if (h.oldEndDate && h.newEndDate && new Date(h.newEndDate) > new Date(h.oldEndDate)) {
      c.extensions += 1;
    }
  });
};

/**
 * @param {Array} tasks  - việc đã lọc theo kỳ; `assignee` là id hoặc object đã populate
 * @param {Array} people - tập người của báo cáo `{ _id, name, email, avatar, department }`
 * @param {Date}  now
 * @returns {{ people: Array, totals: Object }}
 */
const summarizePerformance = (tasks, people, now = new Date()) => {
  const byUser = new Map(people.map((p) => [String(p._id), emptyCounts()]));
  const totals = emptyCounts();

  tasks.forEach((task) => {
    const counts = byUser.get(idOf(task.assignee));
    // Việc chưa giao hoặc giao cho người ngoài tập thì không thuộc báo cáo này.
    if (!counts) return;
    classify(counts, task, now);
    classify(totals, task, now);
  });

  const rows = people
    .map((p) => ({
      user: { _id: p._id, name: p.name, email: p.email, avatar: p.avatar },
      department: p.department || '',
      ...withRate(byUser.get(String(p._id))),
    }))
    .sort((a, b) => b.total - a.total || String(a.user.name || '').localeCompare(String(b.user.name || ''), 'vi'));

  return { people: rows, totals: withRate(totals) };
};

module.exports = { summarizePerformance };
