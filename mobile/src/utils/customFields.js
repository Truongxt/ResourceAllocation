// Trường dữ liệu tùy chỉnh phía client: thứ tự, định dạng giá trị, cột CSV, tham số lọc.
// Định nghĩa ở `Project.customFields`, giá trị ở `Task.customValues` (key → giá trị) — kiểm tra
// kiểu nằm ở server (`server/src/services/customFields.service.js`).
// Logic thuần, chạy được bằng node (tests/custom-fields.test.mjs). Mobile dùng bản chép nguyên.

export const CUSTOM_FIELD_TYPES = ['text', 'number', 'date', 'select'];

/** Định nghĩa của dự án theo thứ tự hiển thị. */
export function sortedFields(project) {
  return [...((project && project.customFields) || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
}

const isEmpty = (value) => value === undefined || value === null || value === '';
const numberFormat = new Intl.NumberFormat('vi-VN');

/**
 * Giá trị để hiển thị. Ngày lấy phần `YYYY-MM-DD` của chuỗi ISO rồi đảo lại: server lưu ngày là
 * nửa đêm UTC, đổi qua `Date` theo giờ máy thì người ở múi giờ âm thấy lùi một ngày.
 */
export function formatCustomValue(field, value) {
  if (!field || isEmpty(value)) return '';
  if (field.type === 'number') return numberFormat.format(Number(value));
  if (field.type === 'date') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
  }
  return String(value);
}

const idOf = (value) => String((value && value._id) || value || '');
const normalizeName = (name) => String(name).trim().toLowerCase();

/**
 * Cột CSV cho trường tùy chỉnh: một cột cho mỗi **tên** trường của các dự án có việc trong file.
 * Trường cùng tên ở nhiều dự án (vd. "Kênh") dồn chung một cột. Trả `{ headers, cells(task) }`.
 */
export function customCsvColumns(tasks, projects) {
  const projectById = new Map((projects || []).map((p) => [idOf(p._id), p]));
  const used = new Set((tasks || []).map((t) => idOf(t.project)));
  const columns = [];
  const columnByName = new Map();
  used.forEach((projectId) => {
    sortedFields(projectById.get(projectId)).forEach((field) => {
      const name = normalizeName(field.name);
      if (!columnByName.has(name)) {
        columnByName.set(name, columns.length);
        columns.push(field.name.trim());
      }
    });
  });

  const cells = (task) => {
    const row = columns.map(() => '');
    sortedFields(projectById.get(idOf(task.project))).forEach((field) => {
      row[columnByName.get(normalizeName(field.name))] = formatCustomValue(field, task.customValues?.[field.key]);
    });
    return row;
  };
  return { headers: columns, cells };
}

/** `{ key: lựa chọn }` của bộ lọc → tham số `cf_<key>` của `GET /tasks`, bỏ ô chưa chọn. */
export function customFilterParams(selected) {
  const params = {};
  Object.entries(selected || {}).forEach(([key, value]) => {
    if (!isEmpty(value)) params[`cf_${key}`] = value;
  });
  return params;
}
