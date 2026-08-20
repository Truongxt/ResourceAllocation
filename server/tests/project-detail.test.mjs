// Kiểm thử các API mà trang ProjectDetail sử dụng, theo đúng thứ tự UI gọi
import { call, login, ok, section, summary } from './helpers.mjs';

const admin = await login('admin@rao.com');
const pm = await login('pm@rao.com');
const member = await login('nam.tran@rao.com');

section('Trang chi tiết dự án: dữ liệu cần để render');
const projId = (await call('GET', '/projects', { token: admin })).data.projects[0]._id;
const d = await call('GET', `/projects/${projId}`, { token: admin });
const p = d.data.project;

ok(d.status === 200, 'GET /projects/:id → 200');
ok(!!p.name && !!p.status && !!p.priority, 'có name/status/priority cho phần header');
ok(typeof p.progress === 'number', 'có progress cho thẻ thống kê', `(${p.progress}%)`);
ok(!!p.manager?.name && !!p.manager?.email, 'manager đã populate cho tab Tổng quan', `(${p.manager?.name})`);
ok(Array.isArray(p.tasks), 'tasks đã populate cho tab Công việc', `(${p.tasks.length} task)`);
ok(p.tasks.every((t) => 'estimatedHours' in t && 'progress' in t && 'status' in t), 'mỗi task đủ field cho bảng');
const withAssignee = p.tasks.find((t) => t.assignee);
ok(!withAssignee || !!withAssignee.assignee?.name, 'assignee của task đã populate tên');
ok(Array.isArray(p.members), 'members là mảng cho tab Thành viên', `(${p.members.length})`);

section('Nguồn chọn nhân sự (dùng /resources vì /auth/users là admin-only)');
const staffAdmin = await call('GET', '/resources?limit=100', { token: admin });
const staffPM = await call('GET', '/resources?limit=100', { token: pm });
ok(staffPM.status === 200, 'PM đọc được /resources (không cần quyền admin)');
ok((await call('GET', '/auth/users', { token: pm })).status === 403, 'PM KHÔNG đọc được /auth/users → chọn đúng nguồn');
ok(staffAdmin.data.resources.every((r) => r.user?._id && r.user?.name), 'mỗi resource có user._id + name để đưa vào Select');
ok(staffAdmin.data.resources.every((r) => r.position), 'có position để hiện nhãn "Tên — Vị trí"');

section('Quản lý thành viên (PM thao tác)');
// Lọc đúng như availableStaff trong ProjectDetail.jsx: bỏ người đã ở trong dự án
const taken = new Set(p.members.map((m) => m.user?._id || m.user).filter(Boolean));
const available = staffAdmin.data.resources.filter((r) => r.user?._id && !taken.has(r.user._id));
ok(available.length > 0, 'còn nhân sự chưa ở trong dự án để thêm', `(${available.length}/${staffAdmin.data.resources.length})`);
const target = available[0].user._id;
const targetName = available[0].user.name;

const before = (await call('GET', `/projects/${projId}`, { token: pm })).data.project.members.length;
const add = await call('POST', `/projects/${projId}/members`, { token: pm, body: { user: target, role: 'lead', allocation: 60 } });
ok(add.status === 201, 'PM thêm thành viên → 201', `(${targetName})`);
ok(add.data.project.members.length === before + 1, 'response trả members đã cập nhật (UI dùng luôn, không cần load lại)');
const added = add.data.project.members.find((m) => (m.user?._id || m.user) === target);
ok(added?.user?.name && added?.user?.email, 'members[].user đã populate (bảng hiện tên + email)');
ok(added?.role === 'lead' && added?.allocation === 60, 'role và allocation lưu đúng');
ok(!!added?.joinedAt, 'có joinedAt cho cột "Tham gia từ"');

const dup = await call('POST', `/projects/${projId}/members`, { token: pm, body: { user: target } });
ok(dup.status === 400, 'Thêm trùng bị chặn → 400 (UI cũng đã lọc sẵn danh sách)');

const upd = await call('PUT', `/projects/${projId}/members/${target}`, { token: pm, body: { role: 'tester', allocation: 25 } });
const updated = upd.data.project.members.find((m) => (m.user?._id || m.user) === target);
ok(upd.status === 200 && updated.role === 'tester' && updated.allocation === 25, 'PM sửa vai trò + allocation → 200');

const badAlloc = await call('PUT', `/projects/${projId}/members/${target}`, { token: pm, body: { allocation: 150 } });
ok(badAlloc.status === 400, 'allocation 150 bị từ chối (UI giới hạn max 100)');

const badRole = await call('POST', `/projects/${projId}/members`, { token: pm, body: { user: target, role: 'hacker' } });
ok(badRole.status === 400, 'role ngoài enum bị từ chối');

section('Phân quyền: Member chỉ được xem');
ok((await call('GET', `/projects/${projId}`, { token: member })).status === 200, 'Member xem được chi tiết dự án');
ok((await call('POST', `/projects/${projId}/members`, { token: member, body: { user: target } })).status === 403,
  'Member thêm thành viên → 403 (UI ẩn nút với role này)');
ok((await call('DELETE', `/projects/${projId}/members/${target}`, { token: member })).status === 403,
  'Member xóa thành viên → 403');

section('Dọn');
const rm = await call('DELETE', `/projects/${projId}/members/${target}`, { token: pm });
ok(rm.status === 200 && rm.data.project.members.length === before, 'PM xóa thành viên, members về như cũ');

process.exit(summary() ? 1 : 0);
