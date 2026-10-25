// Trường tùy chỉnh phía client: thứ tự, định dạng giá trị, cột CSV, tham số lọc.
// Chạy: cd client && npm test
//
// Mobile dùng bản chép nguyên của `src/utils/customFields.js`.

import {
  sortedFields,
  formatCustomValue,
  customCsvColumns,
  customFilterParams,
} from '../src/utils/customFields.js';

let passed = 0;
let failed = 0;

function check(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}\n      mong đợi: ${JSON.stringify(expected)}\n      nhận được: ${JSON.stringify(actual)}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

const channel = { key: 'f_aaaaaaaa', name: 'Kênh', type: 'select', options: ['Facebook', 'TikTok'], order: 0 };
const budget = { key: 'f_bbbbbbbb', name: 'Ngân sách', type: 'number', order: 1 };
const release = { key: 'f_cccccccc', name: 'Ngày phát hành', type: 'date', order: 2 };
const note = { key: 'f_dddddddd', name: 'Ghi chú', type: 'text', order: 3 };

section('Thứ tự');
check('Theo order, không theo thứ tự lưu', sortedFields({ customFields: [note, channel, release, budget] }).map((f) => f.key),
  [channel.key, budget.key, release.key, note.key]);
check('Dự án chưa có trường / chưa populate', sortedFields({}), []);
check('Không có dự án', sortedFields(null), []);

section('Định dạng giá trị');
check('Chọn một: nguyên văn', formatCustomValue(channel, 'TikTok'), 'TikTok');
check('Số: phân cách hàng nghìn kiểu Việt', formatCustomValue(budget, 15000000), '15.000.000');
check('Số thập phân', formatCustomValue(budget, 1.5), '1,5');
check('Ngày: dd/mm/yyyy theo phần ngày của ISO, không lệch múi giờ', formatCustomValue(release, '2026-11-20T00:00:00.000Z'), '20/11/2026');
check('Văn bản', formatCustomValue(note, 'Ưu tiên video'), 'Ưu tiên video');
check('Chưa có giá trị → chuỗi rỗng', [formatCustomValue(note, undefined), formatCustomValue(budget, null), formatCustomValue(note, '')], ['', '', '']);
check('Số 0 vẫn là một giá trị', formatCustomValue(budget, 0), '0');

section('Cột CSV');
{
  const projects = [
    { _id: 'p1', customFields: [budget, channel] },
    { _id: 'p2', customFields: [{ ...channel, key: 'f_eeeeeeee', name: ' kênh ' }, note] },
    { _id: 'p3', customFields: [release] },
  ];
  const tasks = [
    { project: { _id: 'p1' }, customValues: { [channel.key]: 'Facebook', [budget.key]: 2000 } },
    { project: 'p2', customValues: { f_eeeeeeee: 'TikTok', [note.key]: 'x' } },
  ];
  const { headers, cells } = customCsvColumns(tasks, projects);
  check('Một cột cho mỗi tên trường của các dự án có việc trong file; trùng tên dồn chung', headers, ['Kênh', 'Ngân sách', 'Ghi chú']);
  check('Ô theo đúng trường của dự án chứa việc', tasks.map(cells), [['Facebook', '2.000', ''], ['TikTok', '', 'x']]);
  check('Không có trường nào thì không có cột', customCsvColumns([{ project: 'p9' }], projects).headers, []);
}

section('Tham số lọc');
check('Chỉ giữ ô đã chọn, đúng dạng cf_<key>', customFilterParams({ [channel.key]: 'TikTok', f_eeeeeeee: undefined, f_ffffffff: '' }),
  { [`cf_${channel.key}`]: 'TikTok' });
check('Không lọc gì', customFilterParams(undefined), {});

console.log(`\n  ${passed} đạt, ${failed} hỏng`);
process.exit(failed ? 1 : 0);
