// Loại dự án "team": phòng ban vận hành chạy vô thời hạn, chứa việc thường ngày.
//
// Lý do tồn tại của loại này nằm ở tải chứ không ở giao diện: việc vận hành (trực hệ
// thống, hỗ trợ khách, họp định kỳ) ăn giờ thật của nhân sự. Không có chỗ để nhập thì
// tối ưu hóa luôn xuất phát từ năng lực rảnh cao hơn thực tế.
import { call, login, ok, section, summary } from './helpers.mjs';

const admin = await login('admin@rao.com');

const iso = (offsetDays) => new Date(Date.now() + offsetDays * 86400000).toISOString();

section('Tạo phòng ban vận hành');
const team = await call('POST', '/projects', {
  token: admin,
  body: { name: 'Vận hành hệ thống', kind: 'team' },
});
ok(team.status === 201, 'Team không cần ngày bắt đầu lẫn kết thúc → 201', `status=${team.status} ${team.message || ''}`);
ok(team.data?.project?.kind === 'team', 'kind lưu đúng là team');
const teamId = team.data?.project?._id;

const teamWithEnd = await call('POST', '/projects', {
  token: admin,
  body: { name: 'Hỗ trợ khách hàng', kind: 'team', startDate: iso(0), endDate: iso(30) },
});
ok(teamWithEnd.status === 201, 'Team gửi kèm ngày vẫn tạo được');
ok(teamWithEnd.data?.project?.startDate, 'Team giữ ngày bắt đầu');
ok(!('endDate' in (teamWithEnd.data?.project || {})), 'Team không lưu ngày kết thúc',
  `endDate=${teamWithEnd.data?.project?.endDate}`);

const noDates = await call('POST', '/projects', { token: admin, body: { name: 'Dự án thiếu ngày' } });
ok(noDates.status === 400, 'Dự án thường thiếu ngày vẫn bị chặn → 400', `status=${noDates.status}`);

const badKind = await call('POST', '/projects', {
  token: admin,
  body: { name: 'Loại lạ', kind: 'department', startDate: iso(0), endDate: iso(10) },
});
ok(badKind.status === 400, 'kind ngoài enum → 400', `status=${badKind.status}`);

const plain = await call('POST', '/projects', {
  token: admin,
  body: { name: 'Dự án có hạn', startDate: iso(0), endDate: iso(20) },
});
ok(plain.status === 201 && plain.data.project.kind === 'project', 'Không gửi kind thì mặc định là project');
const plainId = plain.data?.project?._id;

section('Chuyển đổi loại');
const toTeam = await call('PUT', `/projects/${plainId}`, { token: admin, body: { kind: 'team' } });
ok(toTeam.status === 200 && toTeam.data.project.kind === 'team', 'Dự án → team → 200', `status=${toTeam.status}`);
ok(!('endDate' in (toTeam.data?.project || {})), 'Chuyển sang team gỡ hẳn ngày kết thúc (không để null)',
  `endDate=${JSON.stringify(toTeam.data?.project?.endDate)}`);

const backNoDate = await call('PUT', `/projects/${plainId}`, { token: admin, body: { kind: 'project' } });
ok(backNoDate.status === 400, 'Team → dự án mà không có ngày kết thúc → 400', `status=${backNoDate.status}`);

const backWithDate = await call('PUT', `/projects/${plainId}`, {
  token: admin,
  body: { kind: 'project', endDate: iso(40) },
});
ok(backWithDate.status === 200 && backWithDate.data.project.kind === 'project' && backWithDate.data.project.endDate,
  'Team → dự án có ngày kết thúc → 200', `status=${backWithDate.status} ${backWithDate.message || ''}`);

const teamRename = await call('PUT', `/projects/${teamId}`, { token: admin, body: { name: 'Vận hành hệ thống 24/7' } });
ok(teamRename.status === 200, 'Sửa tên team không đòi ngày', `status=${teamRename.status} ${teamRename.message || ''}`);

const teamSetEnd = await call('PUT', `/projects/${teamId}`, { token: admin, body: { endDate: iso(5) } });
ok(teamSetEnd.status === 200 && !('endDate' in teamSetEnd.data.project), 'Gửi endDate cho team bị bỏ qua');

section('Việc của team là tải cố định');
const staff = (await call('GET', '/resources?limit=100', { token: admin })).data.resources;
const nam = staff.find((r) => r.user?.email === 'nam.tran@rao.com');
const namWorkload = async () =>
  (await call('GET', '/analytics/utilization', { token: admin })).data.resources
    .find((r) => String(r._id) === String(nam._id));

const readyBefore = (await call('GET', '/optimization/readiness', { token: admin })).data.totalTasks;
const loadBefore = await namWorkload();

const routine = await call('POST', '/tasks', {
  token: admin,
  body: {
    title: 'Trực hệ thống tuần này',
    project: teamId,
    assignee: nam.user._id,
    estimatedHours: 10,
    startDate: iso(0),
    endDate: iso(4),
  },
});
ok(routine.status === 201, 'Tạo được việc trong team', `status=${routine.status} ${routine.message || ''}`);

const loadAfter = await namWorkload();
ok(loadAfter.taskCount === loadBefore.taskCount + 1, 'Việc của team được tính vào tải của người làm',
  `taskCount ${loadBefore.taskCount} → ${loadAfter.taskCount}`);

const readyAll = (await call('GET', '/optimization/readiness', { token: admin })).data.totalTasks;
ok(readyAll === readyBefore, 'Tối ưu "Tất cả dự án" không đưa việc của team vào để phân công lại',
  `totalTasks ${readyBefore} → ${readyAll}`);

const readyTeam = (await call('GET', `/optimization/readiness?projectId=${teamId}`, { token: admin })).data.totalTasks;
ok(readyTeam === 1, 'Chọn đích danh team thì vẫn tối ưu được việc của nó', `totalTasks=${readyTeam}`);

// Việc team vẫn phải được tính là giờ đã cam kết của người làm khi tối ưu các dự án
// khác — nếu không thì loại bỏ nó khỏi biến chỉ là đổi chỗ cho lỗi tính thiếu tải.
const run = await call('POST', '/optimization/run/csp', { token: admin, body: {} });
ok(run.status === 200, 'Chạy CSP "Tất cả dự án" vẫn thành công', `status=${run.status} ${run.message || ''}`);
ok(!(run.data?.result?.assignments || []).some((a) => String(a.task?._id || a.task) === String(routine.data?.task?._id)),
  'Kết quả không phân công lại việc của team');

process.exit(summary() ? 1 : 0);
