// Logic thuần của màn Gantt trên mobile.
// Chạy: cd mobile && npm test
//
// `src/utils/gantt.js` là bản chép nguyên của `client/src/utils/gantt.js` (CPM, mốc, thời
// lượng) — đã có bộ test riêng bên client. Ở đây chỉ khóa hai điều: hai bản không lệch nhau,
// và phần bố cục chỉ mobile có (`ganttLayout.js`).

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildGanttLayout } from '../src/utils/ganttLayout.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

function check(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(
      `  ✗ ${label}\n      mong đợi: ${JSON.stringify(expected)}\n      nhận được: ${JSON.stringify(actual)}`
    );
  }
}

function section(title) {
  console.log(`\n${title}`);
}

const day = (d) => new Date(2026, 2, d, 9, 30); // 09:30 giờ địa phương, tháng 3/2026
const task = (id, from, to, extra = {}) => ({
  _id: id,
  title: `Việc ${id}`,
  startDate: from === null ? null : day(from),
  endDate: to === null ? null : day(to),
  ...extra,
});

// ──────────────────────────────────────────────
section('Hai bản gantt.js giống hệt nhau');
{
  const normalize = (s) => s.replace(/\r\n/g, '\n');
  const mobile = normalize(readFileSync(path.join(dir, '..', 'src', 'utils', 'gantt.js'), 'utf8'));
  const web = normalize(readFileSync(path.join(dir, '..', '..', 'client', 'src', 'utils', 'gantt.js'), 'utf8'));
  check('mobile/src/utils/gantt.js = client/src/utils/gantt.js (sửa bên nào thì chép sang bên kia)', mobile === web, true);
}

// ──────────────────────────────────────────────
section('Trục thời gian');
{
  const layout = buildGanttLayout([task('A', 5, 8), task('B', 10, 12)], { dayWidth: 10, today: day(9), padDays: 1 });
  check('Bắt đầu trước việc sớm nhất padDays ngày, ở đầu ngày', layout.start.getTime(), new Date(2026, 2, 4).getTime());
  check('Bao trọn việc muộn nhất cộng padDays', layout.totalDays, 9);
  check('Chiều rộng = số ngày × dayWidth', layout.width, 90);
  check('Vạch hôm nay ở giữa ngày hôm nay', layout.todayOffset, 55);

  const far = buildGanttLayout([task('A', 5, 8)], { dayWidth: 10, today: day(20), padDays: 1 });
  check('Hôm nay nằm ngoài khoảng các việc thì trục kéo dài tới hôm nay', far.totalDays, 17);
}

// ──────────────────────────────────────────────
section('Thanh việc');
{
  const layout = buildGanttLayout(
    [task('B', 10, 12), task('A', 5, 8), task('M', 7, 7)],
    { dayWidth: 10, today: day(5), padDays: 0 }
  );
  check('Xếp theo ngày bắt đầu', layout.rows.map((r) => r.task._id), ['A', 'M', 'B']);
  const a = layout.rows[0];
  check('Vị trí và độ rộng theo ngày (giờ trong ngày không làm lệch)', [a.left, a.width], [0, 30]);
  const m = layout.rows[1];
  check('Bắt đầu và kết thúc cùng ngày là mốc', m.milestone, true);
  check('Mốc đặt ở giữa ngày của nó', m.left, 25);
  check('Thanh ngắn vẫn đủ rộng để chạm', buildGanttLayout([task('S', 5, 6)], { dayWidth: 4, today: day(5) }).rows[0].width, 24);
}

// ──────────────────────────────────────────────
section('Việc chưa có lịch');
{
  const layout = buildGanttLayout(
    [task('A', 5, 8), task('X', null, 8), task('Y', 5, null), task('Z', null, null)],
    { dayWidth: 10, today: day(5) }
  );
  check('Thiếu ngày thì không vẽ thanh', layout.rows.map((r) => r.task._id), ['A']);
  check('…mà vào danh sách chưa có lịch, không biến mất', layout.unscheduled.map((t) => t._id), ['X', 'Y', 'Z']);

  const empty = buildGanttLayout([task('Z', null, null)], { dayWidth: 10, today: day(5) });
  check('Không việc nào có lịch: không hàng nào, trục vẫn có hôm nay', [empty.rows.length, empty.totalDays > 0], [0, true]);
}

console.log(`\n  ${passed} đạt, ${failed} hỏng`);
process.exit(failed ? 1 : 0);
