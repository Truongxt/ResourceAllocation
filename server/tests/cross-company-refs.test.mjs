/**
 * Tham chiếu chéo công ty qua id trong BODY và QUERY.
 *
 * Chốt `router.param('id')` và các guard theo bản ghi chỉ soi id trên URL. Những id
 * đi trong body/query — người được giao, người theo dõi, dự án đích, nhóm việc, quản
 * lý, thành viên… — thì mỗi controller phải tự kiểm. Ba lỗ đã gặp (nhập Excel, di
 * chuyển công việc, bảng trước/sau) đều thuộc đúng loại này.
 *
 * Cách đo: admin công ty A (đi qua được mọi chốt vai trò) gửi id của công ty B vào
 * từng trường. "An toàn" nghĩa là request bị từ chối (4xx) HOẶC id ngoài không được
 * lưu — kiểm trên bản ghi trả về, không chỉ trên mã trạng thái.
 */
import { call, ok, section as S, summary } from './helpers.mjs';

const stamp = Date.now();
// Phần tử thành viên dự án là `{ _id, user, role }` — `_id` đó là của chính phần tử,
// nên phải đọc `user` trước, nếu không mọi phép so khớp thành viên đều sai.
const idOf = (v) => (v && typeof v === 'object' ? (v.user ? idOf(v.user) : String(v._id || '')) : String(v || ''));
const has = (val, id) => (Array.isArray(val) ? val.some((v) => idOf(v) === id) : idOf(val) === id);

/** An toàn = bị từ chối, hoặc có trả về bản ghi mà bản ghi không chứa id ngoài. */
const safe = (label, res, stored) => {
  const rejected = res.status >= 400 && res.status < 500;
  const leaked = !rejected && stored(res);
  ok(rejected || !leaked, label, `status=${res.status}${leaked ? ' — ĐÃ LƯU id công ty khác' : ''}`);
};

// ── Công ty A (dữ liệu mẫu) ─────────────────────────────────────────
const adminA = await call('POST', '/auth/login', { body: { email: 'admin@rao.com', password: 'password123' } });
const TA = adminA.data.token;
const aProjects = (await call('GET', '/projects', { token: TA })).data.projects;
const ecom = aProjects.find((p) => p.code === 'ECOM-01');
const aTask = (await call('POST', '/tasks', {
  token: TA, body: { title: `A ${stamp}`, project: ecom._id, startDate: '2026-11-02', endDate: '2026-11-06', estimatedHours: 4 },
})).data.task;
const aDept = (await call('GET', '/departments', { token: TA })).data.departments[0];
const aRes = (await call('GET', '/resources', { token: TA })).data.resources[0];

// ── Công ty B (dựng mới) ─────────────────────────────────────────────
const companyB = `Công ty B refs ${stamp}`;
const regB = await call('POST', '/auth/register', {
  body: { name: 'Chủ B', email: `refs.${stamp}@b.com`, password: 'password123', companyName: companyB },
});
const TB = regB.data.token;
const bUser = String(regB.data.user._id);
const bProj = String((await call('POST', '/projects', {
  token: TB, body: { name: `B ${stamp}`, startDate: '2026-11-01', endDate: '2026-12-01' },
})).data.project._id);
const bTask = String((await call('POST', '/tasks', {
  token: TB, body: { title: `B ${stamp}`, project: bProj, assignee: bUser, startDate: '2026-11-02', endDate: '2026-11-06', estimatedHours: 8 },
})).data.task._id);
const bGroup = String((await call('POST', '/task-groups', { token: TB, body: { name: `Nhóm B ${stamp}`, project: bProj } })).data.group._id);
const bDept = String((await call('GET', '/departments', { token: TB })).data.departments[0]._id);

ok(!!(aTask && bUser && bProj && bTask && bGroup && bDept), 'Dựng đủ dữ liệu hai công ty');

// ══════════════════════════════════════════════
S('Công việc — tạo và sửa');
{
  const base = { project: ecom._id, startDate: '2026-11-02', endDate: '2026-11-03' };
  const t = (res) => res.data?.task || {};
  safe('POST /tasks — assignee của B', await call('POST', '/tasks', { token: TA, body: { ...base, title: `x1 ${stamp}`, assignee: bUser } }), (r) => has(t(r).assignee, bUser));
  safe('POST /tasks — followers của B', await call('POST', '/tasks', { token: TA, body: { ...base, title: `x2 ${stamp}`, followers: [bUser] } }), (r) => has(t(r).followers, bUser));
  safe('POST /tasks — reviewers của B', await call('POST', '/tasks', { token: TA, body: { ...base, title: `x3 ${stamp}`, reviewers: [bUser] } }), (r) => has(t(r).reviewers, bUser));
  safe('POST /tasks — taskGroup của B', await call('POST', '/tasks', { token: TA, body: { ...base, title: `x4 ${stamp}`, taskGroup: bGroup } }), (r) => has(t(r).taskGroup, bGroup));
  safe('POST /tasks — parentTask của B', await call('POST', '/tasks', { token: TA, body: { ...base, title: `x5 ${stamp}`, parentTask: bTask } }), (r) => has(t(r).parentTask, bTask));

  const put = (body) => call('PUT', `/tasks/${aTask._id}`, { token: TA, body });
  safe('PUT /tasks/:id — assignee của B', await put({ assignee: bUser }), (r) => has(t(r).assignee, bUser));
  safe('PUT /tasks/:id — followers của B', await put({ followers: [bUser] }), (r) => has(t(r).followers, bUser));
  safe('PUT /tasks/:id — reviewers của B', await put({ reviewers: [bUser] }), (r) => has(t(r).reviewers, bUser));
  safe('PUT /tasks/:id — taskGroup của B', await put({ taskGroup: bGroup }), (r) => has(t(r).taskGroup, bGroup));
  safe('PUT /tasks/:id — parentTask của B', await put({ parentTask: bTask }), (r) => has(t(r).parentTask, bTask));
  safe('PUT /tasks/:id — project của B', await put({ project: bProj }), (r) => has(t(r).project, bProj));
}

// ══════════════════════════════════════════════
S('Công việc — thao tác phụ');
{
  const after = async () => (await call('GET', `/tasks/${aTask._id}`, { token: TA })).data?.task || {};
  const fol = await call('POST', `/tasks/${aTask._id}/followers`, { token: TA, body: { userIds: [bUser] } });
  ok(fol.status >= 400 || !has((await after()).followers, bUser), 'POST /:id/followers — người của B', `status=${fol.status}`);

  safe('POST /:id/subtasks — assignee của B',
    await call('POST', `/tasks/${aTask._id}/subtasks`, { token: TA, body: { title: `con ${stamp}`, assignee: bUser } }),
    (r) => has(r.data?.subtask?.assignee || r.data?.task?.assignee, bUser));
  safe('POST /:id/subtasks — followers của B',
    await call('POST', `/tasks/${aTask._id}/subtasks`, { token: TA, body: { title: `con2 ${stamp}`, followers: [bUser] } }),
    (r) => has(r.data?.subtask?.followers || r.data?.task?.followers, bUser));
  safe('POST /:id/checklist — assignee của B',
    await call('POST', `/tasks/${aTask._id}/checklist`, { token: TA, body: { title: `mục ${stamp}`, assignee: bUser } }),
    (r) => has(r.data?.item?.assignee, bUser));

  safe('POST /:id/duplicate — targetProjectId của B',
    await call('POST', `/tasks/${aTask._id}/duplicate`, { token: TA, body: { targetProjectId: bProj } }),
    (r) => has(r.data?.task?.project, bProj));
  safe('POST /:id/duplicate — targetTaskGroupId của B',
    await call('POST', `/tasks/${aTask._id}/duplicate`, { token: TA, body: { targetTaskGroupId: bGroup } }),
    (r) => has(r.data?.task?.taskGroup, bGroup));

  const nam = (await call('POST', '/auth/login', { body: { email: 'nam.tran@rao.com', password: 'password123' } })).data.user._id;
  const handOver = await call('POST', '/tasks/bulk-reassign', { token: TA, body: { fromUserId: nam, toUserId: bUser } });
  const onB = ((await call('GET', `/tasks?project=${ecom._id}&limit=100`, { token: TA })).data?.tasks || []).filter((x) => has(x.assignee, bUser));
  ok(handOver.status >= 400 || onB.length === 0, 'POST /bulk-reassign — giao việc của A cho người của B', `status=${handOver.status}, ${onB.length} việc`);

  const steal = await call('POST', '/tasks/bulk-reassign', { token: TA, body: { fromUserId: bUser, toUserId: nam } });
  const bAfter = (await call('GET', `/tasks/${bTask}`, { token: TB })).data?.task;
  ok(has(bAfter?.assignee, bUser), 'POST /bulk-reassign — không kéo được việc của B về người của A', `status=${steal.status}`);

  const preview = await call('GET', `/tasks/reassign-preview?fromUserId=${bUser}`, { token: TA });
  ok(preview.status >= 400 || !JSON.stringify(preview.data || {}).includes(bTask), 'GET /reassign-preview — không lộ việc của B', `status=${preview.status}`);
}

// ══════════════════════════════════════════════
S('Công việc — bộ lọc danh sách');
for (const [q, label] of [
  [`project=${bProj}`, 'project của B'],
  [`assignee=${bUser}`, 'assignee của B'],
  [`parentTask=${bTask}&includeSubtasks=true`, 'parentTask của B'],
]) {
  const r = await call('GET', `/tasks?${q}`, { token: TA });
  ok(!JSON.stringify(r.data || {}).includes(`B ${stamp}`), `GET /tasks?${label} — không lộ việc của B`, `status=${r.status}`);
}

// ══════════════════════════════════════════════
S('Dự án');
{
  const p = (r) => r.data?.project || {};
  const mk = (extra) => call('POST', '/projects', { token: TA, body: { name: `P ${stamp} ${Math.random()}`, startDate: '2026-11-01', endDate: '2026-12-01', ...extra } });
  safe('POST /projects — manager là người của B', await mk({ manager: bUser }), (r) => has(p(r).manager, bUser));
  safe('POST /projects — thành viên là người của B', await mk({ members: [{ user: bUser, role: 'developer' }] }), (r) => has(p(r).members, bUser));
  safe('POST /projects — phòng ban của B', await mk({ department: bDept }), (r) => has(p(r).department, bDept));

  const put = (body) => call('PUT', `/projects/${ecom._id}`, { token: TA, body });
  safe('PUT /projects/:id — manager của B', await put({ manager: bUser }), (r) => has(p(r).manager, bUser));
  safe('PUT /projects/:id — thành viên của B', await put({ members: [{ user: bUser, role: 'developer' }] }), (r) => has(p(r).members, bUser));
  safe('PUT /projects/:id — phòng ban của B', await put({ department: bDept }), (r) => has(p(r).department, bDept));
  safe('PATCH /quick-edit — manager của B', await call('PATCH', `/projects/${ecom._id}/quick-edit`, { token: TA, body: { manager: bUser } }), (r) => has(p(r).manager, bUser));
  safe('PATCH /quick-edit — phòng ban của B', await call('PATCH', `/projects/${ecom._id}/quick-edit`, { token: TA, body: { department: bDept } }), (r) => has(p(r).department, bDept));
  safe('POST /projects/:id/members — người của B', await call('POST', `/projects/${ecom._id}/members`, { token: TA, body: { user: bUser, role: 'developer' } }), (r) => has(p(r).members, bUser));
  safe('PATCH /permissions — người duyệt của B',
    await call('PATCH', `/projects/${ecom._id}/permissions`, { token: TA, body: { reviewConfig: { enabled: true, reviewers: [bUser] } } }),
    (r) => has(r.data?.reviewConfig?.reviewers, bUser));
}

// ══════════════════════════════════════════════
S('Nhân sự, tài khoản, phòng ban');
{
  safe('POST /resources — gắn User của B',
    await call('POST', '/resources', { token: TA, body: { user: bUser, position: 'Dev', department: aDept.name } }),
    (r) => has(r.data?.resource?.user, bUser));
  safe('PUT /resources/:id — đổi user sang người của B',
    await call('PUT', `/resources/${aRes._id}`, { token: TA, body: { user: bUser } }), (r) => has(r.data?.resource?.user, bUser));

  // Tự chuyển công ty bằng hồ sơ cá nhân: đổi được là nhảy sang tenant khác
  const made = await call('POST', '/auth/users', {
    token: TA, body: { name: 'Thử hồ sơ', email: `hop.${stamp}@a.com`, password: 'password123', role: 'member', department: aDept.name, position: 'Dev' },
  });
  const hopper = await call('POST', '/auth/login', { body: { email: `hop.${stamp}@a.com`, password: 'password123' } });
  safe('PUT /auth/profile — quản lý trực tiếp là người của B',
    await call('PUT', '/auth/profile', { token: hopper.data?.token, body: { manager: bUser } }), (r) => has(r.data?.user?.manager, bUser));
  const madeId = made.data?.user?._id;
  safe('PUT /auth/users/:id/manager — quản lý là người của B',
    await call('PUT', `/auth/users/${madeId}/manager`, { token: TA, body: { managerId: bUser } }), (r) => has(r.data?.user?.manager, bUser));
  safe('POST /auth/users — quản lý là người của B',
    await call('POST', '/auth/users', { token: TA, body: { name: 'Thử 2', email: `mgr.${stamp}@a.com`, password: 'password123', role: 'member', department: aDept.name, position: 'Dev', manager: bUser } }),
    (r) => has(r.data?.user?.manager, bUser));

  const d = (r) => r.data?.department || {};
  safe('POST /departments — trưởng phòng là người của B',
    await call('POST', '/departments', { token: TA, body: { name: `PB ${stamp}`, code: `X${String(stamp).slice(-4)}`, managers: [bUser] } }), (r) => has(d(r).managers, bUser));
  safe('POST /departments — companyName của B',
    await call('POST', '/departments', { token: TA, body: { name: `PB2 ${stamp}`, code: `Y${String(stamp).slice(-4)}`, companyName: companyB } }), (r) => d(r).companyName === companyB);
  safe('PUT /departments/:id — trưởng phòng là người của B',
    await call('PUT', `/departments/${aDept._id}`, { token: TA, body: { managers: [bUser] } }), (r) => has(d(r).managers, bUser));
}

// ══════════════════════════════════════════════
S('Nhóm việc và việc lặp lại');
{
  safe('POST /task-groups — vào dự án của B',
    await call('POST', '/task-groups', { token: TA, body: { name: `G ${stamp}`, project: bProj } }), (r) => has(r.data?.group?.project, bProj));
  const before = ((await call('GET', `/task-groups/${bProj}`, { token: TB })).data?.groups || []).map((g) => g.order).join();
  const reorder = await call('PUT', '/task-groups/reorder', { token: TA, body: { orderedIds: [ecom._id, bGroup] } });
  const afterOrder = ((await call('GET', `/task-groups/${bProj}`, { token: TB })).data?.groups || []).map((g) => g.order).join();
  ok(reorder.status >= 400 || before === afterOrder, 'PUT /task-groups/reorder — không đụng được nhóm của B',
    `status=${reorder.status} ${before} → ${afterOrder}`);

  const rec = (extra) => call('POST', '/recurring-tasks', {
    token: TA, body: { title: `R ${stamp}`, project: ecom._id, frequency: 'weekly', daysOfWeek: [1], startDate: '2026-10-01', durationHours: 2, ...extra },
  });
  const r = (res) => res.data?.recurringTask || {};
  safe('POST /recurring-tasks — vào dự án của B', await rec({ project: bProj }), (res) => has(r(res).project, bProj));
  safe('POST /recurring-tasks — assignee của B', await rec({ assignee: bUser }), (res) => has(r(res).assignee, bUser));
  safe('POST /recurring-tasks — nhóm việc của B', await rec({ taskGroup: bGroup }), (res) => has(r(res).taskGroup, bGroup));

  const own = r(await rec({}));
  globalThis.ownRecId = own._id;
  ok(!!own._id, 'Tạo được cấu hình lặp lại hợp lệ để thử sửa');
  if (own._id) {
    const put = (body) => call('PUT', `/recurring-tasks/${own._id}`, { token: TA, body });
    safe('PUT /recurring-tasks/:id — project của B', await put({ project: bProj }), (res) => has(r(res).project, bProj));
    safe('PUT /recurring-tasks/:id — assignee của B', await put({ assignee: bUser }), (res) => has(r(res).assignee, bUser));
  }
  const list = await call('GET', `/recurring-tasks?project=${bProj}`, { token: TA });
  ok((list.data?.recurringTasks || []).every((x) => !has(x.project, bProj)), 'GET /recurring-tasks?project của B — không lộ gì');
}

// ══════════════════════════════════════════════
S('Tối ưu hóa, báo cáo, nhật ký — projectId/user của B');
{
  const run = await call('POST', '/optimization/run/genetic', { token: TA, body: { projectId: bProj, populationSize: 10, generations: 5 } });
  ok(run.status >= 400 || !JSON.stringify(run.data || {}).includes(bTask),
    'POST /optimization/run — không tối ưu trên việc của B', `status=${run.status}`);

  const ready = await call('GET', `/optimization/readiness?projectId=${bProj}`, { token: TA });
  ok(ready.status >= 400 || !(ready.data?.totalTasks > 0), 'GET /optimization/readiness — không đếm việc của B',
    `status=${ready.status} totalTasks=${ready.data?.totalTasks}`);

  // Benchmark trên "dữ liệu thật" phải thấy đúng tập mà readiness thấy. Trước đây nó
  // gọi `loadOptimizationData` không kèm người dùng: bỏ projectId thì kéo việc và nhân
  // sự của MỌI công ty; có projectId thì lọc theo công ty mặc định, nên B nhận về rỗng.
  const benchSeesOwn = async (label, token, projectId) => {
    const q = projectId ? `?projectId=${projectId}` : '';
    const own = (await call('GET', `/optimization/readiness${q}`, { token })).data || {};
    const bench = await call('POST', '/optimization/benchmark', {
      token, body: { useDatabaseData: true, projectId, populationSize: 10, maxGenerations: 5 },
    });
    const want = `(${own.totalTasks} tasks, ${own.totalResources} nhân sự)`;
    ok(own.ready && bench.status === 200 && bench.data?.datasetLabel?.includes(want), label,
      `status=${bench.status} nhận "${bench.data?.datasetLabel || bench.message}", muốn ${want}`);
  };
  await benchSeesOwn('POST /optimization/benchmark (B, tất cả dự án) — chỉ thấy dữ liệu của B', TB);
  await benchSeesOwn('POST /optimization/benchmark (B, dự án của B) — thấy việc của chính B', TB, bProj);

  const trend = await call('GET', `/analytics/workload-trend?projectId=${bProj}&from=2026-11-01&to=2026-11-30`, { token: TA });
  // Việc của B giao cho người của B — không khớp nhân sự nào của A — nên nếu lọt vào
  // thì nằm ở `excluded`, không phải trên biểu đồ. Không việc nào được phép lọt vào.
  const tr = trend.data?.trend || {};
  const counted = (tr.excluded?.unassignedTasks || 0) + (tr.excluded?.unscheduledTasks || 0) + (tr.totals || []).length;
  ok(trend.status >= 400 || counted === 0, 'GET /analytics/workload-trend — không tính việc của B',
    `status=${trend.status} excluded=${JSON.stringify(tr.excluded || {})}`);

  const logs = await call('GET', `/activity-logs?user=${bUser}`, { token: TA });
  ok((logs.data?.logs || []).length === 0, 'GET /activity-logs?user của B — không lộ nhật ký của B', `${(logs.data?.logs || []).length} bản ghi`);
}

// ══════════════════════════════════════════════
// Để CUỐI CÙNG: mỗi bài nếu lỗ còn sẽ chuyển hẳn một bản ghi sang công ty B, nên
// đặt sớm thì kéo đổ các bài sau. Mỗi bài dùng một bản ghi riêng.
S('Chuyển bản ghi sang công ty khác qua companyName');
{
  const mkUser = async (tag) => {
    const email = `${tag}.${stamp}@a.com`;
    const made = await call('POST', '/auth/users', {
      token: TA, body: { name: tag, email, password: 'password123', role: 'member', department: aDept.name, position: 'Dev' },
    });
    const login = await call('POST', '/auth/login', { body: { email, password: 'password123' } });
    return { id: made.data?.user?._id, token: login.data?.token };
  };
  const self = await mkUser('selfhop');
  safe('PUT /auth/profile — TỰ đổi companyName sang công ty B (nhảy tenant)',
    await call('PUT', '/auth/profile', { token: self.token, body: { companyName: companyB } }), (r) => r.data?.user?.companyName === companyB);
  const moved = await mkUser('adminhop');
  safe('PUT /auth/users/:id/profile — admin đổi companyName nhân viên sang B',
    await call('PUT', `/auth/users/${moved.id}/profile`, { token: TA, body: { companyName: companyB } }), (r) => r.data?.user?.companyName === companyB);

  safe('PUT /tasks/:id — companyName của B',
    await call('PUT', `/tasks/${aTask._id}`, { token: TA, body: { companyName: companyB } }), (r) => r.data?.task?.companyName === companyB);
  safe('PUT /resources/:id — companyName của B',
    await call('PUT', `/resources/${aRes._id}`, { token: TA, body: { companyName: companyB } }), (r) => r.data?.resource?.companyName === companyB);
  if (globalThis.ownRecId) {
    safe('PUT /recurring-tasks/:id — companyName của B',
      await call('PUT', `/recurring-tasks/${globalThis.ownRecId}`, { token: TA, body: { companyName: companyB } }), (r) => r.data?.recurringTask?.companyName === companyB);
  }
  safe('PUT /departments/:id — companyName của B',
    await call('PUT', `/departments/${aDept._id}`, { token: TA, body: { companyName: companyB } }), (r) => r.data?.department?.companyName === companyB);
  safe('PUT /projects/:id — companyName của B (chuyển cả dự án)',
    await call('PUT', `/projects/${ecom._id}`, { token: TA, body: { companyName: companyB } }), (r) => r.data?.project?.companyName === companyB);
}

process.exit(summary() ? 1 : 0);
