import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export function formatDate(date, format = 'DD/MM/YYYY') {
  if (!date) return '—';
  return dayjs(date).format(format);
}

export function formatDateTime(date) {
  if (!date) return '—';
  return dayjs(date).format('DD/MM/YYYY HH:mm');
}

export function formatTimeAgo(date) {
  if (!date) return '—';
  return dayjs(date).fromNow();
}

export function formatCurrency(amount) {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num) {
  if (!num && num !== 0) return '0';
  return new Intl.NumberFormat('vi-VN').format(num);
}

export const STATUS_MAP = {
  todo: { label: 'Cần làm', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
  in_progress: { label: 'Đang làm', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  review: { label: 'Đánh giá', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  done: { label: 'Hoàn thành', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  blocked: { label: 'Bị chặn', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
};

export const PRIORITY_MAP = {
  low: { label: 'Thấp', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
  medium: { label: 'Trung bình', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  high: { label: 'Cao', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  critical: { label: 'Khẩn cấp', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
};

export const PROJECT_STATUS_MAP = {
  planning: { label: 'Lập kế hoạch', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  in_progress: { label: 'Đang thực hiện', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  on_hold: { label: 'Tạm dừng', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  completed: { label: 'Hoàn thành', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  cancelled: { label: 'Đã hủy', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
};
