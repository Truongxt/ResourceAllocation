// Logic thuần về lịch và đồ thị phụ thuộc giữa các công việc — không phụ thuộc
// React nên chạy và kiểm thử được trực tiếp bằng node (xem client/tests/gantt.test.mjs).
// Dùng bởi sơ đồ Gantt và ô chọn công việc tiền nhiệm trong form Task.

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(d1, d2) {
  return Math.ceil((new Date(d2) - new Date(d1)) / 86400000);
}

// Định dạng ngày đã chuyển sang src/i18n/format.js (`formatDayMonth`): nó phụ
// thuộc ngôn ngữ đang chọn, còn file này cố ý không phụ thuộc gì để chạy được
// bằng node trần.

/**
 * Quy ước Gantt thông dụng: task có thời lượng bằng 0 (bắt đầu và kết thúc cùng
 * ngày) là một mốc (milestone). Schema Task không có cờ riêng nên suy ra từ ngày tháng.
 */
export function isMilestone(task) {
  if (!task.startDate || !task.endDate) return false;
  return new Date(task.startDate).toDateString() === new Date(task.endDate).toDateString();
}

/** Thời lượng tính bằng ngày; thiếu ngày thì ước lượng từ estimatedHours (8 giờ/ngày). */
export function durationOf(task) {
  if (task.startDate && task.endDate) return Math.max(0, daysBetween(task.startDate, task.endDate));
  if (task.estimatedHours) return Math.max(1, Math.ceil(task.estimatedHours / 8));
  return 1;
}

/** Lấy id từ một tham chiếu phụ thuộc, dù đã populate thành object hay còn là ObjectId. */
const depId = (dep) => String(dep?._id || dep);

/**
 * Những công việc KHÔNG được chọn làm tiền nhiệm của `taskId`: chính nó, và mọi
 * công việc mà từ đó lần theo chuỗi phụ thuộc sẽ quay về `taskId` — chọn chúng
 * sẽ tạo thành vòng lặp.
 *
 * Cạnh gốc trỏ từ công việc tới tiền nhiệm của nó, nên ở đây duyệt theo chiều
 * ngược lại (tiền nhiệm → công việc phụ thuộc vào nó) bắt đầu từ `taskId`.
 *
 * @returns {Set<string>} tập id không hợp lệ
 */
export function invalidPredecessors(tasks, taskId) {
  const invalid = new Set();
  if (!taskId) return invalid;

  const dependents = new Map();
  tasks.forEach((task) => {
    (task.dependencies || []).forEach((dep) => {
      const key = depId(dep);
      if (!dependents.has(key)) dependents.set(key, []);
      dependents.get(key).push(String(task._id));
    });
  });

  const queue = [String(taskId)];
  invalid.add(String(taskId));
  while (queue.length) {
    const current = queue.shift();
    for (const next of dependents.get(current) || []) {
      if (invalid.has(next)) continue;
      invalid.add(next);
      queue.push(next);
    }
  }

  return invalid;
}

/**
 * CPM (Critical Path Method) trên đồ thị phụ thuộc của các task được truyền vào.
 *
 * Lượt xuôi tính early start/finish, lượt ngược tính late start/finish; task có
 * slack = 0 nằm trên đường găng. Dependency trỏ tới task ngoài tập truyền vào
 * (do lọc theo dự án / phân trang) được bỏ qua. Nếu đồ thị có chu trình thì
 * không tồn tại đường găng — trả về cờ `cyclic` để UI báo lại.
 *
 * @param {Array} tasks danh sách task, mỗi task có `_id` và `dependencies`
 *                      (mảng ObjectId hoặc object đã populate)
 * @returns {{ critical: Set<string>, length: number, cyclic: boolean }}
 */
export function computeCriticalPath(tasks) {
  const ids = new Set(tasks.map((t) => t._id));
  const preds = new Map(tasks.map((t) => [t._id, []]));
  const succs = new Map(tasks.map((t) => [t._id, []]));
  const duration = new Map(tasks.map((t) => [t._id, durationOf(t)]));

  tasks.forEach((task) => {
    (task.dependencies || []).forEach((dep) => {
      const depId = dep?._id || dep;
      if (!ids.has(depId) || depId === task._id) return;
      preds.get(task._id).push(depId);
      succs.get(depId).push(task._id);
    });
  });

  // Sắp xếp topo (Kahn) — nếu không xếp hết được thì đồ thị có chu trình.
  const indegree = new Map(tasks.map((t) => [t._id, preds.get(t._id).length]));
  const queue = tasks.filter((t) => indegree.get(t._id) === 0).map((t) => t._id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    succs.get(id).forEach((next) => {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    });
  }
  if (order.length !== tasks.length) return { critical: new Set(), length: 0, cyclic: true };

  const earlyStart = new Map();
  const earlyFinish = new Map();
  order.forEach((id) => {
    const start = preds.get(id).reduce((max, p) => Math.max(max, earlyFinish.get(p)), 0);
    earlyStart.set(id, start);
    earlyFinish.set(id, start + duration.get(id));
  });

  const projectEnd = order.reduce((max, id) => Math.max(max, earlyFinish.get(id)), 0);

  const lateStart = new Map();
  [...order].reverse().forEach((id) => {
    const finish = succs.get(id).reduce((min, s) => Math.min(min, lateStart.get(s)), projectEnd);
    lateStart.set(id, finish - duration.get(id));
  });

  const critical = new Set(order.filter((id) => lateStart.get(id) - earlyStart.get(id) === 0));
  return { critical, length: projectEnd, cyclic: false };
}
