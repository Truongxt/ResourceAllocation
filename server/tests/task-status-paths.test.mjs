// Mọi đường đổi trạng thái công việc phải qua cùng một chốt.
//
// `PATCH /:id/status` có ba lớp chặn (dự án bật đánh giá thì người làm không tự kết luận
// "xong"; Thất bại cần dự án bật, cần lý do, cần đúng vai). Nhưng form sửa công việc đi
// đường `PUT /:id`, và đường đó nhận `status` mà không qua lớp nào. Bộ này giữ cả hai
// đường, cộng với mốc `completedAt` mà báo cáo kết quả dựa vào để tính đúng/trễ hạn.

import { call, ok, section as S, summary } from './helpers.mjs';

const TOK = {};
let assigneeId;
let followerId;

const login = async (email) => (await call('POST', '/auth/login', { body: { email, password: 'password123' } })).data;

const mkProject = async (name, extra = {}) => {
  const proj = await call('POST', '/projects', {
    token: TOK.pm,
    body: {
      name: `${name} ${Date.now()}`, startDate: '2026-10-01', endDate: '2026-12-31',
      members: [{ user: assigneeId, role: 'developer', allocation: 100 }, { user: followerId, role: 'developer', allocation: 50 }],
    },
  });
  const id = proj.data?.project?._id;
  if (Object.keys(extra).length) await call('PATCH', `/projects/${id}/permissions`, { token: TOK.pm, body: extra });
  return id;
};

const mkTask = async (project, title) => (await call('POST', '/tasks', {
  token: TOK.pm,
  body: { title, project, assignee: assigneeId, followers: [followerId], startDate: '2026-10-05', endDate: '2026-10-15', estimatedHours: 4 },
})).data?.task?._id;

const getTask = async (id) => (await call('GET', `/tasks/${id}`, { token: TOK.pm })).data?.task;

S('Chuẩn bị dữ liệu');
{
  TOK.pm = (await login('pm@rao.com'))?.token;
  const a = await login('nam.tran@rao.com');
  TOK.assignee = a?.token;
  assigneeId = a?.user?._id;
  const f = await login('hoa.le@rao.com');
  TOK.follower = f?.token;
  followerId = f?.user?._id;
  ok(!!(TOK.pm && TOK.assignee && TOK.follower), 'Đăng nhập đủ PM, người thực hiện, người theo dõi');
}

S('PUT /:id — dự án bật đánh giá: người làm không tự kết luận "xong"');
{
  const project = await mkProject('Đường PUT — đánh giá', { reviewConfig: { enabled: true, reviewers: [], slaHours: 24 } });
  const id = await mkTask(project, 'Việc cần đánh giá');
  const res = await call('PUT', `/tasks/${id}`, { token: TOK.assignee, body: { status: 'done' } });
  ok(res.status === 400, 'Người thực hiện PUT status=done → 400', `status=${res.status}`);
  ok((await getTask(id))?.status !== 'done', 'Việc không bị chuyển sang Hoàn thành');
}

S('PUT /:id — Thất bại phải qua đủ ba lớp chặn');
{
  const off = await mkProject('Đường PUT — thất bại tắt');
  const offTask = await mkTask(off, 'Việc ở dự án tắt Thất bại');
  const disabled = await call('PUT', `/tasks/${offTask}`, { token: TOK.pm, body: { status: 'failed', failureReason: 'Hủy' } });
  ok(disabled.status === 400, 'Dự án chưa bật Thất bại → 400', `status=${disabled.status}`);

  const on = await mkProject('Đường PUT — thất bại bật', { failureConfig: { enabled: true, allowedRoles: [] } });
  const noReason = await mkTask(on, 'Việc thiếu lý do');
  const r1 = await call('PUT', `/tasks/${noReason}`, { token: TOK.pm, body: { status: 'failed' } });
  ok(r1.status === 400, 'Thiếu lý do → 400', `status=${r1.status}`);

  const notAllowed = await mkTask(on, 'Việc người làm tự đánh thất bại');
  const r2 = await call('PUT', `/tasks/${notAllowed}`, { token: TOK.assignee, body: { status: 'failed', failureReason: 'Bỏ' } });
  ok(r2.status === 403, 'Người thực hiện không nằm trong allowedRoles → 403', `status=${r2.status}`);
  ok((await getTask(notAllowed))?.status !== 'failed', 'Việc không bị chuyển sang Thất bại');
  // Ca trên 403 là nhờ `failureReason` không nằm trong các trường người làm được sửa, chứ
  // không phải nhờ chốt Thất bại. Bỏ lý do đi thì chỉ còn `status` — trường được phép.
  const bare = await call('PUT', `/tasks/${notAllowed}`, { token: TOK.assignee, body: { status: 'failed' } });
  ok(bare.status >= 400 && (await getTask(notAllowed))?.status !== 'failed',
    'Người thực hiện PUT chỉ mỗi status=failed → vẫn bị chặn', `status=${bare.status}`);

  const countFailed = async () => ((await call('GET', '/notifications?limit=100', { token: TOK.follower })).data?.notifications || [])
    .filter((n) => n.type === 'task_failed').length;
  const before = await countFailed();
  const good = await mkTask(on, 'Việc thất bại hợp lệ');
  const r3 = await call('PUT', `/tasks/${good}`, { token: TOK.pm, body: { status: 'failed', failureReason: 'Khách hủy hợp đồng' } });
  const t = await getTask(good);
  ok(r3.status === 200 && t?.status === 'failed', 'PM, có lý do, dự án bật → 200', `status=${r3.status}`);
  ok(t?.failureReason === 'Khách hủy hợp đồng' && !!t?.failedAt && !!t?.failedBy, 'Ghi đủ vết thất bại như đường PATCH');
  ok((await countFailed()) === before + 1, 'Người theo dõi nhận task_failed');

  // Form sửa luôn gửi kèm `status`. Lưu lại form của việc đã thất bại mà không đổi trạng
  // thái thì không được đòi quyền đánh Thất bại.
  const resave = await call('PUT', `/tasks/${good}`, { token: TOK.assignee, body: { status: 'failed', progress: 30 } });
  ok(resave.status === 200, 'Lưu lại form, trạng thái không đổi → không bị chặn', `status=${resave.status}`);
}

S('PUT /:id — người thực hiện ĐƯỢC dự án cho phép thì vẫn đánh Thất bại được');
{
  const project = await mkProject('Đường PUT — người làm được đánh thất bại', {
    failureConfig: { enabled: true, allowedRoles: ['assignee'] },
  });
  const id = await mkTask(project, 'Việc người làm tự đánh thất bại');
  const res = await call('PUT', `/tasks/${id}`, { token: TOK.assignee, body: { status: 'failed', failureReason: 'Thiếu thiết bị' } });
  ok(res.status === 200 && (await getTask(id))?.status === 'failed', 'allowedRoles có "assignee" → 200', `status=${res.status}`);
}

S('PUT /:id — vết của luồng trạng thái không ghi được từ body');
{
  const project = await mkProject('Vết trạng thái');
  const id = await mkTask(project, 'Việc bị sửa mốc hoàn thành');
  await call('PATCH', `/tasks/${id}/status`, { token: TOK.pm, body: { status: 'done' } });
  const real = (await getTask(id))?.completedAt;
  // Hạn là 15/10; gửi mốc 01/10 là biến một việc trễ thành đúng hạn trong báo cáo.
  await call('PUT', `/tasks/${id}`, { token: TOK.pm, body: { completedAt: '2026-10-01T00:00:00.000Z', reviewDecision: 'approved' } });
  const after = await getTask(id);
  ok(after?.completedAt === real, 'completedAt gửi lên bị bỏ qua', `${real} → ${after?.completedAt}`);
  ok(after?.reviewDecision !== 'approved', 'reviewDecision gửi lên bị bỏ qua');
}

S('Mốc completedAt trên mọi đường sang Hoàn thành');
{
  const project = await mkProject('Mốc hoàn thành');
  const viaPatch = await mkTask(project, 'Kéo thẻ Kanban sang Hoàn thành');
  await call('PATCH', `/tasks/${viaPatch}/status`, { token: TOK.assignee, body: { status: 'done' } });
  ok(!!(await getTask(viaPatch))?.completedAt, 'PATCH /:id/status → done ghi completedAt');

  const viaPut = await mkTask(project, 'Đổi trạng thái trong form');
  await call('PUT', `/tasks/${viaPut}`, { token: TOK.assignee, body: { status: 'done' } });
  ok(!!(await getTask(viaPut))?.completedAt, 'PUT /:id status=done ghi completedAt');

  const unchanged = await mkTask(project, 'Lưu form không đổi trạng thái');
  const keep = await call('PUT', `/tasks/${unchanged}`, { token: TOK.assignee, body: { status: 'todo', progress: 20 } });
  ok(keep.status === 200 && !(await getTask(unchanged))?.completedAt, 'Lưu form giữ nguyên trạng thái → 200, không ghi mốc');

  // Bật đánh giá: mốc là lúc người làm nộp, không phải lúc người đánh giá duyệt.
  const reviewed = await mkProject('Mốc hoàn thành — đánh giá', { reviewConfig: { enabled: true, reviewers: [], slaHours: 24 } });
  const r = await mkTask(reviewed, 'Việc được duyệt qua PATCH /status');
  const submitted = (await call('PATCH', `/tasks/${r}/complete`, { token: TOK.assignee })).data?.task?.completedAt;
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const approve = await call('PATCH', `/tasks/${r}/status`, { token: TOK.pm, body: { status: 'done' } });
  const after = await getTask(r);
  ok(approve.status === 200 && after?.status === 'done', 'Người đánh giá chuyển Chờ đánh giá → Hoàn thành', `status=${approve.status}`);
  ok(!!submitted && after?.completedAt === submitted, 'completedAt giữ lúc nộp, không bị đè bằng lúc duyệt',
    `${submitted} → ${after?.completedAt}`);
}

process.exit(summary() ? 1 : 0);
