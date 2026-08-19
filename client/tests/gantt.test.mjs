// Kiểm thử logic thuần của sơ đồ Gantt (CPM, mốc, thời lượng).
// Chạy: cd client && npm test
//
// Không cần framework: chỉ import module ESM và so sánh kết quả.

import {
  computeCriticalPath,
  durationOf,
  isMilestone,
  daysBetween,
} from '../src/utils/gantt.js';

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

/** Task rút gọn: id, số ngày, danh sách phụ thuộc. */
function task(id, days, deps = []) {
  const start = new Date('2026-01-01T00:00:00Z');
  const end = new Date(start.getTime() + days * 86400000);
  return { _id: id, startDate: start.toISOString(), endDate: end.toISOString(), dependencies: deps };
}

const sortedCritical = (result) => [...result.critical].sort();

// ──────────────────────────────────────────────
section('1. Thời lượng và mốc');
// ──────────────────────────────────────────────
check('daysBetween đếm đúng số ngày', daysBetween('2026-01-01', '2026-01-08'), 7);
check('task 5 ngày → durationOf = 5', durationOf(task('a', 5)), 5);
check('task cùng ngày → durationOf = 0', durationOf(task('a', 0)), 0);
check('task cùng ngày là mốc', isMilestone(task('a', 0)), true);
check('task nhiều ngày không phải mốc', isMilestone(task('a', 3)), false);
check('thiếu ngày → không phải mốc', isMilestone({ _id: 'a' }), false);
check(
  'thiếu ngày → ước lượng từ estimatedHours (20h ≈ 3 ngày)',
  durationOf({ _id: 'a', estimatedHours: 20 }),
  3
);

// ──────────────────────────────────────────────
section('2. Đường găng trên chuỗi tuần tự');
// ──────────────────────────────────────────────
{
  // A(3) → B(5) → C(2): cả ba đều găng, tổng 10 ngày.
  const result = computeCriticalPath([task('A', 3), task('B', 5, ['A']), task('C', 2, ['B'])]);
  check('chuỗi tuần tự: mọi task đều găng', sortedCritical(result), ['A', 'B', 'C']);
  check('chuỗi tuần tự: độ dài = tổng thời lượng', result.length, 10);
  check('chuỗi tuần tự: không có chu trình', result.cyclic, false);
}

// ──────────────────────────────────────────────
section('3. Hai nhánh song song — chỉ nhánh dài là găng');
// ──────────────────────────────────────────────
{
  //        ┌─ B(2) ─┐
  //  A(1) ─┤        ├─ D(1)      nhánh C dài hơn → A, C, D găng; B có slack 4
  //        └─ C(6) ─┘
  const result = computeCriticalPath([
    task('A', 1),
    task('B', 2, ['A']),
    task('C', 6, ['A']),
    task('D', 1, ['B', 'C']),
  ]);
  check('chỉ nhánh dài nằm trên đường găng', sortedCritical(result), ['A', 'C', 'D']);
  check('nhánh ngắn có slack nên không găng', result.critical.has('B'), false);
  check('độ dài = 1 + 6 + 1', result.length, 8);
}

// ──────────────────────────────────────────────
section('4. Trường hợp biên');
// ──────────────────────────────────────────────
{
  const result = computeCriticalPath([]);
  check('danh sách rỗng: không có task găng', sortedCritical(result), []);
  check('danh sách rỗng: độ dài 0', result.length, 0);
}
{
  // Không có phụ thuộc: task dài nhất chính là đường găng.
  const result = computeCriticalPath([task('A', 3), task('B', 7), task('C', 5)]);
  check('không phụ thuộc: chỉ task dài nhất là găng', sortedCritical(result), ['B']);
  check('không phụ thuộc: độ dài = task dài nhất', result.length, 7);
}
{
  // A → B → A là chu trình, không tồn tại đường găng.
  const result = computeCriticalPath([task('A', 3, ['B']), task('B', 2, ['A'])]);
  check('chu trình được phát hiện', result.cyclic, true);
  check('chu trình: không trả về task găng nào', sortedCritical(result), []);
}
{
  // Dependency trỏ ra ngoài tập đang tải (do lọc/phân trang) phải bị bỏ qua.
  const result = computeCriticalPath([task('A', 4, ['NGOAI_TAP']), task('B', 2)]);
  check('bỏ qua dependency trỏ ra ngoài tập', sortedCritical(result), ['A']);
  check('bỏ qua dependency ngoài tập: vẫn tính được độ dài', result.length, 4);
}
{
  // Dependency đã populate thành object { _id, title } cũng phải nhận ra.
  const b = task('B', 2, [{ _id: 'A', title: 'Task A' }]);
  const result = computeCriticalPath([task('A', 3), b]);
  check('nhận dependency đã populate', sortedCritical(result), ['A', 'B']);
}
{
  // Mốc (thời lượng 0) không kéo dài lịch nhưng vẫn nằm trên chuỗi.
  const result = computeCriticalPath([task('A', 4), task('M', 0, ['A'])]);
  check('mốc nằm trên đường găng', sortedCritical(result), ['A', 'M']);
  check('mốc không làm dài thêm lịch', result.length, 4);
}

// ──────────────────────────────────────────────
console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} đạt, ${failed} lỗi\n`);
process.exit(failed === 0 ? 0 : 1);
