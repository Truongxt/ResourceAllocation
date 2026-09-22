/**
 * Quan hệ phụ thuộc giữa các công việc.
 *
 * Trước đây `Task.dependencies` là mảng ObjectId phẳng và mọi quan hệ mặc định là
 * finish-to-start. Nay mỗi phụ thuộc mang thêm `type`, nên dữ liệu tồn tại ở HAI
 * dạng cùng lúc: bản ghi cũ chưa chạy migration, và payload từ giao diện cũ vẫn gửi
 * mảng id phẳng. Mọi chỗ đọc/ghi đều đi qua file này để không nơi nào phải tự đoán
 * mình đang cầm dạng nào.
 */

const DEPENDENCY_TYPES = ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'];

const DEFAULT_DEPENDENCY_TYPE = 'finish_to_start';

/** Rút id công việc ra khỏi một phần tử phụ thuộc, bất kể dạng nào. */
const dependencyTaskId = (dep) => {
  if (!dep) return null;
  // Dạng mới: { task, type } — `task` có thể đã populate thành document.
  if (typeof dep === 'object' && 'task' in dep && dep.task) {
    return String(dep.task._id || dep.task);
  }
  if (typeof dep === 'object' && dep.taskId) return String(dep.taskId);
  // Dạng cũ: ObjectId phẳng, hoặc document đã populate.
  return String(dep._id || dep);
};

/** Danh sách id tiền nhiệm, bỏ phần tử rỗng. */
const dependencyTaskIds = (dependencies) =>
  (dependencies || []).map(dependencyTaskId).filter(Boolean);

/** Loại quan hệ của một phần tử; dạng cũ luôn là finish-to-start. */
const dependencyType = (dep) => {
  const type = dep && typeof dep === 'object' ? dep.type : null;
  return DEPENDENCY_TYPES.includes(type) ? type : DEFAULT_DEPENDENCY_TYPE;
};

/**
 * Đưa payload người dùng gửi lên về dạng chuẩn `[{ task, type }]`.
 *
 * Chấp nhận cả ba dạng để giai đoạn chuyển tiếp không làm hỏng giao diện đang chạy:
 *   ['id1', 'id2']
 *   [{ task: 'id1', type: 'start_to_start' }]
 *   [{ taskId: 'id1', type: 'start_to_start' }]
 *
 * @returns {{ ok: true, value: Array }|{ ok: false, message: string }}
 */
function normalizeDependencies(input) {
  if (input === undefined || input === null) return { ok: true, value: [] };
  if (!Array.isArray(input)) {
    return { ok: false, message: 'Dependencies phải là mảng' };
  }

  const seen = new Set();
  const value = [];

  for (const raw of input) {
    const task = dependencyTaskId(raw);
    if (!task || task === 'undefined' || task === 'null') {
      return { ok: false, message: 'Phụ thuộc thiếu id công việc tiền nhiệm' };
    }

    const type = raw && typeof raw === 'object' && raw.type ? raw.type : DEFAULT_DEPENDENCY_TYPE;
    if (!DEPENDENCY_TYPES.includes(type)) {
      return { ok: false, message: `Loại quan hệ phụ thuộc không hợp lệ: ${type}` };
    }

    // Trùng id thì giữ khai báo đầu tiên. Cùng một cặp công việc mà hai loại quan hệ
    // khác nhau là mâu thuẫn, và im lặng chọn cái sau sẽ khó lần ra về sau.
    if (seen.has(task)) continue;
    seen.add(task);
    value.push({ task, type });
  }

  return { ok: true, value };
}

module.exports = {
  DEPENDENCY_TYPES,
  DEFAULT_DEPENDENCY_TYPE,
  dependencyTaskId,
  dependencyTaskIds,
  dependencyType,
  normalizeDependencies,
};
