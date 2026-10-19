// Vòng đời dự án: lưu trữ / mở lại, nhân bản, mẫu.
//
// Lưu trữ = ẩn khỏi danh sách mặc định và CHỈ ĐỌC. Chỉ lưu trữ được khi không còn việc
// mở và không còn việc lặp lại đang bật — để tải nhân sự và tối ưu không đổi ngầm.
import { call, login, ok, section as S, summary } from './helpers.mjs';

const stamp = Date.now();
const admin = await login('admin@rao.com');
const member = await login('nam.tran@rao.com');
const memberId = (await call('GET', '/auth/me', { token: member })).data?.user?._id;

const mkProject = async (name, extra = {}) => (await call('POST', '/projects', {
  token: admin,
  body: { name: `${name} ${stamp}`, startDate: '2026-11-02', endDate: '2026-12-31', members: [{ user: memberId, role: 'developer', allocation: 50 }], ...extra },
})).data?.project?._id;
const mkTask = async (project, title, extra = {}) => (await call('POST', '/tasks', {
  token: admin,
  body: { title: `${title} ${stamp}`, project, startDate: '2026-11-02', endDate: '2026-11-06', estimatedHours: 4, ...extra },
})).data?.task?._id;
const listIds = async (query = '') =>
  ((await call('GET', `/projects?limit=100${query}`, { token: admin })).data?.projects || []).map((p) => String(p._id));

// ══════════════════════════════════════════════
S('Lưu trữ: chỉ khi mọi việc đã đóng');
const projectId = await mkProject('Dự án sẽ lưu trữ');
const openTask = await mkTask(projectId, 'Việc còn mở', { assignee: memberId });
const doneTask = await mkTask(projectId, 'Việc đã xong');
await call('PATCH', `/tasks/${doneTask}/status`, { token: admin, body: { status: 'done' } });
{
  const blocked = await call('POST', `/projects/${projectId}/archive`, { token: admin });
  ok(blocked.status === 409, 'Còn việc mở → 409', `status=${blocked.status}`);
  ok(/1 công việc/.test(blocked.message || ''), 'Thông báo nói rõ còn bao nhiêu việc', blocked.message);

  await call('PATCH', `/tasks/${openTask}/status`, { token: admin, body: { status: 'done' } });
  const rec = await call('POST', '/recurring-tasks', {
    token: admin, body: { title: `Lặp ${stamp}`, project: projectId, frequency: 'weekly', daysOfWeek: [1], startDate: '2026-11-02', durationHours: 2 },
  });
  const recBlocked = await call('POST', `/projects/${projectId}/archive`, { token: admin });
  ok(rec.status === 201 && recBlocked.status === 409, 'Còn việc lặp lại đang bật → 409', `rec=${rec.status} archive=${recBlocked.status}`);
  ok(/lặp lại/.test(recBlocked.message || ''), 'Thông báo nhắc tới việc lặp lại', recBlocked.message);

  await call('DELETE', `/recurring-tasks/${rec.data?.recurringTask?._id}`, { token: admin });
  const memberTry = await call('POST', `/projects/${projectId}/archive`, { token: member });
  ok(memberTry.status === 403, 'Member không lưu trữ được dự án', `status=${memberTry.status}`);

  const archived = await call('POST', `/projects/${projectId}/archive`, { token: admin });
  ok(archived.status === 200 && archived.data?.project?.isArchived === true, 'Mọi việc đã đóng → lưu trữ được', `status=${archived.status} ${archived.message || ''}`);
  ok(!!archived.data?.project?.archivedAt, 'Ghi mốc lưu trữ');
}

S('Lưu trữ: ẩn khỏi danh sách mặc định');
{
  ok(!(await listIds()).includes(projectId), 'GET /projects mặc định không có dự án đã lưu trữ');
  ok((await listIds('&archived=true')).includes(projectId), 'GET /projects?archived=true có dự án đó');
  const active = (await listIds())[0];
  ok(!!active && !(await listIds('&archived=true')).includes(active), 'Danh sách lưu trữ không lẫn dự án đang chạy');
}

S('Lưu trữ: chỉ đọc');
{
  const create = await call('POST', '/tasks', { token: admin, body: { title: `Mới ${stamp}`, project: projectId, startDate: '2026-11-02', endDate: '2026-11-03' } });
  ok(create.status === 409, 'Tạo việc mới → 409', `status=${create.status}`);
  const edit = await call('PUT', `/tasks/${doneTask}`, { token: admin, body: { title: 'Đổi tên' } });
  ok(edit.status === 409, 'Sửa việc → 409', `status=${edit.status}`);
  const reopen = await call('PATCH', `/tasks/${doneTask}/status`, { token: admin, body: { status: 'in_progress' } });
  ok(reopen.status === 409, 'Mở lại việc (đổi trạng thái) → 409', `status=${reopen.status}`);
  const comment = await call('POST', `/tasks/${doneTask}/comments`, { token: admin, body: { content: 'x' } });
  ok(comment.status === 409, 'Bình luận → 409', `status=${comment.status}`);
  const del = await call('DELETE', `/tasks/${doneTask}`, { token: admin });
  ok(del.status === 409, 'Xóa việc → 409', `status=${del.status}`);
  const editProject = await call('PUT', `/projects/${projectId}`, { token: admin, body: { name: 'Đổi tên dự án' } });
  ok(editProject.status === 409, 'Sửa dự án → 409', `status=${editProject.status}`);

  const otherProject = await mkProject('Dự án nguồn');
  const movable = await mkTask(otherProject, 'Việc định chuyển vào kho');
  const move = await call('POST', `/tasks/${movable}/move`, { token: admin, body: { targetProjectId: projectId } });
  ok(move.status === 409, 'Chuyển việc vào dự án lưu trữ → 409', `status=${move.status}`);
  const dup = await call('POST', `/tasks/${movable}/duplicate`, { token: admin, body: { targetProjectId: projectId } });
  ok(dup.status === 409, 'Nhân bản việc vào dự án lưu trữ → 409', `status=${dup.status}`);

  const read = await call('GET', `/tasks/${doneTask}`, { token: admin });
  ok(read.status === 200, 'Đọc việc vẫn được', `status=${read.status}`);
  const readProject = await call('GET', `/projects/${projectId}`, { token: admin });
  ok(readProject.status === 200, 'Đọc dự án vẫn được', `status=${readProject.status}`);
}

S('Mở lại');
{
  const res = await call('POST', `/projects/${projectId}/unarchive`, { token: admin });
  ok(res.status === 200 && res.data?.project?.isArchived === false, 'Mở lại → 200', `status=${res.status}`);
  ok((await listIds()).includes(projectId), 'Quay lại danh sách mặc định');
  const edit = await call('PUT', `/tasks/${doneTask}`, { token: admin, body: { title: `Sửa sau khi mở lại ${stamp}` } });
  ok(edit.status === 200, 'Sửa được việc sau khi mở lại', `status=${edit.status}`);
}

S('Lưu trữ: phân lập công ty');
{
  const regB = await call('POST', '/auth/register', {
    body: { name: 'Chủ B', email: `life.${stamp}@b.com`, password: 'password123', companyName: `Công ty B life ${stamp}` },
  });
  const res = await call('POST', `/projects/${projectId}/archive`, { token: regB.data?.token });
  ok(res.status === 403 || res.status === 404, 'Admin công ty B không lưu trữ được dự án của A', `status=${res.status}`);
}

// ══════════════════════════════════════════════
// Nhân bản: dời ngày theo ngày bắt đầu mới, giữ cấu trúc, bỏ người.
const day = (iso) => (iso ? String(iso).slice(0, 10) : null);
const tasksOf = async (project) =>
  (await call('GET', `/tasks?project=${project}&includeSubtasks=true&limit=100`, { token: admin })).data?.tasks || [];
const byTitle = (tasks, prefix) => tasks.find((t) => t.title.startsWith(prefix));

const source = await mkProject('Nguồn nhân bản');
const g1 = (await call('POST', '/task-groups', { token: admin, body: { name: 'Phân tích', project: source } })).data?.group?._id;
const g2 = (await call('POST', '/task-groups', { token: admin, body: { name: 'Lập trình', project: source } })).data?.group?._id;
const tA = await mkTask(source, 'A khảo sát', {
  taskGroup: g1, assignee: memberId, followers: [memberId], estimatedHours: 8,
  startDate: '2026-11-02', endDate: '2026-11-06', requiredSkills: [{ name: 'React', level: 3 }], priority: 'high',
});
await call('POST', `/tasks/${tA}/checklist`, { token: admin, body: { title: 'Mục 1' } });
await call('POST', `/tasks/${tA}/checklist`, { token: admin, body: { title: 'Mục 2' } });
const tB = await mkTask(source, 'B lập trình', {
  taskGroup: g2, startDate: '2026-11-09', endDate: '2026-11-13', dependencies: [{ task: tA, type: 'finish_to_start' }],
});
await call('POST', `/tasks/${tA}/subtasks`, { token: admin, body: { title: `A1 con ${stamp}`, assignee: memberId, estimatedHours: 2 } });
await call('PATCH', `/tasks/${tB}/status`, { token: admin, body: { status: 'in_progress' } });

S('Nhân bản dự án');
let copyId;
{
  // 2026-11-02 → 2027-01-04: dời đúng 63 ngày.
  const res = await call('POST', `/projects/${source}/duplicate`, { token: admin, body: { name: `Bản sao ${stamp}`, startDate: '2027-01-04' } });
  copyId = res.data?.project?._id;
  ok(res.status === 201 && !!copyId, 'POST /projects/:id/duplicate → 201', `status=${res.status} ${res.message || ''}`);
  ok(day(res.data?.project?.startDate) === '2027-01-04' && day(res.data?.project?.endDate) === '2027-03-04',
    'Ngày dự án dời theo ngày bắt đầu mới', `${day(res.data?.project?.startDate)} → ${day(res.data?.project?.endDate)}`);
  ok(res.data?.project?.isTemplate === false, 'Bản sao là dự án thường');
  ok((res.data?.project?.members || []).some((m) => String(m.user?._id || m.user) === String(memberId)), 'Giữ thành viên dự án');

  const groups = (await call('GET', `/task-groups/${copyId}`, { token: admin })).data?.groups || [];
  ok(groups.map((g) => g.name).sort().join() === 'Lập trình,Phân tích', 'Giữ đủ nhóm việc', groups.map((g) => g.name).join());

  const copied = await tasksOf(copyId);
  ok(copied.length === 3, 'Đủ 3 việc (kể cả việc con)', `${copied.length} việc`);
  const a = byTitle(copied, 'A khảo sát');
  const b = byTitle(copied, 'B lập trình');
  const a1 = byTitle(copied, 'A1 con');
  ok(day(a?.startDate) === '2027-01-04' && day(b?.startDate) === '2027-01-11' && day(b?.endDate) === '2027-01-15',
    'Ngày việc dời đúng 63 ngày, giữ khoảng cách', `A ${day(a?.startDate)}, B ${day(b?.startDate)}–${day(b?.endDate)}`);
  ok(copied.every((t) => !t.assignee && !(t.followers || []).length), 'Không việc nào còn người thực hiện hay người theo dõi');
  ok(copied.every((t) => t.status === 'todo' && !t.progress), 'Mọi việc về Cần làm, tiến độ 0', copied.map((t) => t.status).join());
  ok(String(a?.taskGroup?._id || a?.taskGroup) !== String(g1) && !!a?.taskGroup, 'Việc trỏ vào nhóm của bản sao, không phải nhóm gốc');
  ok(a?.estimatedHours === 8 && a?.priority === 'high' && a?.requiredSkills?.[0]?.name === 'React', 'Giữ giờ ước tính, ưu tiên, kỹ năng');

  const aFull = (await call('GET', `/tasks/${a?._id}`, { token: admin })).data?.task;
  const bFull = (await call('GET', `/tasks/${b?._id}`, { token: admin })).data?.task;
  ok((aFull?.checklist || []).length === 2 && aFull.checklist.every((c) => !c.isCompleted), 'Giữ checklist, bỏ dấu đã xong');
  const dep = bFull?.dependencies?.[0];
  ok(!!a?._id && String(dep?.task?._id || dep?.task) === String(a._id), 'Phụ thuộc trỏ sang bản sao của A, không về A gốc');
  ok(!!a1 && !!a?._id && String(a1.parentTask?._id || a1.parentTask) === String(a._id), 'Việc con trỏ sang bản sao của việc cha');
}

S('Lưu thành mẫu và tạo từ mẫu');
{
  const res = await call('POST', `/projects/${source}/duplicate`, { token: admin, body: { name: `Mẫu ${stamp}`, asTemplate: true } });
  const templateId = res.data?.project?._id;
  ok(res.status === 201 && res.data?.project?.isTemplate === true, 'Lưu thành mẫu → isTemplate', `status=${res.status}`);
  ok(!(res.data?.project?.members || []).length, 'Mẫu không có thành viên');
  ok(!(await listIds()).includes(templateId), 'Mẫu không có trong danh sách dự án mặc định');
  ok((await listIds('&templates=true')).includes(templateId), 'GET /projects?templates=true có mẫu');

  const withPerson = await call('POST', '/tasks', {
    token: admin, body: { title: `Có người ${stamp}`, project: templateId, assignee: memberId, startDate: '2026-11-02', endDate: '2026-11-03' },
  });
  ok(withPerson.status === 400, 'Tạo việc có người thực hiện trong mẫu → 400', `status=${withPerson.status}`);
  const noPerson = await call('POST', '/tasks', {
    token: admin, body: { title: `Không người ${stamp}`, project: templateId, startDate: '2026-11-02', endDate: '2026-11-03' },
  });
  ok(noPerson.status === 201, 'Tạo việc không người trong mẫu → 201', `status=${noPerson.status}`);

  const fromTemplate = await call('POST', `/projects/${templateId}/duplicate`, { token: admin, body: { name: `Từ mẫu ${stamp}`, startDate: '2027-02-01' } });
  const fresh = fromTemplate.data?.project;
  ok(fromTemplate.status === 201 && fresh?.isTemplate === false, 'Tạo dự án từ mẫu → dự án thường', `status=${fromTemplate.status}`);
  ok((await tasksOf(fresh?._id)).length === 4, 'Dự án từ mẫu có đủ việc của mẫu', `${(await tasksOf(fresh?._id)).length} việc`);

  const archiveTemplate = await call('POST', `/projects/${templateId}/archive`, { token: admin });
  ok(archiveTemplate.status === 400, 'Mẫu không lưu trữ được', `status=${archiveTemplate.status}`);
}

// ══════════════════════════════════════════════
// Mẫu nằm ngoài mọi tính toán; việc đã đóng của dự án lưu trữ rút khỏi danh sách.
S('Mẫu không lọt vào danh sách, thống kê và tối ưu');
{
  const snapshot = async () => ({
    list: (await call('GET', '/tasks?limit=100', { token: admin })).total,
    summary: (await call('GET', '/tasks/stats/summary', { token: admin })).data?.totals?.totalTasks,
    dashboard: (await call('GET', '/analytics/dashboard', { token: admin })).data?.tasks?.total,
    readiness: (await call('GET', '/optimization/readiness', { token: admin })).data?.totalTasks,
  });
  const before = await snapshot();
  const tpl = (await call('POST', `/projects/${source}/duplicate`, { token: admin, body: { name: `Mẫu đo ${stamp}`, asTemplate: true } })).data?.project?._id;
  const after = await snapshot();
  ok(!!tpl, 'Tạo được mẫu có 3 việc');
  for (const key of Object.keys(before)) {
    ok(before[key] === after[key], `${key}: thêm mẫu không đổi số việc`, `${before[key]} → ${after[key]}`);
  }
  const optimize = await call('POST', '/optimization/run/csp', { token: admin, body: { projectId: tpl } });
  ok(optimize.status === 400 && /mẫu/.test(optimize.message || ''), 'Chạy tối ưu trên mẫu → 400, nói rõ vì là mẫu', `status=${optimize.status} ${optimize.message}`);
}

S('Dự án lưu trữ rút khỏi danh sách việc mặc định');
{
  const p = await mkProject('Lưu trữ để lọc');
  const t = await mkTask(p, 'Việc của dự án lưu trữ');
  await call('PATCH', `/tasks/${t}/status`, { token: admin, body: { status: 'done' } });
  await call('POST', `/projects/${p}/archive`, { token: admin });
  const all = (await call('GET', '/tasks?limit=100&search=' + encodeURIComponent('Việc của dự án lưu trữ'), { token: admin })).data?.tasks || [];
  ok(!all.some((x) => String(x._id) === String(t)), 'GET /tasks mặc định không có việc của dự án lưu trữ');
  const explicit = (await call('GET', `/tasks?project=${p}`, { token: admin })).data?.tasks || [];
  ok(explicit.some((x) => String(x._id) === String(t)), 'Lọc đúng ?project= thì vẫn xem được');

  const dup = await call('POST', `/projects/${p}/duplicate`, { token: admin, body: { name: `Chạy lại ${stamp}` } });
  ok(dup.status === 201, 'Nhân bản dự án đã lưu trữ được (chỉ đọc nguồn)', `status=${dup.status}`);
}

S('Nhân bản: phân lập công ty và quyền');
{
  const regB = await call('POST', '/auth/register', {
    body: { name: 'Chủ B2', email: `life2.${stamp}@b.com`, password: 'password123', companyName: `Công ty B2 life ${stamp}` },
  });
  const res = await call('POST', `/projects/${source}/duplicate`, { token: regB.data?.token, body: { name: 'Chép trộm' } });
  ok(res.status === 403 || res.status === 404, 'Admin công ty B không nhân bản được dự án của A', `status=${res.status}`);
  const byMember = await call('POST', `/projects/${source}/duplicate`, { token: member, body: { name: 'Member chép' } });
  ok(byMember.status === 403, 'Member không nhân bản được dự án', `status=${byMember.status}`);
}

process.exit(summary() ? 1 : 0);
