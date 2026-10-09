// Các file logic mobile chép nguyên từ web.
// Chạy: cd mobile && npm test
//
// Logic của chúng đã có bộ test riêng bên client (`client/tests/*.test.mjs`). Ở đây chỉ khóa
// hai bản không lệch nhau: lệch thì điện thoại bày nút mà bấm vào nhận 403, hoặc giấu nút
// người dùng có quyền bấm. Sửa bên nào thì chép sang bên kia.
//
// `gantt.js` được kiểm riêng trong `gantt.test.mjs`.

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const normalize = (s) => s.replace(/\r\n/g, '\n');
const read = (...parts) => normalize(readFileSync(path.join(dir, ...parts), 'utf8'));

const COPIES = ['optimizeScope.js', 'attachmentRules.js'];

let failed = 0;
console.log('\nBản chép từ web giống hệt bản gốc');
for (const name of COPIES) {
  const same = read('..', 'src', 'utils', name) === read('..', '..', 'client', 'src', 'utils', name);
  if (!same) failed += 1;
  console.log(`  ${same ? '✓' : '✗'} mobile/src/utils/${name} = client/src/utils/${name}`);
}
console.log(`\n  ${COPIES.length - failed} đạt, ${failed} hỏng`);
process.exit(failed ? 1 : 0);
