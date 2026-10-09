// Kiểm thử tiện ích CSV dùng chung cho mọi nút "Xuất CSV".
// Chạy: cd client && npm test
//
// Không cần framework: chỉ import module ESM và so sánh kết quả.

import { toCsv } from '../src/utils/csv.js';

let passed = 0;
let failed = 0;

function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}\n      mong đợi: ${e}\n      nhận được: ${a}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

section('Escape');
check('Mọi ô nằm trong ngoặc kép, dòng cách nhau bằng CRLF', toCsv([['a', 'b'], ['c', 'd']]), '"a","b"\r\n"c","d"');
check('Dấu " bên trong được nhân đôi', toCsv([['Anh "Tư"']]), '"Anh ""Tư"""');
check('Dấu phẩy và xuống dòng nằm gọn trong ô', toCsv([['a, b\nc']]), '"a, b\nc"');
check('null / undefined thành ô rỗng', toCsv([[null, undefined, '']]), '"","",""');

section('Số');
check('Số giữ nguyên, kể cả số âm và số 0', toCsv([[12.5, -3, 0]]), '12.5,-3,0');

section('Chặn công thức (CSV injection)');
check('Chuỗi bắt đầu bằng = + - @ được thêm dấu \' ở đầu',
  toCsv([['=HYPERLINK("x")', '+1', '-2', '@SUM(A1)']]),
  '"\'=HYPERLINK(""x"")","\'+1","\'-2","\'@SUM(A1)"');
check('Tab và CR ở đầu cũng bị chặn', toCsv([['\tcmd', '\rcmd']]), '"\'\tcmd","\'\rcmd"');
check('Dấu = ở giữa chuỗi thì không đụng tới', toCsv([['a=b']]), '"a=b"');

console.log(`\n${failed === 0 ? '✓' : '✗'} csv: ${passed} đạt, ${failed} lỗi`);
process.exit(failed === 0 ? 0 : 1);
