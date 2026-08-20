/**
 * Nhãn hiển thị cho các enum dùng chung.
 *
 * Trước đây nhãn nằm thẳng trong `constants/index.js` dưới dạng chuỗi tiếng Việt
 * cố định. Không dịch được, mà cũng không nên dịch tại chỗ: `constants` phải giữ
 * đúng vai trò là nơi khai báo **giá trị enum khớp schema Mongoose** — màu sắc,
 * mã trạng thái, thứ tự — chứ không phải nơi chứa câu chữ.
 *
 * Nên tách: `constants` giữ giá trị, file này giữ cách gọi tên chúng.
 *
 * Các hàm dưới đây đọc i18n tại thời điểm gọi, nên component nào có
 * `useTranslation()` sẽ tự cập nhật khi đổi ngôn ngữ. Những component chưa dùng
 * hook đó cũng không sai, vì `main.jsx` gắn `key={language}` lên cây ứng dụng
 * nên đổi ngôn ngữ là dựng lại toàn bộ.
 */

import i18n from './index';
import {
  PROJECT_STATUSES,
  TASK_STATUSES,
  PRIORITY_OPTIONS,
  AVAILABILITY_OPTIONS,
  SKILL_LEVEL_KEYS,
} from '../constants';

export const roleLabel = (role) => i18n.t(`enums.role.${role}`);
export const projectStatusLabel = (status) => i18n.t(`enums.projectStatus.${status}`);
export const taskStatusLabel = (status) => i18n.t(`enums.taskStatus.${status}`);
export const priorityLabel = (priority) => i18n.t(`enums.priority.${priority}`);
export const availabilityLabel = (value) => i18n.t(`enums.availability.${value}`);
export const skillLevelLabel = (level) => i18n.t(`enums.skillLevel.${level}`);

/** Danh sách option cho Select, dựng lại theo ngôn ngữ hiện tại. */
export const projectStatusOptions = () =>
  PROJECT_STATUSES.map((s) => ({ ...s, label: projectStatusLabel(s.value) }));

export const taskStatusOptions = () =>
  TASK_STATUSES.map((s) => ({ ...s, label: taskStatusLabel(s.key) }));

export const priorityOptions = () =>
  PRIORITY_OPTIONS.map((p) => ({ ...p, label: priorityLabel(p.value) }));

export const availabilityOptions = () =>
  AVAILABILITY_OPTIONS.map((a) => ({ ...a, label: availabilityLabel(a.value) }));

/** Ô chọn mức kỹ năng mà công việc yêu cầu — thang 1-4, cùng thang với nhân sự. */
export const requiredSkillLevelOptions = () =>
  SKILL_LEVEL_KEYS.map((level) => ({
    value: level,
    label: i18n.t('enums.skillLevel.withLevel', { label: skillLevelLabel(level), level }),
  }));
