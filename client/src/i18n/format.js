/**
 * Định dạng ngày, số và tiền theo ngôn ngữ đang chọn.
 *
 * Trước đây bảy chỗ trong client gọi thẳng `toLocaleString('vi-VN')`. Chốt cứng
 * như vậy thì dịch chữ xong màn hình vẫn còn nửa tiếng Việt: ngày ra `20/08/2026`
 * và số ra `1.500.000` giữa một trang tiếng Anh.
 *
 * Đơn vị tiền **không** đổi theo ngôn ngữ. Dữ liệu lưu bằng VND; đổi ngôn ngữ là
 * đổi cách đọc chứ không phải quy đổi tỷ giá. Người dùng tiếng Anh thấy `₫1,500,000`
 * — vẫn là VND, chỉ viết theo quy ước tiếng Anh.
 */

import i18n from './index';

const LOCALES = { vi: 'vi-VN', en: 'en-US' };

/** Locale BCP-47 tương ứng ngôn ngữ hiện tại. */
export const currentLocale = () => LOCALES[i18n.language] || LOCALES.vi;

export const formatNumber = (value, options) =>
  new Intl.NumberFormat(currentLocale(), options).format(value || 0);

export const formatCurrency = (value) =>
  new Intl.NumberFormat(currentLocale(), {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);

/** Ngày ngắn cho trục Gantt: chỉ ngày và tháng. */
export const formatDayMonth = (date) =>
  new Intl.DateTimeFormat(currentLocale(), { day: '2-digit', month: '2-digit' }).format(
    new Date(date)
  );

export const formatDate = (date) =>
  new Intl.DateTimeFormat(currentLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));

export const formatDateTime = (date) =>
  new Intl.DateTimeFormat(currentLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));

/** Ngày giờ rút gọn, bỏ năm — dùng trong danh sách hoạt động gần đây. */
export const formatShortDateTime = (date) =>
  new Intl.DateTimeFormat(currentLocale(), {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));

/**
 * Khoảng cách tới hiện tại, dạng "3 phút trước".
 *
 * Nhận `t` từ ngoài thay vì gọi `i18n.t` trực tiếp: hai nơi dùng hàm này (Header
 * và Nhật ký hoạt động) đều đã có `useTranslation()`, nên truyền vào thì React
 * biết chúng phụ thuộc ngôn ngữ và vẽ lại đúng lúc.
 */
export const formatTimeAgo = (dateString, t) => {
  if (!dateString) return '';
  const diffSec = Math.floor((Date.now() - new Date(dateString)) / 1000);
  if (diffSec < 60) return t('header.justNow');
  if (diffSec < 3600) return t('header.minutesAgo', { count: Math.floor(diffSec / 60) });
  if (diffSec < 86400) return t('header.hoursAgo', { count: Math.floor(diffSec / 3600) });
  return t('header.daysAgo', { count: Math.floor(diffSec / 86400) });
};
