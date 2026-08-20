// Application-wide constants
//
// Các giá trị enum ở đây phải khớp với schema Mongoose ở server/src/models/.
// Trước đây file này không được import ở đâu nên đã trôi khỏi thực tế
// (task status ghi 'in_review' trong khi server dùng 'review', và thiếu 'blocked').

export const APP_NAME = 'RAO';
export const APP_FULL_NAME = 'Resource Allocation Optimization';

// User roles — khớp User.role
export const ROLES = {
  ADMIN: 'admin',
  PM: 'project_manager',
  MEMBER: 'member',
};

// ──────────────────────────────────────────────
// Project status — khớp Project.status
// ──────────────────────────────────────────────
export const PROJECT_STATUSES = [
  { value: 'planning', color: 'blue' },
  { value: 'in_progress', color: 'processing' },
  { value: 'on_hold', color: 'warning' },
  { value: 'completed', color: 'success' },
  { value: 'cancelled', color: 'error' },
];

export const PROJECT_STATUS = Object.fromEntries(
  PROJECT_STATUSES.map((s) => [s.value.toUpperCase(), s.value])
);

// Nhãn hiển thị nằm ở src/i18n/enums.js — file này chỉ giữ giá trị enum và màu,
// vốn không phụ thuộc ngôn ngữ.

// ──────────────────────────────────────────────
// Task status — khớp Task.status (5 giá trị, gồm 'review' và 'blocked')
// ──────────────────────────────────────────────
export const TASK_STATUSES = [
  { key: 'todo', color: '#94a3b8', badgeColor: 'default' },
  { key: 'in_progress', color: '#3b82f6', badgeColor: 'processing' },
  { key: 'review', color: '#f59e0b', badgeColor: 'warning' },
  { key: 'done', color: '#10b981', badgeColor: 'success' },
  { key: 'blocked', color: '#ef4444', badgeColor: 'error' },
];

export const TASK_STATUS = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.key.toUpperCase(), s.key])
);

// Mã màu thật, dùng khi vẽ trực tiếp (Gantt, biểu đồ)
export const TASK_STATUS_COLORS = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.key, s.color])
);

// Tên màu của Ant Design, dùng cho Tag / Badge
export const TASK_STATUS_BADGE_COLORS = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.key, s.badgeColor])
);

// API thống kê trả về đếm theo camelCase (`inProgress`) trong khi enum dùng
// snake_case (`in_progress`) — chuyển đổi ở một chỗ thay vì viết cứng danh sách.
export const taskStatusCountKey = (statusKey) =>
  statusKey.replace(/_(.)/g, (_, char) => char.toUpperCase());

// ──────────────────────────────────────────────
// Priority — dùng chung cho cả Project và Task
// ──────────────────────────────────────────────
export const PRIORITY_OPTIONS = [
  { value: 'low', color: 'default', hex: '#94a3b8' },
  { value: 'medium', color: 'blue', hex: '#3b82f6' },
  { value: 'high', color: 'warning', hex: '#f59e0b' },
  { value: 'critical', color: 'red', hex: '#ef4444' },
];

export const PRIORITY = Object.fromEntries(
  PRIORITY_OPTIONS.map((p) => [p.value.toUpperCase(), p.value])
);

// Mã màu thật, dùng cho những chỗ vẽ trực tiếp (Gantt) thay vì Tag của Ant Design.
export const PRIORITY_COLORS = Object.fromEntries(
  PRIORITY_OPTIONS.map((p) => [p.value, p.hex])
);

// ──────────────────────────────────────────────
// Skill levels — thang 1-4 dùng chung cho cả Resource.skills[].level (enum 1-4)
// và Task.requiredSkills[].level (max 4). Hai bên trước đây lệch nhau.
// ──────────────────────────────────────────────
export const SKILL_LEVELS = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

// Thứ tự các mức, dùng để dựng ô chọn. Nhãn ở src/i18n/enums.js.
// Thang dừng ở 4 vì đó cũng là trần của Resource.skills[].level — mọi mức yêu cầu
// đều có người đạt được.
export const SKILL_LEVEL_KEYS = Object.values(SKILL_LEVELS);

// ──────────────────────────────────────────────
// Resource availability — khớp Resource.availability
// ──────────────────────────────────────────────
export const AVAILABILITY_OPTIONS = [
  { value: 'available', color: 'success' },
  { value: 'partially_available', color: 'warning' },
  { value: 'unavailable', color: 'error' },
];

