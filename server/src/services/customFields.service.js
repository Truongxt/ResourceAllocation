const crypto = require('crypto');

/**
 * Trường dữ liệu tùy chỉnh theo dự án: định nghĩa ở `Project.customFields`, giá trị ở
 * `Task.customValues` (Map `key → giá trị`).
 *
 * `key` do server sinh và không bao giờ đổi. Giá trị bám theo `key` chứ không theo tên, nên
 * đổi tên trường không mất dữ liệu, còn nhân bản dự án chép nguyên được cả hai.
 *
 * `key` cũng là một phần đường dẫn Mongo (`customValues.<key>`) khi lọc và khi dọn giá trị,
 * nên mọi `key` đến từ request đều phải khớp `KEY_PATTERN` trước khi được dùng.
 */

const FIELD_TYPES = ['text', 'number', 'date', 'select'];
const MAX_FIELDS = 20;
const MAX_OPTIONS = 50;
const MAX_NAME = 60;
const MAX_OPTION = 100;
const MAX_TEXT = 1000;
const KEY_PATTERN = /^f_[a-z0-9]{8}$/;

const isValidKey = (key) => typeof key === 'string' && KEY_PATTERN.test(key);
const newKey = () => `f_${crypto.randomBytes(8).toString('hex').slice(0, 8)}`;
const normalizeName = (name) => String(name).trim().toLowerCase();
const plain = (value) => (value && typeof value.toObject === 'function' ? value.toObject() : value);

/**
 * Kiểm và chuẩn hóa danh sách định nghĩa gửi lên, đối chiếu với danh sách đang có.
 * Trả `{ error }` hoặc `{ fields, removedKeys, removedOptions }` — hai cái sau để dọn giá trị
 * của trường bị xóa và của lựa chọn bị bỏ.
 */
function normalizeFieldDefinitions(input, existing = []) {
  if (!Array.isArray(input)) return { error: 'fields phải là một mảng' };
  if (input.length > MAX_FIELDS) return { error: `Mỗi dự án có tối đa ${MAX_FIELDS} trường tùy chỉnh` };

  const current = new Map(existing.map((f) => [f.key, plain(f)]));
  const seenNames = new Set();
  const seenKeys = new Set();
  const fields = [];

  for (const [index, raw] of input.entries()) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: `Trường thứ ${index + 1} không hợp lệ` };
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!name) return { error: `Trường thứ ${index + 1} chưa có tên` };
    if (name.length > MAX_NAME) return { error: `Tên trường "${name.slice(0, 20)}…" dài quá ${MAX_NAME} ký tự` };
    if (seenNames.has(normalizeName(name))) return { error: `Tên trường "${name}" bị trùng` };
    seenNames.add(normalizeName(name));

    if (!FIELD_TYPES.includes(raw.type)) return { error: `Kiểu của trường "${name}" không hợp lệ` };

    let key = raw.key;
    if (key !== undefined && key !== null && key !== '') {
      if (!current.has(key)) return { error: `Trường "${name}" không thuộc dự án này` };
      if (current.get(key).type !== raw.type) {
        return { error: `Không đổi được kiểu của trường "${name}" — hãy xóa rồi tạo trường mới` };
      }
      if (seenKeys.has(key)) return { error: `Trường "${name}" bị gửi hai lần` };
    } else {
      do { key = newKey(); } while (current.has(key) || seenKeys.has(key));
    }
    seenKeys.add(key);

    let options = [];
    if (raw.type === 'select') {
      if (!Array.isArray(raw.options)) return { error: `Trường "${name}" cần danh sách lựa chọn` };
      options = raw.options.map((o) => (typeof o === 'string' ? o.trim() : '')).filter(Boolean);
      if (!options.length) return { error: `Trường "${name}" cần ít nhất một lựa chọn` };
      if (options.length > MAX_OPTIONS) return { error: `Trường "${name}" có tối đa ${MAX_OPTIONS} lựa chọn` };
      if (options.some((o) => o.length > MAX_OPTION)) return { error: `Lựa chọn của "${name}" dài quá ${MAX_OPTION} ký tự` };
      if (new Set(options).size !== options.length) return { error: `Trường "${name}" có lựa chọn bị trùng` };
    }

    fields.push({ key, name, type: raw.type, options, required: Boolean(raw.required), order: index });
  }

  const removedKeys = [...current.keys()].filter((key) => !seenKeys.has(key));
  const removedOptions = {};
  fields.forEach((f) => {
    if (f.type !== 'select' || !current.has(f.key)) return;
    const dropped = (current.get(f.key).options || []).filter((o) => !f.options.includes(o));
    if (dropped.length) removedOptions[f.key] = dropped;
  });

  return { fields, removedKeys, removedOptions };
}

const isEmpty = (value) => value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

/** Một giá trị theo kiểu của trường: `{ value }` hoặc `{ error }`. */
function coerceValue(field, value) {
  switch (field.type) {
    case 'text': {
      if (typeof value !== 'string') return { error: `"${field.name}" phải là văn bản` };
      const text = value.trim();
      if (text.length > MAX_TEXT) return { error: `"${field.name}" dài quá ${MAX_TEXT} ký tự` };
      return { value: text };
    }
    case 'number': {
      const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim().replace(',', '.')) : NaN;
      if (!Number.isFinite(number)) return { error: `"${field.name}" phải là một số` };
      return { value: number };
    }
    case 'date': {
      // Chỉ nhận ISO (`YYYY-MM-DD` hoặc đủ giờ) — `new Date('31/02/2026')` ở một số môi trường
      // vẫn ra một ngày, và ngày đó sai.
      const text = value instanceof Date ? value.toISOString() : typeof value === 'string' ? value.trim() : '';
      const match = /^(\d{4})-(\d{2})-(\d{2})(T.*)?$/.exec(text);
      const date = match ? new Date(match[4] ? text : `${text}T00:00:00.000Z`) : null;
      if (!date || Number.isNaN(date.getTime())) return { error: `"${field.name}" phải là ngày dạng YYYY-MM-DD` };
      if (!match[4]) {
        // `2026-02-31` thành 3/3 khi tạo Date: so lại ba thành phần để bắt ngày không có thật.
        const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
        if (date.getUTCFullYear() !== y || date.getUTCMonth() + 1 !== m || date.getUTCDate() !== d) {
          return { error: `"${field.name}" không phải ngày có thật` };
        }
      }
      return { value: date };
    }
    case 'select': {
      if (typeof value !== 'string' || !field.options.includes(value)) {
        return { error: `"${field.name}" phải là một trong: ${field.options.join(', ')}` };
      }
      return { value };
    }
    default:
      return { error: `Kiểu của "${field.name}" không hợp lệ` };
  }
}

/**
 * Gộp `input` (giá trị gửi lên) vào `current` (giá trị đang có) theo định nghĩa của dự án.
 * Rỗng / null là xóa. Trả `{ error }` hoặc `{ values }` — object đầy đủ sau khi gộp, để ghi đè
 * nguyên `customValues`.
 *
 * `requireAll`: kiểm cả các trường bắt buộc trên kết quả sau khi gộp. Bật khi tạo việc, và khi
 * một lần sửa có gửi `customValues`.
 */
function mergeCustomValues(definitions = [], input, current = {}, { requireAll = true } = {}) {
  if (input !== undefined && (input === null || typeof input !== 'object' || Array.isArray(input))) {
    return { error: 'customValues phải là một object { key: giá trị }' };
  }
  const fields = new Map(definitions.map((f) => [f.key, plain(f)]));
  const values = { ...(current instanceof Map ? Object.fromEntries(current) : current || {}) };
  // Giá trị của trường đã bị xóa khỏi dự án không được sống lại qua một lần ghi.
  Object.keys(values).forEach((key) => { if (!fields.has(key)) delete values[key]; });

  for (const [key, raw] of Object.entries(input || {})) {
    if (!isValidKey(key) || !fields.has(key)) return { error: `Trường "${key}" không thuộc dự án này` };
    if (isEmpty(raw)) {
      delete values[key];
      continue;
    }
    const result = coerceValue(fields.get(key), raw);
    if (result.error) return { error: result.error };
    values[key] = result.value;
  }

  if (requireAll) {
    const missing = [...fields.values()].filter((f) => f.required && isEmpty(values[f.key]));
    if (missing.length) return { error: `Chưa điền trường bắt buộc: ${missing.map((f) => f.name).join(', ')}` };
  }
  return { values };
}

/**
 * Bộ lọc `cf_<key>=<giá trị>` của `GET /tasks`. Trả `{ error }` hoặc `{ filter }` để trộn vào
 * truy vấn. Chỉ nhận `key` đúng dạng: nó được ghép thẳng vào đường dẫn Mongo.
 */
function customValueFilter(query = {}) {
  const filter = {};
  for (const [param, value] of Object.entries(query)) {
    if (!param.startsWith('cf_')) continue;
    const key = param.slice(3);
    if (!isValidKey(key) || typeof value !== 'string') return { error: 'Bộ lọc trường tùy chỉnh không hợp lệ' };
    filter[`customValues.${key}`] = value;
  }
  return { filter };
}

module.exports = {
  FIELD_TYPES,
  MAX_FIELDS,
  isValidKey,
  normalizeFieldDefinitions,
  mergeCustomValues,
  customValueFilter,
};
