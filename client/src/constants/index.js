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
  { value: 'planning', label: 'Lập kế hoạch', color: 'blue' },
  { value: 'in_progress', label: 'Đang thực hiện', color: 'processing' },
  { value: 'on_hold', label: 'Tạm dừng', color: 'warning' },
  { value: 'completed', label: 'Hoàn thành', color: 'success' },
  { value: 'cancelled', label: 'Đã hủy', color: 'error' },
];

export const PROJECT_STATUS = Object.fromEntries(
  PROJECT_STATUSES.map((s) => [s.value.toUpperCase(), s.value])
);

export const PROJECT_STATUS_LABELS = Object.fromEntries(
  PROJECT_STATUSES.map((s) => [s.value, s.label])
);

// ──────────────────────────────────────────────
// Task status — khớp Task.status (5 giá trị, gồm 'review' và 'blocked')
// ──────────────────────────────────────────────
export const TASK_STATUSES = [
  { key: 'todo', label: 'Cần làm', color: '#94a3b8', badgeColor: 'default' },
  { key: 'in_progress', label: 'Đang làm', color: '#3b82f6', badgeColor: 'processing' },
  { key: 'review', label: 'Đánh giá', color: '#f59e0b', badgeColor: 'warning' },
  { key: 'done', label: 'Hoàn thành', color: '#10b981', badgeColor: 'success' },
  { key: 'blocked', label: 'Bị chặn', color: '#ef4444', badgeColor: 'error' },
];

export const TASK_STATUS = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.key.toUpperCase(), s.key])
);

export const TASK_STATUS_LABELS = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.key, s.label])
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
  { value: 'low', label: 'Thấp', color: 'default', hex: '#94a3b8' },
  { value: 'medium', label: 'Trung bình', color: 'blue', hex: '#3b82f6' },
  { value: 'high', label: 'Cao', color: 'warning', hex: '#f59e0b' },
  { value: 'critical', label: 'Khẩn cấp', color: 'red', hex: '#ef4444' },
];

export const PRIORITY = Object.fromEntries(
  PRIORITY_OPTIONS.map((p) => [p.value.toUpperCase(), p.value])
);

export const PRIORITY_LABELS = Object.fromEntries(
  PRIORITY_OPTIONS.map((p) => [p.value, p.label])
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

export const SKILL_LEVEL_LABELS = {
  [SKILL_LEVELS.BEGINNER]: 'Cơ bản',
  [SKILL_LEVELS.INTERMEDIATE]: 'Trung cấp',
  [SKILL_LEVELS.ADVANCED]: 'Nâng cao',
  [SKILL_LEVELS.EXPERT]: 'Chuyên gia',
};

// Ô chọn level cho kỹ năng mà công việc yêu cầu — cùng thang với nhân sự, nên
// mọi mức đều có người đạt được. Trước đây danh sách này có thêm mức 5 để khoá
// lại; nay server đã chốt max 4 nên không cần cái khoá đó nữa.
export const REQUIRED_SKILL_LEVEL_OPTIONS = Object.entries(SKILL_LEVEL_LABELS).map(
  ([value, label]) => ({
    value: Number(value),
    label: `${label} (Lv.${value})`,
  })
);

// ──────────────────────────────────────────────
// Resource availability — khớp Resource.availability
// ──────────────────────────────────────────────
export const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Sẵn sàng', color: 'success' },
  { value: 'partially_available', label: 'Bận một phần', color: 'warning' },
  { value: 'unavailable', label: 'Không khả dụng', color: 'error' },
];

export const AVAILABILITY_LABELS = Object.fromEntries(
  AVAILABILITY_OPTIONS.map((a) => [a.value, a.label])
);
