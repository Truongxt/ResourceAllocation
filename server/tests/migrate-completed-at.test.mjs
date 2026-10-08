/**
 * Kiểm thử đơn vị cho quyết định của `src/utils/migrate-completed-at.js`.
 * Không cần server hay database.
 *
 * Trước `152df0e`, đường `PUT /tasks/:id` (cả kéo thẻ Kanban) chuyển việc sang Hoàn thành mà
 * không ghi `completedAt`, nên báo cáo kết quả theo người xếp các việc đó vào "xong nhưng
 * không có mốc". Bộ này chốt: mốc lấy từ dấu vết đáng tin (`reviewRequestedAt`, rồi nhật ký
 * hoạt động); không suy ra được thì báo ra để người chạy quyết, KHÔNG đoán bằng `updatedAt`.
 */
import { createRequire } from 'module';
import { ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { planCompletedAtBackfill } = require('../src/utils/migrate-completed-at');

const t = (h) => new Date(`2026-09-10T${String(h).padStart(2, '0')}:00:00.000Z`);
const task = (id, extra = {}) => ({ _id: id, title: `Việc ${id}`, status: 'done', completedAt: null, ...extra });
const log = (entityId, h, action, details = {}) => ({ entityId, createdAt: t(h), action, details });
const fixOf = (plan, id) => plan.fixes.find((f) => f.id === id);
const unresolvedOf = (plan, id) => plan.unresolved.find((u) => u.id === id);

S('Nguồn mốc thời gian');
{
  const tasks = [
    task('patch'),
    task('put'),
    task('review', { reviewRequestedAt: t(8) }),
    task('approved'),
  ];
  const logs = [
    log('patch', 9, 'UPDATE_TASK_STATUS', { oldStatus: 'in_progress', newStatus: 'done' }),
    log('put', 7, 'UPDATE_TASK', { status: 'in_progress' }),
    log('put', 10, 'UPDATE_TASK', { status: 'done' }),
    log('put', 12, 'UPDATE_TASK', { status: 'done' }), // sửa tên sau khi đã xong
    log('review', 11, 'TASK_REVIEW_APPROVED', { decision: 'approved' }),
    log('approved', 13, 'TASK_REVIEW_APPROVED', { decision: 'approved' }),
  ];
  const plan = planCompletedAtBackfill({ tasks, logs });
  ok(+fixOf(plan, 'patch')?.completedAt === +t(9), 'PATCH status sang done → giờ của bản ghi đó');
  ok(+fixOf(plan, 'put')?.completedAt === +t(10), 'PUT: lần đầu tiên vào done, không phải lần sửa sau đó', fixOf(plan, 'put')?.completedAt);
  ok(+fixOf(plan, 'review')?.completedAt === +t(8) && fixOf(plan, 'review')?.source === 'reviewRequestedAt',
    'Có reviewRequestedAt → dùng nó (đúng quy ước: mốc báo hoàn thành, không phải mốc duyệt)');
  ok(+fixOf(plan, 'approved')?.completedAt === +t(13), 'Chỉ có bản ghi duyệt → giờ duyệt');
}

S('Mở lại rồi xong lần nữa');
{
  const tasks = [task('again')];
  const logs = [
    log('again', 9, 'UPDATE_TASK_STATUS', { newStatus: 'done' }),
    log('again', 10, 'UPDATE_TASK_STATUS', { newStatus: 'in_progress' }),
    log('again', 14, 'UPDATE_TASK', { status: 'done' }),
  ];
  const plan = planCompletedAtBackfill({ tasks, logs: [...logs].reverse() }); // thứ tự đầu vào không quan trọng
  ok(+fixOf(plan, 'again')?.completedAt === +t(14), 'Lấy lần xong cuối cùng, không phải lần đầu');
}

S('Không đoán');
{
  const tasks = [
    task('nolog', { updatedAt: t(20) }),
    task('stale'),
  ];
  const logs = [
    // Nhật ký kết thúc ở một trạng thái khác done: dấu vết không khớp với hiện tại.
    log('stale', 9, 'UPDATE_TASK_STATUS', { newStatus: 'done' }),
    log('stale', 10, 'TASK_MARKED_FAILED', { newStatus: 'failed' }),
  ];
  const plan = planCompletedAtBackfill({ tasks, logs });
  ok(!fixOf(plan, 'nolog') && unresolvedOf(plan, 'nolog'), 'Không có nhật ký → báo ra, không dùng updatedAt');
  ok(!fixOf(plan, 'stale') && /không khớp/.test(unresolvedOf(plan, 'stale')?.reason || ''),
    'Nhật ký kết thúc ở trạng thái khác → báo ra', unresolvedOf(plan, 'stale')?.reason);
}

S('Chỉ đụng việc cần sửa');
{
  const tasks = [
    task('has', { completedAt: t(5) }),
    task('open', { status: 'in_progress' }),
  ];
  const logs = [log('has', 9, 'UPDATE_TASK_STATUS', { newStatus: 'done' })];
  const plan = planCompletedAtBackfill({ tasks, logs });
  ok(plan.fixes.length === 0 && plan.unresolved.length === 0, 'Đã có completedAt hoặc chưa xong → bỏ qua');
}

process.exit(summary() === 0 ? 0 : 1);
