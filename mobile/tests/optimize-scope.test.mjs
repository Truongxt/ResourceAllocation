// Phạm vi tối ưu hóa trên mobile.
// Chạy: cd mobile && npm test
//
// `src/utils/optimizeScope.js` là bản chép nguyên của `client/src/utils/optimizeScope.js` —
// logic đã có bộ test riêng bên client (`client/tests/optimize-scope.test.mjs`). Ở đây chỉ
// khóa hai bản không lệch nhau: lệch thì PM thấy dự án trên điện thoại mà chạy nhận 403.

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const normalize = (s) => s.replace(/\r\n/g, '\n');
const mobile = normalize(readFileSync(path.join(dir, '..', 'src', 'utils', 'optimizeScope.js'), 'utf8'));
const web = normalize(readFileSync(path.join(dir, '..', '..', 'client', 'src', 'utils', 'optimizeScope.js'), 'utf8'));

if (mobile === web) {
  console.log('\nHai bản optimizeScope.js giống hệt nhau\n  ✓ mobile/src/utils/optimizeScope.js = client/src/utils/optimizeScope.js');
  console.log('\n  1 đạt, 0 hỏng');
} else {
  console.log('\nHai bản optimizeScope.js giống hệt nhau\n  ✗ sửa bên nào thì chép sang bên kia');
  console.log('\n  0 đạt, 1 hỏng');
  process.exit(1);
}
