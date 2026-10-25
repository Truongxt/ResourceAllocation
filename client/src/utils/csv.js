/**
 * Tiện ích CSV dùng chung cho mọi nút "Xuất CSV".
 *
 * Mọi ô chuỗi đều nằm trong ngoặc kép, nên dấu phẩy và xuống dòng bên trong không làm
 * lệch cột. Ô bắt đầu bằng `= + - @`, tab hoặc CR được thêm `'` ở đầu: Excel coi những
 * ô đó là công thức, và tên công việc do người dùng gõ không được phép thành công thức
 * chạy trên máy người mở file. Số thì giữ nguyên, nên `-3` vẫn là số âm.
 */

const FORMULA_START = /^[=+\-@\t\r]/;

const cell = (value) => {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

/** Mảng các dòng (mỗi dòng là mảng ô) → chuỗi CSV, dòng cách nhau bằng CRLF. */
export const toCsv = (rows) => rows.map((row) => row.map(cell).join(',')).join('\r\n');

/** Tải xuống ngay. Có BOM UTF-8 để Excel đọc đúng tiếng Việt. */
export const downloadCsv = (filename, rows) => {
  const blob = new Blob([`﻿${toCsv(rows)}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
