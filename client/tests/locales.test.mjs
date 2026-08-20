/**
 * Hai file locale phải khớp nhau về khóa.
 *
 * `fallbackLng: 'vi'` che lỗi rất giỏi: thêm khóa vào vi.json mà quên en.json thì
 * màn hình tiếng Anh vẫn chạy, chỉ là hiện tiếng Việt — không có lỗi nào nổ ra,
 * không ai biết cho tới khi người dùng nhìn thấy. Bộ này bắt đúng lúc đó.
 *
 * Chạy bằng node trần, không cần dựng React.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const load = (name) =>
  JSON.parse(readFileSync(path.join(dir, '..', 'src', 'i18n', 'locales', name), 'utf8'));

const vi = load('vi.json');
const en = load('en.json');

let pass = 0;
let fail = 0;
const ok = (cond, label, extra = '') => {
  if (cond) {
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${label}${extra ? `  (${extra})` : ''}`);
  } else {
    fail++;
    console.log(`  \x1b[31m✗\x1b[0m ${label}${extra ? `  (${extra})` : ''}`);
  }
};

const section = (name) => console.log(`\n\x1b[1m── ${name}\x1b[0m`);

/** Mọi khóa lá, dạng "a.b.c". */
const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );

/** Tên biến nội suy trong một chuỗi: "{{count}}" → "count". */
const placeholders = (text) =>
  new Set([...String(text).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]));

const valueAt = (obj, keyPath) => keyPath.split('.').reduce((acc, part) => acc?.[part], obj);

const viKeys = flatten(vi);
const enKeys = flatten(en);

// ══════════════════════════════════════════════
section('Bộ khóa');
{
  const viSet = new Set(viKeys);
  const enSet = new Set(enKeys);

  const missingInEn = viKeys.filter((k) => !enSet.has(k));
  const missingInVi = enKeys.filter((k) => !viSet.has(k));

  ok(viKeys.length === viSet.size, 'vi.json không có khóa trùng', `${viKeys.length} khóa`);
  ok(enKeys.length === enSet.size, 'en.json không có khóa trùng', `${enKeys.length} khóa`);
  ok(missingInEn.length === 0, 'Mọi khóa tiếng Việt đều có bản tiếng Anh',
    missingInEn.slice(0, 5).join(', '));
  ok(missingInVi.length === 0, 'Không có khóa tiếng Anh thừa ra',
    missingInVi.slice(0, 5).join(', '));
}

// ══════════════════════════════════════════════
section('Nội dung');
{
  const empty = viKeys.filter((k) => {
    const value = valueAt(en, k);
    return typeof value !== 'string' || value.trim() === '';
  });
  ok(empty.length === 0, 'Không có bản dịch rỗng', empty.slice(0, 5).join(', '));

  // Nội suy lệch nhau là lỗi im lặng: "{{count}} tasks" mà bản kia viết "{{total}}"
  // thì i18next in nguyên "{{total}}" ra màn hình.
  const mismatched = viKeys.filter((k) => {
    const a = placeholders(valueAt(vi, k));
    const b = placeholders(valueAt(en, k));
    return a.size !== b.size || [...a].some((name) => !b.has(name));
  });
  ok(mismatched.length === 0, 'Biến nội suy hai bên trùng nhau',
    mismatched.slice(0, 5).join(', '));
}

// ══════════════════════════════════════════════
section('Giá trị enum khớp schema');
{
  // Nhãn enum tra theo giá trị server trả về, nên thiếu một giá trị là hiện khóa trần.
  const expected = {
    'enums.role': ['admin', 'project_manager', 'member'],
    'enums.projectStatus': ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'],
    'enums.taskStatus': ['todo', 'in_progress', 'review', 'done', 'blocked'],
    'enums.priority': ['low', 'medium', 'high', 'critical'],
    'enums.availability': ['available', 'partially_available', 'unavailable'],
  };

  for (const [group, values] of Object.entries(expected)) {
    const missing = values.filter(
      (value) => !valueAt(vi, `${group}.${value}`) || !valueAt(en, `${group}.${value}`)
    );
    ok(missing.length === 0, `${group} đủ ${values.length} giá trị`, missing.join(', '));
  }

  const levels = [1, 2, 3, 4];
  const missingLevels = levels.filter(
    (n) => !valueAt(vi, `enums.skillLevel.${n}`) || !valueAt(en, `enums.skillLevel.${n}`)
  );
  ok(missingLevels.length === 0, 'Thang kỹ năng đủ 4 mức', missingLevels.join(', '));
}

console.log('\n════════════════════════════════════════════════════');
console.log(
  fail === 0
    ? `  \x1b[32mPASS: ${pass}\x1b[0m    FAIL: ${fail}    TỔNG: ${pass + fail}`
    : `  PASS: ${pass}    \x1b[31mFAIL: ${fail}\x1b[0m    TỔNG: ${pass + fail}`
);
console.log('════════════════════════════════════════════════════');

process.exit(fail === 0 ? 0 : 1);
