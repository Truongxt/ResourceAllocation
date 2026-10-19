/**
 * Kiểm thử đơn vị cho báo cáo kết quả theo người.
 *
 * Không cần server lẫn database: nạp thẳng hàm tính và chạy trên danh sách việc dựng
 * sẵn. Phần HTTP (phạm vi, phân quyền, lọc công ty) nằm ở bộ `performance`.
 */

import { createRequire } from 'module';
import { ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { summarizePerformance } = require('../src/analytics/performanceSummary');

const NOW = new Date(2026, 2, 15, 12);
const day = (d, h = 17) => new Date(2026, 2, d, h);
const people = [
  { _id: 'u1', name: 'An' },
  { _id: 'u2', name: 'Bình' },
  { _id: 'u3', name: 'Chi' },
];
let seq = 0;
const task = (assignee, status, endDate, extra = {}) => ({ _id: `t${++seq}`, assignee, status, endDate, ...extra });
const row = (report, id) => report.people.find((p) => String(p.user._id) === id);

S('Phân loại trạng thái');
{
  const tasks = [
    task('u1', 'done', day(10), { completedAt: day(9) }),            // đúng hạn
    task('u1', 'done', day(10), { completedAt: day(10) }),           // biên: đúng hạn
    task('u1', 'done', day(10), { completedAt: day(11) }),           // trễ
    task('u1', 'done', day(10)),                                     // không mốc
    task('u1', 'failed', day(12)),
    task('u1', 'review', day(5), { completedAt: day(6) }),           // chờ duyệt, không xét hạn
    task('u1', 'todo', day(14)),                                     // quá hạn
    task('u1', 'blocked', day(14)),                                  // quá hạn
    task('u1', 'in_progress', day(20)),                              // còn hạn
  ];
  const r = row(summarizePerformance(tasks, people, NOW), 'u1');
  ok(r.total === 9, 'Đếm đủ 9 việc', `total=${r.total}`);
  ok(r.onTime === 2 && r.late === 1 && r.doneNoTimestamp === 1 && r.done === 4,
    'done = đúng hạn + trễ + không mốc; completedAt === endDate tính đúng hạn',
    JSON.stringify({ onTime: r.onTime, late: r.late, doneNoTimestamp: r.doneNoTimestamp, done: r.done }));
  ok(r.failed === 1 && r.pendingReview === 1 && r.overdue === 2 && r.open === 1,
    'Thất bại / chờ duyệt / quá hạn (cả blocked) / còn hạn',
    JSON.stringify({ failed: r.failed, pendingReview: r.pendingReview, overdue: r.overdue, open: r.open }));
  ok(r.total === r.done + r.failed + r.pendingReview + r.overdue + r.open, 'Năm nhóm phủ hết, không chồng nhau');
  ok(r.onTimeRate === 67, 'Tỉ lệ đúng hạn = đúng / (đúng + trễ), bỏ việc không mốc', `onTimeRate=${r.onTimeRate}`);
}

S('Tỉ lệ khi không đo được');
{
  const tasks = [task('u1', 'done', day(10)), task('u1', 'todo', day(20))];
  const r = row(summarizePerformance(tasks, people, NOW), 'u1');
  ok(r.onTimeRate === null, 'Chỉ có việc không mốc → onTimeRate = null, không phải 100', `onTimeRate=${r.onTimeRate}`);
}

S('Gia hạn deadline');
{
  const tasks = [
    task('u1', 'todo', day(20), {
      deadlineHistory: [
        { oldEndDate: day(10), newEndDate: day(15) },
        { oldEndDate: day(15), newEndDate: day(20) },
        { oldEndDate: day(22), newEndDate: day(20) }, // kéo lên sớm: không phải gia hạn
      ],
    }),
  ];
  const r = row(summarizePerformance(tasks, people, NOW), 'u1');
  ok(r.extensions === 2, 'Chỉ đếm lần lùi deadline ra sau', `extensions=${r.extensions}`);
}

S('Tập người');
{
  const tasks = [
    task('u2', 'todo', day(20)),
    task({ _id: 'u2', name: 'Bình' }, 'done', day(10), { completedAt: day(9) }), // assignee đã populate
    task('nguoi-ngoai', 'done', day(10), { completedAt: day(9) }),
    task(null, 'todo', day(20)),
  ];
  const report = summarizePerformance(tasks, people, NOW);
  ok(report.people.length === 3, 'Mỗi người trong tập có đúng một dòng', `${report.people.length} dòng`);
  const c = row(report, 'u3');
  ok(c && c.total === 0 && c.onTimeRate === null, 'Người không có việc vẫn hiện, toàn số 0');
  ok(row(report, 'u2').total === 2, 'Nhận assignee dạng id lẫn dạng đã populate');
  ok(report.totals.total === 2, 'Việc của người ngoài tập và việc chưa giao bị bỏ qua', `totals.total=${report.totals.total}`);
  ok(report.people[0].user._id === 'u2', 'Người nhiều việc nhất xếp lên đầu');
}

S('Tổng');
{
  const tasks = [
    task('u1', 'done', day(10), { completedAt: day(9) }),
    task('u1', 'done', day(10), { completedAt: day(11) }),
    task('u2', 'done', day(10), { completedAt: day(9) }),
    task('u2', 'failed', day(12)),
    task('u3', 'review', day(12)),
  ];
  const { totals, people: rows } = summarizePerformance(tasks, people, NOW);
  const keys = ['total', 'done', 'onTime', 'late', 'doneNoTimestamp', 'failed', 'pendingReview', 'overdue', 'open', 'extensions'];
  ok(keys.every((k) => totals[k] === rows.reduce((s, r) => s + r[k], 0)), 'Mỗi cột tổng bằng tổng các dòng');
  ok(totals.onTimeRate === 67, 'Tỉ lệ tổng tính lại từ số đếm, không lấy trung bình các tỉ lệ', `onTimeRate=${totals.onTimeRate}`);
}

process.exit(summary() ? 1 : 0);
