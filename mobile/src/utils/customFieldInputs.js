// Ô nhập trường tùy chỉnh trên mobile: chuỗi người dùng gõ ↔ giá trị gửi server.
// Logic thuần, chạy được bằng node (tests/custom-field-inputs.test.mjs).
//
// Chỉ mobile có file này: web dùng ô số / chọn ngày của antd, còn mobile gõ tay — ngày dạng
// dd/mm/yyyy, số theo thói quen Việt (dấu chấm ngăn nghìn, dấu phẩy thập phân). Server vẫn kiểm
// lại mọi thứ (`server/src/services/customFields.service.js`); ở đây để báo lỗi ngay tại form.

import { sortedFields } from './customFields.js';

const MAX_TEXT = 1000;

/** Giá trị đã lưu → chuỗi cho ô nhập (mọi trường của dự án, kể cả trường chưa có giá trị). */
export function inputsFromValues(project, values = {}) {
  const inputs = {};
  sortedFields(project).forEach((field) => {
    const value = values?.[field.key];
    if (value === undefined || value === null || value === '') inputs[field.key] = '';
    else if (field.type === 'number') inputs[field.key] = String(value).replace('.', ',');
    else if (field.type === 'date') {
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
      inputs[field.key] = match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
    } else inputs[field.key] = String(value);
  });
  return inputs;
}

/**
 * "15.000.000" → 15000000, "1.234,5" → 1234.5, "2.5" → 2.5. Có dấu phẩy thì dấu phẩy là phần
 * thập phân và mọi dấu chấm là ngăn nghìn; không có thì nhiều dấu chấm là ngăn nghìn, một dấu
 * chấm là phần thập phân.
 */
function parseNumber(text) {
  const compact = text.replace(/\s/g, '');
  let normalized = compact;
  if (compact.includes(',')) normalized = compact.replace(/\./g, '').replace(',', '.');
  else if ((compact.match(/\./g) || []).length > 1) normalized = compact.replace(/\./g, '');
  return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
}

/** dd/mm/yyyy → `{ value: 'YYYY-MM-DD' }` hoặc `{ error }`. */
function parseDate(field, text) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (!match) return { error: `"${field.name}" phải có dạng dd/mm/yyyy` };
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { error: `"${field.name}" không phải ngày có thật` };
  }
  return { value: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
}

/**
 * Chuỗi trong các ô → `{ values }` gửi làm `customValues`, hoặc `{ error }` cho lỗi đầu tiên.
 * Ô trống gửi `null` để xóa giá trị cũ khi sửa.
 */
export function valuesFromInputs(project, inputs = {}) {
  const values = {};
  for (const field of sortedFields(project)) {
    const text = String(inputs?.[field.key] ?? '').trim();
    if (!text) {
      if (field.required) return { error: `Chưa điền "${field.name}"` };
      values[field.key] = null;
      continue;
    }
    if (field.type === 'number') {
      const number = parseNumber(text);
      if (!Number.isFinite(number)) return { error: `"${field.name}" phải là một số` };
      values[field.key] = number;
    } else if (field.type === 'date') {
      const result = parseDate(field, text);
      if (result.error) return { error: result.error };
      values[field.key] = result.value;
    } else if (field.type === 'select') {
      if (!(field.options || []).includes(text)) {
        return { error: `"${field.name}" phải là một trong: ${(field.options || []).join(', ')}` };
      }
      values[field.key] = text;
    } else {
      if (text.length > MAX_TEXT) return { error: `"${field.name}" dài quá ${MAX_TEXT} ký tự` };
      values[field.key] = text;
    }
  }
  return { values };
}
