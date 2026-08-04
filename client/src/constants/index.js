// Application-wide constants

export const APP_NAME = 'RAO';
export const APP_FULL_NAME = 'Resource Allocation Optimization';

// User roles
export const ROLES = {
  ADMIN: 'admin',
  PM: 'project_manager',
  MEMBER: 'member',
};

// Project statuses
export const PROJECT_STATUS = {
  PLANNING: 'planning',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const PROJECT_STATUS_LABELS = {
  [PROJECT_STATUS.PLANNING]: 'Lên kế hoạch',
  [PROJECT_STATUS.IN_PROGRESS]: 'Đang thực hiện',
  [PROJECT_STATUS.ON_HOLD]: 'Tạm dừng',
  [PROJECT_STATUS.COMPLETED]: 'Hoàn thành',
  [PROJECT_STATUS.CANCELLED]: 'Đã hủy',
};

// Task statuses
export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
};

export const TASK_STATUS_LABELS = {
  [TASK_STATUS.TODO]: 'Cần làm',
  [TASK_STATUS.IN_PROGRESS]: 'Đang làm',
  [TASK_STATUS.IN_REVIEW]: 'Đang review',
  [TASK_STATUS.DONE]: 'Hoàn thành',
};

// Priority levels
export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

export const PRIORITY_LABELS = {
  [PRIORITY.LOW]: 'Thấp',
  [PRIORITY.MEDIUM]: 'Trung bình',
  [PRIORITY.HIGH]: 'Cao',
  [PRIORITY.CRITICAL]: 'Khẩn cấp',
};

// Skill levels
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

// Navigation items
export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'dashboard' },
  { path: '/projects', label: 'Dự án', icon: 'projects' },
  { path: '/tasks', label: 'Công việc', icon: 'tasks' },
  { path: '/resources', label: 'Nhân sự', icon: 'resources' },
  { path: '/optimization', label: 'Tối ưu hóa', icon: 'optimization' },
  { path: '/gantt', label: 'Gantt Chart', icon: 'gantt' },
  { path: '/reports', label: 'Báo cáo', icon: 'reports' },
];
