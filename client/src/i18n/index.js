/**
 * Cấu hình đa ngôn ngữ.
 *
 * Tiếng Việt là ngôn ngữ gốc của hệ thống và là `fallbackLng`: thiếu bản dịch
 * tiếng Anh thì hiện tiếng Việt chứ không hiện khóa trống. Ngược lại thì tệ hơn
 * nhiều — người dùng nhìn thấy `tasks.form.title` giữa màn hình.
 *
 * Ngôn ngữ lưu trong `localStorage` dưới khóa `rao_lang`. Đây là **tùy chọn hiển
 * thị**, không phải thông tin xác thực, nên để đó không có vấn đề gì — khác với
 * access token đã được chuyển hẳn vào bộ nhớ.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi.json';
import en from './locales/en.json';

export const LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt', short: 'VI' },
  { code: 'en', label: 'English', short: 'EN' },
];

export const LANG_STORAGE_KEY = 'rao_lang';

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(LANG_STORAGE_KEY) : null;
const initial = LANGUAGES.some((l) => l.code === stored) ? stored : 'vi';

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: initial,
  fallbackLng: 'vi',
  interpolation: {
    // React đã chống XSS khi render, escape thêm một lần nữa sẽ biến dấu nháy
    // trong tên dự án thành &#39; ngay trên màn hình.
    escapeValue: false,
  },
  // Tránh in nguyên tên biến 'tasks.views.kanban' ra giao diện khi thiếu khóa.
  // Trả về chuỗi rỗng để cú pháp t('key') || 'Fallback tiếng Việt' luôn hoạt động chuẩn xác.
  parseMissingKeyHandler: (key, defaultValue) => {
    return defaultValue || '';
  },
});

export const changeLanguage = (code) => {
  localStorage.setItem(LANG_STORAGE_KEY, code);
  return i18n.changeLanguage(code);
};

export default i18n;
