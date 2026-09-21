// Kiểm thử logic thuần của sơ đồ Gantt (CPM, mốc, thời lượng).
// Chạy: cd client && npm test
//
// Không cần framework: chỉ import module ESM và so sánh kết quả.

import {
  computeCriticalPath,
  durationOf,
  invalidPredecessors,
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
section('5. Lựa chọn tiền nhiệm hợp lệ (chặn vòng lặp)');
// ──────────────────────────────────────────────
const sorted = (set) => [...set].sort();
{
  // A → B → C. Chọn tiền nhiệm cho A: B và C đều nằm sau A nên đều tạo vòng lặp.
  const chain = [task('A', 3), task('B', 2, ['A']), task('C', 2, ['B'])];
  check('chính nó luôn bị loại', invalidPredecessors(chain, 'A').has('A'), true);
  check('loại cả hậu duệ trực tiếp và gián tiếp', sorted(invalidPredecessors(chain, 'A')), [
    'A',
    'B',
    'C',
  ]);
  check('task cuối chuỗi chỉ loại chính nó', sorted(invalidPredecessors(chain, 'C')), ['C']);
  check('task giữa chuỗi loại chính nó và hậu duệ', sorted(invalidPredecessors(chain, 'B')), [
    'B',
    'C',
  ]);
}
{
  // Nhánh rẽ: A → B, A → C, B → D. Với A thì mọi task còn lại đều là hậu duệ.
  const branched = [
    task('A', 1),
    task('B', 1, ['A']),
    task('C', 1, ['A']),
    task('D', 1, ['B']),
  ];
  check('nhánh rẽ: loại toàn bộ hậu duệ', sorted(invalidPredecessors(branched, 'A')), [
    'A',
    'B',
    'C',
    'D',
  ]);
  check('hai nhánh độc lập không loại nhau', invalidPredecessors(branched, 'C').has('B'), false);
}
{
  const isolated = [task('A', 1), task('B', 1)];
  check('không có phụ thuộc: chỉ loại chính nó', sorted(invalidPredecessors(isolated, 'A')), ['A']);
  check('không truyền taskId: không loại gì', sorted(invalidPredecessors(isolated, null)), []);
}
{
  // Dependency đã populate thành object cũng phải lần được.
  const populated = [task('A', 1), task('B', 1, [{ _id: 'A', title: 'Task A' }])];
  check('nhận dependency đã populate', sorted(invalidPredecessors(populated, 'A')), ['A', 'B']);
}

// ──────────────────────────────────────────────
section('6. Loại quan hệ phụ thuộc');
// ──────────────────────────────────────────────
{
  // Dữ liệu cũ (mảng id phẳng) phải cho kết quả y hệt dạng mới khai báo
  // finish_to_start — đó là điều kiện để migration không làm đổi bất kỳ sơ đồ nào.
  const cu = computeCriticalPath([task('A', 3), task('B', 5, ['A'])]);
  const moi = computeCriticalPath([
    task('A', 3),
    task('B', 5, [{ task: 'A', type: 'finish_to_start' }]),
  ]);
  check('dạng cũ và finish_to_start cho cùng độ dài đường găng', cu.length, moi.length);
  check('và cùng tập công việc găng', sortedCritical(cu), sortedCritical(moi));
  check('độ dài đúng bằng tổng hai thời lượng', moi.length, 8);
}
{
  // start_to_start: B bắt đầu cùng lúc A, nên tổng thời gian chỉ bằng việc dài nhất.
  const result = computeCriticalPath([
    task('A', 3),
    task('B', 5, [{ task: 'A', type: 'start_to_start' }]),
  ]);
  check('start_to_start: hai việc chạy song song', result.length, 5);
  // Cả hai cùng găng: A trễ một ngày thì B phải bắt đầu muộn một ngày, và dự án
  // dài thêm một ngày. Ràng buộc đặt lên mốc BẮT ĐẦU của A nên slack của A bằng 0,
  // dù A kết thúc sớm và phần đuôi của nó còn dư thời gian.
  check('trễ A vẫn kéo dài dự án nên cả hai đều găng', sortedCritical(result), ['A', 'B']);
}
{
  // finish_to_finish: B kết thúc không sớm hơn A. A dài 6, B dài 2 → B kết thúc ở 6.
  const result = computeCriticalPath([
    task('A', 6),
    task('B', 2, [{ task: 'A', type: 'finish_to_finish' }]),
  ]);
  check('finish_to_finish: chốt theo mốc kết thúc của việc trước', result.length, 6);
}
{
  // start_to_finish: B kết thúc không sớm hơn lúc A bắt đầu. A bắt đầu ở mốc 0 nên
  // ràng buộc không kéo dài gì — tổng bằng việc dài nhất.
  const result = computeCriticalPath([
    task('A', 4),
    task('B', 2, [{ task: 'A', type: 'start_to_finish' }]),
  ]);
  check('start_to_finish: ràng buộc lỏng nhất, không kéo dài dự án', result.length, 4);
}
{
  // Loại lạ (dữ liệu hỏng, client cũ) phải rơi về finish_to_start chứ không làm vỡ đồ thị.
  const result = computeCriticalPath([
    task('A', 3),
    task('B', 2, [{ task: 'A', type: 'khong_ton_tai' }]),
  ]);
  check('loại không hợp lệ rơi về finish_to_start', result.length, 5);
}
{
  // Chu trình vẫn phải bắt được bất kể loại quan hệ.
  const result = computeCriticalPath([
    task('A', 3, [{ task: 'B', type: 'start_to_start' }]),
    task('B', 2, [{ task: 'A', type: 'finish_to_finish' }]),
  ]);
  check('phát hiện chu trình dù khác loại quan hệ', result.cyclic, true);
}
{
  // Chặn vòng lặp khi chọn tiền nhiệm cũng phải đọc được dạng mới.
  const chain = [
    task('A', 1),
    task('B', 1, [{ task: 'A', type: 'start_to_start' }]),
    task('C', 1, [{ task: 'B', type: 'finish_to_start' }]),
  ];
  check('loại hậu duệ khi phụ thuộc ở dạng mới', sorted(invalidPredecessors(chain, 'A')), [
    'A',
    'B',
    'C',
  ]);
}
{
  // Dạng mới mà `task` đã populate thành document.
  const populated = [
    task('A', 1),
    task('B', 1, [{ task: { _id: 'A', title: 'Task A' }, type: 'finish_to_start' }]),
  ];
  check('nhận dạng mới đã populate', sorted(invalidPredecessors(populated, 'A')), ['A', 'B']);
}

// ──────────────────────────────────────────────
console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} đạt, ${failed} lỗi\n`);
process.exit(failed === 0 ? 0 : 1);
