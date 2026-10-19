// Tối ưu hóa cho PM, thu hẹp theo dự án họ quản lý.
//
// Trước đây `authorizeApp('optimize')` chặn PM ngay cửa, nên cả hai route Áp dụng /
// Hoàn tác — vốn đã khai cho PM — cũng không bao giờ tới được. Mở cửa cho PM thì phải
// khóa lại mọi lối: chạy thuật toán, xem mức sẵn sàng, benchmark trên dữ liệu thật,
// lịch sử, xem / so sánh / áp dụng / hoàn tác một kết quả. Dự án họ quản lý là dự án có
// `Project.manager` trỏ về họ — cùng định nghĩa với `middleware/taskAccess.js`.
import { call, login, ok, section, summary } from './helpers.mjs';

const admin = await login('admin@rao.com');
const pm = await login('pm@rao.com');
const member = await login('nam.tran@rao.com');

const iso = (offsetDays) => new Date(Date.now() + offsetDays * 86400000).toISOString();
const pmId = (await call('GET', '/auth/me', { token: pm })).data?.user?._id;
const projects = (await call('GET', '/projects?limit=100', { token: admin })).data?.projects || [];
// PM mẫu quản lý hai dự án; chọn dự án có việc đang mở để thuật toán có gì mà chạy.
let own = null;
for (const p of projects.filter((p) => String(p.manager?._id || p.manager) === String(pmId))) {
  const tasks = (await call('GET', `/tasks?project=${p._id}&limit=100`, { token: admin })).data?.tasks || [];
  if (tasks.some((t) => ['todo', 'in_progress', 'review'].includes(t.status))) { own = p; break; }
}

// Dự án admin quản lý, có một việc và một thành viên có hồ sơ nhân sự để thuật toán có gì mà chạy.
const users = (await call('GET', '/auth/users?limit=100', { token: admin })).data?.users || [];
const nam = users.find((u) => u.email === 'nam.tran@rao.com');
const other = (await call('POST', '/projects', {
  token: admin,
  body: { name: 'Dự án của admin', startDate: iso(0), endDate: iso(30), members: [{ user: nam?._id, role: 'developer' }] },
})).data?.project;
await call('POST', '/tasks', {
  token: admin,
  body: { title: 'Việc của admin', project: other?._id, estimatedHours: 8, startDate: iso(1), endDate: iso(3) },
});

section('Chuẩn bị');
ok(!!pmId && !!own, 'PM mẫu quản lý ít nhất một dự án', `pm=${pmId} own=${own?._id}`);

section('Số việc mở trong danh sách dự án');
{
  // Client chọn sẵn dự án có việc mở theo `taskStats.openTasks` thay vì để người dùng bấm
  // chạy rồi nhận 400 — nên con số này phải đếm đúng tập trạng thái tối ưu hóa đọc.
  const listed = (await call('GET', '/projects?limit=100', { token: pm })).data?.projects || [];
  const mismatched = [];
  for (const p of listed) {
    const tasks = (await call('GET', `/tasks?project=${p._id}&limit=100`, { token: admin })).data?.tasks || [];
    const open = tasks.filter((t) => ['todo', 'in_progress', 'review'].includes(t.status)).length;
    if (p.taskStats?.openTasks !== open) mismatched.push(`${p.code || p.name}: ${p.taskStats?.openTasks} ≠ ${open}`);
  }
  ok(listed.length > 0 && mismatched.length === 0, 'taskStats.openTasks = số việc todo/in_progress/review', mismatched.join('; '));
}
ok(!!other?._id && String(other.manager?._id || other.manager) !== String(pmId), 'Có một dự án PM không quản lý');

section('Chạy thuật toán');
{
  const noProject = await call('POST', '/optimization/run/hybrid', { token: pm, body: { maxGenerations: 5 } });
  ok(noProject.status === 403, 'PM không chọn dự án ("Tất cả dự án") → 403', `status=${noProject.status}`);
  for (const algo of ['genetic', 'csp', 'hybrid']) {
    const res = await call('POST', `/optimization/run/${algo}`, { token: pm, body: { projectId: other._id, maxGenerations: 5 } });
    ok(res.status === 403, `PM chạy ${algo} trên dự án người khác → 403`, `status=${res.status}`);
  }
  const memberRun = await call('POST', '/optimization/run/hybrid', { token: member, body: { projectId: own._id } });
  ok(memberRun.status === 403, 'Member vẫn bị chặn', `status=${memberRun.status}`);

  const readyOther = await call('GET', `/optimization/readiness?projectId=${other._id}`, { token: pm });
  ok(readyOther.status === 403, 'PM xem mức sẵn sàng của dự án người khác → 403', `status=${readyOther.status}`);
  const readyOwn = await call('GET', `/optimization/readiness?projectId=${own._id}`, { token: pm });
  ok(readyOwn.status === 200, 'PM xem mức sẵn sàng của dự án mình → 200', `status=${readyOwn.status}`);
}

section('Kết quả của PM: chạy, xem, áp dụng, hoàn tác');
const pmRun = await call('POST', '/optimization/run/hybrid', {
  token: pm, body: { projectId: own._id, populationSize: 20, maxGenerations: 10 },
});
const pmResultId = pmRun.data?.result?._id;
ok(pmRun.status === 200 && !!pmResultId, 'PM chạy Hybrid trên dự án mình → 200', `status=${pmRun.status} ${pmRun.message || ''}`);
ok((await call('GET', `/optimization/${pmResultId}`, { token: pm })).status === 200, 'PM xem kết quả của mình');
const applied = await call('POST', `/optimization/${pmResultId}/apply`, { token: pm });
ok(applied.status === 200, 'PM áp dụng kết quả trên dự án mình → 200', `status=${applied.status} ${applied.message || ''}`);
const rolled = await call('POST', `/optimization/${pmResultId}/rollback`, { token: pm });
ok(rolled.status === 200, 'PM hoàn tác → 200', `status=${rolled.status} ${rolled.message || ''}`);

section('Kết quả trên dự án người khác: không thấy, không đụng được');
{
  const adminRun = await call('POST', '/optimization/run/hybrid', {
    token: admin, body: { projectId: other._id, populationSize: 20, maxGenerations: 10 },
  });
  const adminResultId = adminRun.data?.result?._id;
  ok(adminRun.status === 200 && !!adminResultId, 'Admin chạy trên dự án của admin', `status=${adminRun.status}`);

  const history = (await call('GET', '/optimization/history', { token: pm })).data?.results || [];
  const ids = history.map((r) => String(r._id));
  ok(ids.includes(String(pmResultId)), 'Lịch sử của PM có lượt chạy của mình');
  ok(!ids.includes(String(adminResultId)), 'Lịch sử của PM không có lượt chạy trên dự án người khác');

  ok((await call('GET', `/optimization/${adminResultId}`, { token: pm })).status === 403, 'PM xem kết quả đó → 403');
  ok((await call('POST', `/optimization/${adminResultId}/apply`, { token: pm })).status === 403, 'PM áp dụng kết quả đó → 403');
  ok((await call('POST', `/optimization/${adminResultId}/rollback`, { token: pm })).status === 403, 'PM hoàn tác kết quả đó → 403');
  const cmp = await call('GET', `/optimization/compare?ids=${pmResultId},${adminResultId}`, { token: pm });
  ok(cmp.status === 403, 'PM so sánh có lẫn kết quả đó → 403', `status=${cmp.status}`);

  // Kết quả "Tất cả dự án" của admin cũng nằm ngoài phạm vi PM, dù có chứa việc của PM.
  const allRun = await call('POST', '/optimization/run/csp', { token: admin, body: {} });
  const allId = allRun.data?.result?._id;
  ok(!!allId && (await call('GET', `/optimization/${allId}`, { token: pm })).status === 403,
    'Kết quả chạy trên toàn công ty → PM bị 403', `id=${allId}`);

  const adminHistory = (await call('GET', '/optimization/history', { token: admin })).data?.results || [];
  ok(adminHistory.some((r) => String(r._id) === String(adminResultId)), 'Admin vẫn thấy như cũ');
}

section('Benchmark');
{
  const synthetic = await call('POST', '/optimization/benchmark', {
    token: pm, body: { datasetType: 'custom', customConfig: { taskCount: 6, resourceCount: 3 }, populationSize: 10, maxGenerations: 5 },
  });
  ok(synthetic.status === 200, 'PM chạy benchmark trên dữ liệu tổng hợp → 200', `status=${synthetic.status}`);
  const liveAll = await call('POST', '/optimization/benchmark', { token: pm, body: { useDatabaseData: true } });
  ok(liveAll.status === 403, 'PM benchmark dữ liệu thật của cả công ty → 403', `status=${liveAll.status}`);
  const liveOther = await call('POST', '/optimization/benchmark', { token: pm, body: { useDatabaseData: true, projectId: other._id } });
  ok(liveOther.status === 403, 'PM benchmark dữ liệu thật của dự án người khác → 403', `status=${liveOther.status}`);
}

process.exit(summary() ? 1 : 0);
