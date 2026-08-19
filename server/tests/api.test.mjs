// Bộ kiểm thử end-to-end REST API.
// Tự tạo fixture riêng, tự dọn, assert trên nội dung response chứ không chỉ mã HTTP.

import { call, ok, section as S, summary } from './helpers.mjs';

const TOK = {};

// ══════════════════════════════════════════════
S('1. Health & Authentication');
{
  // raw:true vì body của /health cũng có field tên "status" (sẽ đè lên mã HTTP)
  const h = await call('GET', '/health', { raw: true });
  ok(h.status === 200 && h.json.status === 'ok', 'GET /health trả 200 + status ok');

  const login = await call('POST', '/auth/login', { body: { email: 'admin@rao.com', password: 'password123' } });
  ok(login.status === 200 && !!login.data?.token, 'Đăng nhập admin');
  TOK.admin = login.data?.token;

  TOK.pm = (await call('POST', '/auth/login', { body: { email: 'pm@rao.com', password: 'password123' } })).data?.token;
  const memberLogin = await call('POST', '/auth/login', { body: { email: 'nam.tran@rao.com', password: 'password123' } });
  TOK.member = memberLogin.data?.token;
  // Lấy id từ chính response login: danh sách /auth/users sắp xếp -createdAt nên
  // "member đầu tiên" không nhất thiết là tài khoản đang đăng nhập ở đây
  TOK.memberId = memberLogin.data?.user?._id;
  ok(!!TOK.pm && !!TOK.member && !!TOK.memberId, 'Đăng nhập PM và Member');

  ok(!login.data?.user?.password, 'Response login KHÔNG chứa password');

  const bad = await call('POST', '/auth/login', { body: { email: 'admin@rao.com', password: 'sai' } });
  ok(bad.status === 401, 'Sai mật khẩu trả 401');

  const noAuth = await call('GET', '/projects');
  ok(noAuth.status === 401, 'Không có token trả 401');

  const badTok = await call('GET', '/projects', { token: 'rac.rac.rac' });
  ok(badTok.status === 401, 'Token rác trả 401');

  const me = await call('GET', '/auth/me', { token: TOK.admin });
  ok(me.data?.user?.email === 'admin@rao.com', 'GET /auth/me trả đúng user');

  const val = await call('POST', '/auth/register', { body: { name: '', email: 'sai', password: '1' } });
  ok(val.status === 400 && Array.isArray(val.errors), 'Validation trả 400 + mảng errors', `(${val.errors?.length} lỗi)`);
}

// ══════════════════════════════════════════════
S('2. Phân quyền theo role');
{
  const adminOnly = await call('GET', '/auth/users', { token: TOK.member });
  ok(adminOnly.status === 403, 'Member gọi GET /auth/users → 403');
  ok((await call('GET', '/auth/users', { token: TOK.admin })).status === 200, 'Admin gọi GET /auth/users → 200');

  const pmCreate = await call('POST', '/projects', {
    token: TOK.member,
    body: { name: 'x', startDate: '2026-01-01', endDate: '2026-02-01' },
  });
  ok(pmCreate.status === 403, 'Member tạo dự án → 403');

  const recalc = await call('POST', '/resources/recalculate-workload', { token: TOK.pm });
  ok(recalc.status === 403, 'PM gọi recalculate-workload (admin-only) → 403');
  ok((await call('POST', '/resources/recalculate-workload', { token: TOK.admin })).status === 200,
    'Admin gọi recalculate-workload → 200');
}

// ══════════════════════════════════════════════
S('3. Projects CRUD + thành viên');
let projectId, userId;
{
  const users = await call('GET', '/auth/users', { token: TOK.admin });
  userId = users.data.users.find((u) => u.role === 'member')._id;

  const created = await call('POST', '/projects', {
    token: TOK.admin,
    body: { name: 'E2E Test Project', code: 'E2E', priority: 'high', startDate: '2026-09-01', endDate: '2026-12-31', budget: 1000 },
  });
  ok(created.status === 201 && !!created.data?.project?._id, 'Tạo dự án → 201');
  projectId = created.data?.project?._id;
  ok(created.data?.project?.code === 'E2E', 'code tự uppercase');
  ok(created.data?.project?.manager?._id, 'manager tự gán cho người tạo');

  const dupCode = await call('POST', '/projects', {
    token: TOK.admin,
    body: { name: 'trùng code', code: 'E2E', startDate: '2026-09-01', endDate: '2026-12-31' },
  });
  ok(dupCode.status === 400, 'code trùng → 400 (unique index)');

  const noDate = await call('POST', '/projects', { token: TOK.admin, body: { name: 'thiếu ngày' } });
  ok(noDate.status === 400, 'thiếu startDate/endDate → 400');

  const list = await call('GET', '/projects?page=1&limit=2', { token: TOK.admin });
  ok(Array.isArray(list.data?.projects), 'data.projects là mảng');
  ok(typeof list.total === 'number' && list.total !== undefined, 'total ở cấp gốc');
  ok(list.pagination?.page === 1 && list.pagination?.limit === 2, 'pagination {page, limit, pages}');
  ok(!('total' in (list.pagination || {})), 'total KHÔNG nằm trong pagination');
  ok(list.data.projects.every((p) => p.taskStats), 'mỗi dự án có taskStats');

  const filtered = await call('GET', '/projects?priority=high', { token: TOK.admin });
  ok(filtered.data.projects.every((p) => p.priority === 'high'), 'lọc theo priority hoạt động');

  const search = await call('GET', '/projects?search=E2E', { token: TOK.admin });
  ok(search.data.projects.length >= 1, 'tìm kiếm theo tên/code hoạt động');

  const upd = await call('PUT', `/projects/${projectId}`, { token: TOK.admin, body: { status: 'in_progress' } });
  ok(upd.data?.project?.status === 'in_progress', 'Cập nhật dự án');

  const addM = await call('POST', `/projects/${projectId}/members`, { token: TOK.admin, body: { user: userId, role: 'lead', allocation: 60 } });
  ok(addM.status === 201 && addM.data.project.members.length === 1, 'Thêm thành viên → 201');

  const dupM = await call('POST', `/projects/${projectId}/members`, { token: TOK.admin, body: { user: userId } });
  ok(dupM.status === 400, 'Thêm trùng thành viên → 400');

  const updM = await call('PUT', `/projects/${projectId}/members/${userId}`, { token: TOK.admin, body: { allocation: 90 } });
  ok(updM.data.project.members[0].allocation === 90, 'Cập nhật allocation thành viên');

  const badId = await call('GET', '/projects/khong-phai-objectid', { token: TOK.admin });
  ok(badId.status === 400, 'ID không hợp lệ → 400');

  const notFound = await call('GET', '/projects/000000000000000000000000', { token: TOK.admin });
  ok(notFound.status === 404, 'ID không tồn tại → 404');
}

// ══════════════════════════════════════════════
S('4. Tasks CRUD + tiến độ + dependencies');
let taskA, taskB;
{
  const a = await call('POST', '/tasks', {
    token: TOK.admin,
    body: { title: 'E2E Task A', project: projectId, estimatedHours: 10, status: 'todo',
            startDate: '2026-09-01', endDate: '2026-09-10',
            requiredSkills: [{ name: 'React', level: 3, weight: 1 }] },
  });
  ok(a.status === 201, 'Tạo task → 201');
  taskA = a.data?.task?._id;
  ok(a.data.task.requiredSkills[0].level === 3 && a.data.task.requiredSkills[0].weight === 1,
    'requiredSkills lưu đúng {name, level, weight}');

  // Form Task cho đặt level/weight từng kỹ năng, nên các giá trị ngoài thang phải bị chặn.
  const skillNoName = await call('POST', '/tasks', {
    token: TOK.admin,
    body: { title: 'ZZ skill thiếu tên', project: projectId, requiredSkills: [{ level: 3 }] },
  });
  ok(skillNoName.status === 400, 'Kỹ năng yêu cầu thiếu tên → 400');

  const skillBadLevel = await call('POST', '/tasks', {
    token: TOK.admin,
    body: { title: 'ZZ level xấu', project: projectId, requiredSkills: [{ name: 'React', level: 9 }] },
  });
  ok(skillBadLevel.status === 400, 'Level kỹ năng ngoài 1-5 → 400');

  const skillBadWeight = await call('POST', '/tasks', {
    token: TOK.admin,
    body: { title: 'ZZ weight xấu', project: projectId, requiredSkills: [{ name: 'React', weight: 1.5 }] },
  });
  ok(skillBadWeight.status === 400, 'Trọng số ngoài 0-1 → 400');

  // Sửa task mà không đụng tới kỹ năng thì level/weight phải giữ nguyên.
  const untouched = await call('PUT', `/tasks/${taskA}`, { token: TOK.admin, body: { progress: 25 } });
  ok(untouched.data.task.requiredSkills[0].level === 3 && untouched.data.task.requiredSkills[0].weight === 1,
    'Sửa trường khác không làm mất level/weight của kỹ năng');

  const reweighted = await call('PUT', `/tasks/${taskA}`, {
    token: TOK.admin,
    body: { requiredSkills: [{ name: 'React', level: 4, weight: 0.3 }, { name: 'SQL', level: 2, weight: 1 }] },
  });
  ok(reweighted.data.task.requiredSkills.length === 2 &&
     reweighted.data.task.requiredSkills[0].weight === 0.3,
    'Cập nhật lại cả danh sách kỹ năng kèm trọng số');

  await call('PUT', `/tasks/${taskA}`, {
    token: TOK.admin, body: { requiredSkills: [{ name: 'React', level: 3, weight: 1 }] },
  });

  const b = await call('POST', '/tasks', {
    token: TOK.admin,
    body: { title: 'E2E Task B', project: projectId, estimatedHours: 20, dependencies: [taskA] },
  });
  taskB = b.data?.task?._id;
  ok(b.data.task.dependencies.length === 1, 'dependencies là mảng ObjectId phẳng');

  const badStatus = await call('POST', '/tasks', { token: TOK.admin, body: { title: 'x', project: projectId, status: 'in_review' } });
  ok(badStatus.status === 400, "status 'in_review' bị từ chối (server dùng 'review')");
  const goodStatus = await call('POST', '/tasks', { token: TOK.admin, body: { title: 'ZZ tmp', project: projectId, status: 'review' } });
  ok(goodStatus.status === 201, "status 'review' được chấp nhận");
  await call('DELETE', `/tasks/${goodStatus.data.task._id}`, { token: TOK.admin });

  const noProject = await call('POST', '/tasks', { token: TOK.admin, body: { title: 'không project' } });
  ok(noProject.status === 400, 'thiếu project → 400');

  const st = await call('PATCH', `/tasks/${taskA}/status`, { token: TOK.admin, body: { status: 'done' } });
  ok(st.data?.task?.status === 'done' && st.data?.task?.progress === 100, "PATCH status='done' tự set progress=100");

  const proj = await call('GET', `/projects/${projectId}`, { token: TOK.admin });
  ok(proj.data.project.progress === 50, 'progress dự án tự tính lại', `(A done + B 0% → ${proj.data.project.progress}%)`);
  ok(Array.isArray(proj.data.project.tasks) && proj.data.project.tasks.length === 2, 'GET /projects/:id populate tasks');

  const assign = await call('PUT', `/tasks/${taskB}`, { token: TOK.admin, body: { assignee: userId } });
  ok(assign.data.task.assignee?.email, 'assignee populate ra User (có email)');
  ok(!assign.data.task.assignee?.position, 'assignee KHÔNG phải Resource (không có position)');

  const noProjChange = await call('PUT', `/tasks/${taskB}`, { token: TOK.admin, body: { project: '000000000000000000000000' } });
  ok(noProjChange.data.task.project._id === projectId, 'không cho đổi project của task');

  await call('DELETE', `/tasks/${taskA}`, { token: TOK.admin });
  const bAfter = await call('GET', `/tasks/${taskB}`, { token: TOK.admin });
  ok(bAfter.data.task.dependencies.length === 0, 'xóa task gỡ nó khỏi dependencies của task khác');

}

// ══════════════════════════════════════════════
S('4b. Ràng buộc phụ thuộc công việc');
{
  const mk = async (title, dependencies) =>
    call('POST', '/tasks', {
      token: TOK.admin,
      body: { title, project: projectId, estimatedHours: 8, ...(dependencies ? { dependencies } : {}) },
    });

  const d1 = await mk('E2E dep 1');
  const d2 = await mk('E2E dep 2', [d1.data.task._id]);
  const d3 = await mk('E2E dep 3', [d2.data.task._id]);
  const [id1, id2, id3] = [d1.data.task._id, d2.data.task._id, d3.data.task._id];
  ok(d2.status === 201 && d2.data.task.dependencies.length === 1, 'Tạo task kèm tiền nhiệm hợp lệ → 201');

  const badId = await mk('E2E dep xấu', ['không-phải-id']);
  ok(badId.status === 400, 'ID tiền nhiệm sai định dạng → 400');

  const missing = await mk('E2E dep thiếu', ['000000000000000000000000']);
  ok(missing.status === 400, 'Tiền nhiệm không tồn tại → 400');

  const self = await call('PUT', `/tasks/${id1}`, { token: TOK.admin, body: { dependencies: [id1] } });
  ok(self.status === 400 && /chính nó/.test(self.message || ''), 'Task phụ thuộc chính nó → 400');

  const direct = await call('PUT', `/tasks/${id1}`, { token: TOK.admin, body: { dependencies: [id2] } });
  ok(direct.status === 400 && /vòng lặp/.test(direct.message || ''), 'Vòng lặp trực tiếp (1→2→1) → 400');

  const indirect = await call('PUT', `/tasks/${id1}`, { token: TOK.admin, body: { dependencies: [id3] } });
  ok(indirect.status === 400, 'Vòng lặp gián tiếp (1→3→2→1) → 400');

  const other = await call('POST', '/projects', {
    token: TOK.admin,
    body: { name: 'E2E dự án khác', code: 'E2E-DEP', startDate: '2026-09-01', endDate: '2026-12-01' },
  });
  const otherTask = await call('POST', '/tasks', {
    token: TOK.admin,
    body: { title: 'E2E task dự án khác', project: other.data.project._id, estimatedHours: 4 },
  });
  const crossProject = await call('PUT', `/tasks/${id1}`, {
    token: TOK.admin,
    body: { dependencies: [otherTask.data.task._id] },
  });
  ok(crossProject.status === 400 && /dự án khác/.test(crossProject.message || ''),
    'Tiền nhiệm thuộc dự án khác → 400');

  const duplicated = await call('PUT', `/tasks/${id3}`, {
    token: TOK.admin,
    body: { dependencies: [id1, id1, id2] },
  });
  ok(duplicated.status === 200 && duplicated.data.task.dependencies.length === 2,
    'ID trùng trong danh sách được gộp lại', `(${duplicated.data?.task?.dependencies?.length})`);

  const cleared = await call('PUT', `/tasks/${id3}`, { token: TOK.admin, body: { dependencies: [] } });
  ok(cleared.status === 200 && cleared.data.task.dependencies.length === 0, 'Xóa hết tiền nhiệm → 200');

  for (const id of [id3, id2, id1, otherTask.data.task._id]) {
    await call('DELETE', `/tasks/${id}`, { token: TOK.admin });
  }
  await call('DELETE', `/projects/${other.data.project._id}?force=true`, { token: TOK.admin });
}

// ══════════════════════════════════════════════
S('4c. Phân quyền công việc');
{
  const memberCreate = await call('POST', '/tasks', { token: TOK.member, body: { title: 'ZZ member', project: projectId } });
  ok(memberCreate.status === 403, 'Member tạo task → 403');

  const own = await call('POST', '/tasks', {
    token: TOK.admin,
    body: { title: 'E2E own task', project: projectId, estimatedHours: 8, assignee: TOK.memberId },
  });
  const ownId = own.data.task._id;

  const other = await call('POST', '/tasks', {
    token: TOK.admin,
    body: { title: 'E2E other task', project: projectId, estimatedHours: 8 },
  });
  const otherId = other.data.task._id;

  const progress = await call('PUT', `/tasks/${ownId}`, { token: TOK.member, body: { progress: 40 } });
  ok(progress.status === 200 && progress.data.task.progress === 40, 'Member cập nhật tiến độ task của mình → 200');

  const statusOwn = await call('PATCH', `/tasks/${ownId}/status`, { token: TOK.member, body: { status: 'in_progress' } });
  ok(statusOwn.status === 200, 'Member đổi trạng thái task của mình → 200');

  const retitle = await call('PUT', `/tasks/${ownId}`, { token: TOK.member, body: { title: 'đổi tên' } });
  ok(retitle.status === 403, 'Member đổi tiêu đề task của mình → 403 (chỉ được sửa trường tiến độ)');

  const reassign = await call('PUT', `/tasks/${ownId}`, { token: TOK.member, body: { assignee: null } });
  ok(reassign.status === 403, 'Member tự bỏ gán task của mình → 403');

  const mixed = await call('PUT', `/tasks/${ownId}`, { token: TOK.member, body: { progress: 60, priority: 'critical' } });
  ok(mixed.status === 403, 'Trộn trường hợp lệ với trường cấm cũng bị chặn');

  const foreign = await call('PUT', `/tasks/${otherId}`, { token: TOK.member, body: { progress: 10 } });
  ok(foreign.status === 403, 'Member cập nhật task của người khác → 403');

  const foreignStatus = await call('PATCH', `/tasks/${otherId}/status`, { token: TOK.member, body: { status: 'done' } });
  ok(foreignStatus.status === 403, 'Member đổi trạng thái task của người khác → 403');

  const memberDelete = await call('DELETE', `/tasks/${ownId}`, { token: TOK.member });
  ok(memberDelete.status === 403, 'Member xóa task của chính mình → 403');

  ok((await call('PUT', `/tasks/${otherId}`, { token: TOK.pm, body: { title: 'PM đổi được' } })).status === 200,
    'PM sửa mọi trường của task bất kỳ → 200');
  ok((await call('DELETE', `/tasks/${otherId}`, { token: TOK.pm })).status === 200, 'PM xóa task → 200');

  const ghost = await call('PUT', '/tasks/000000000000000000000000', { token: TOK.member, body: { progress: 10 } });
  ok(ghost.status === 404, 'Member sửa task không tồn tại → 404 (không lộ thành 403)');

  // Đúng payload mà thao tác kéo thả trên sơ đồ Gantt gửi lên.
  const reschedule = await call('PUT', `/tasks/${ownId}`, {
    token: TOK.pm,
    body: { startDate: '2026-09-01T00:00:00.000Z', endDate: '2026-09-10T00:00:00.000Z' },
  });
  ok(
    reschedule.status === 200 && reschedule.data.task.startDate.startsWith('2026-09-01'),
    'PM kéo thả đổi lịch task (startDate + endDate) → 200'
  );

  const memberReschedule = await call('PUT', `/tasks/${ownId}`, {
    token: TOK.member,
    body: { startDate: '2026-09-02T00:00:00.000Z', endDate: '2026-09-11T00:00:00.000Z' },
  });
  ok(memberReschedule.status === 403, 'Member đổi lịch task của mình → 403 (Gantt ẩn thao tác kéo thả)');

  const badDate = await call('PUT', `/tasks/${ownId}`, { token: TOK.pm, body: { startDate: 'hôm qua' } });
  ok(badDate.status === 400, 'Ngày bắt đầu không hợp lệ → 400');

  await call('DELETE', `/tasks/${ownId}`, { token: TOK.admin });
}

// ══════════════════════════════════════════════
S('5. Resources & Departments');
let deptId, resId;
{
  const d = await call('POST', '/departments', { token: TOK.admin, body: { name: 'E2E Dept', code: 'e2ed' } });
  ok(d.status === 201 && d.data.department.code === 'E2ED', 'Tạo phòng ban, code tự uppercase');
  deptId = d.data.department._id;

  const badDept = await call('POST', '/resources', {
    token: TOK.admin,
    body: { newUser: { name: 'X', email: 'e2e_x@rao.com', password: '123456' }, position: 'Dev', department: 'Không Tồn Tại' },
  });
  ok(badDept.status === 400, 'Tạo nhân sự với phòng ban không tồn tại → 400');

  const r = await call('POST', '/resources', {
    token: TOK.admin,
    body: { newUser: { name: 'E2E Nhân sự', email: 'e2e_res@rao.com', password: 'password123' },
            position: 'QA Engineer', department: 'E2E Dept', maxCapacity: 40, fte: 1, hourlyRate: 20,
            skills: [{ name: 'Testing', level: 3 }], employeeId: 'HACK-999' },
  });
  ok(r.status === 201, 'Tạo nhân sự kèm tài khoản mới → 201');
  resId = r.data?.resource?._id;
  ok(/^NV\d{4}$/.test(r.data.resource.employeeId), 'employeeId do hệ thống sinh', `(${r.data.resource.employeeId})`);
  ok(r.data.resource.employeeId !== 'HACK-999', 'employeeId client gửi lên bị bỏ qua');

  const dupUser = await call('POST', '/resources', {
    token: TOK.admin,
    body: { newUser: { name: 'trùng', email: 'e2e_res@rao.com', password: 'password123' }, position: 'X', department: 'E2E Dept' },
  });
  ok(dupUser.status === 400, 'Email trùng → 400');

  const detail = await call('GET', `/resources/${resId}`, { token: TOK.admin });
  ok(Array.isArray(detail.data.assignments), 'GET /resources/:id trả kèm assignments');

  const badLvl = await call('PUT', `/resources/${resId}/skills`, { token: TOK.admin, body: { skills: [{ name: 'X', level: 9 }] } });
  ok(badLvl.status === 400, 'skill level 9 bị từ chối (chỉ 1-4)');

  const skills = await call('PUT', `/resources/${resId}/skills`, {
    token: TOK.admin, body: { skills: [{ name: 'Testing', level: 4 }, { name: 'React', level: 2 }] },
  });
  ok(skills.data.resource.skills.length === 2, 'Cập nhật skill matrix');

  const memberSkills = await call('PUT', `/resources/${resId}/skills`, {
    token: TOK.member, body: { skills: [{ name: 'Hacked', level: 4 }] },
  });
  ok(memberSkills.status === 403, 'Member sửa skill matrix của người khác → 403');

  const bySkill = await call('GET', '/resources?skill=Testing&skillLevel=3', { token: TOK.admin });
  ok(bySkill.data.resources.length >= 1, 'Tìm nhân sự theo skill + level');

  const virt = await call('GET', `/resources/${resId}`, { token: TOK.admin });
  ok('utilizationRate' in virt.data.resource && 'isOverloaded' in virt.data.resource, 'virtuals utilizationRate/isOverloaded có trong JSON');

  const delDept = await call('DELETE', `/departments/${deptId}`, { token: TOK.admin });
  ok(delDept.status === 400, 'Không xóa được phòng ban đang có nhân sự → 400');
}

// ══════════════════════════════════════════════
S('5b. Lịch nghỉ (unavailablePeriods)');
{
  const setLeave = (periods, token = TOK.admin) =>
    call('PUT', `/resources/${resId}`, { token, body: { unavailablePeriods: periods } });

  const saved = await setLeave([
    { startDate: '2026-10-01T00:00:00.000Z', endDate: '2026-10-05T23:59:59.000Z', reason: 'Nghỉ phép năm' },
    { startDate: '2026-11-10T00:00:00.000Z', endDate: '2026-11-12T23:59:59.000Z', reason: 'Công tác' },
  ]);
  ok(saved.status === 200 && saved.data.resource.unavailablePeriods.length === 2, 'Lưu 2 kỳ nghỉ → 200');
  ok(saved.data.resource.unavailablePeriods[0].reason === 'Nghỉ phép năm', 'Lý do được lưu kèm');

  const reversed = await setLeave([
    { startDate: '2026-10-10T00:00:00.000Z', endDate: '2026-10-01T00:00:00.000Z' },
  ]);
  ok(reversed.status === 400, 'Ngày kết thúc trước ngày bắt đầu → 400');

  const overlapping = await setLeave([
    { startDate: '2026-10-01T00:00:00.000Z', endDate: '2026-10-10T00:00:00.000Z' },
    { startDate: '2026-10-05T00:00:00.000Z', endDate: '2026-10-15T00:00:00.000Z' },
  ]);
  ok(overlapping.status === 400 && /chồng lên nhau/.test(overlapping.message || ''),
    'Hai kỳ nghỉ chồng nhau → 400');

  const badDate = await setLeave([{ startDate: 'tuần sau', endDate: '2026-10-05T00:00:00.000Z' }]);
  ok(badDate.status === 400, 'Ngày sai định dạng → 400');

  const notArray = await call('PUT', `/resources/${resId}`, {
    token: TOK.admin, body: { unavailablePeriods: 'nghỉ phép' },
  });
  ok(notArray.status === 400, 'Không phải mảng → 400');

  const memberEdit = await setLeave([], TOK.member);
  ok(memberEdit.status === 403, 'Member sửa lịch nghỉ của người khác → 403');

  // Kỳ nghỉ liền kề nhưng không giao nhau thì hợp lệ
  const adjacent = await setLeave([
    { startDate: '2026-10-01T00:00:00.000Z', endDate: '2026-10-05T00:00:00.000Z' },
    { startDate: '2026-10-06T00:00:00.000Z', endDate: '2026-10-09T00:00:00.000Z' },
  ]);
  ok(adjacent.status === 200, 'Hai kỳ nghỉ liền kề, không giao nhau → 200');

  const cleared = await setLeave([]);
  ok(cleared.status === 200 && cleared.data.resource.unavailablePeriods.length === 0,
    'Xóa hết lịch nghỉ → 200');
}

// ══════════════════════════════════════════════
S('6. Optimization — GA / CSP / Hybrid');
let gaId;
{
  const ga = await call('POST', '/optimization/run/genetic', {
    token: TOK.admin, body: { populationSize: 40, maxGenerations: 100 },
  });
  ok(ga.status === 200 && ga.data.result.status === 'completed', 'GA chạy xong');
  gaId = ga.data?.result?._id;
  const g = ga.data.result;
  ok(g.fitness > 0 && g.fitness <= 1, 'GA fitness trong khoảng (0,1]', `(${g.fitness})`);
  ok(g.metrics.averageSkillMatch >= 0 && g.metrics.averageSkillMatch <= 100, 'averageSkillMatch thang 0-100', `(${g.metrics.averageSkillMatch})`);
  ok(g.convergenceHistory.length > 0 && typeof g.convergenceHistory[0].generation === 'number',
    'convergenceHistory là mảng {generation, fitness}');
  ok(g.metrics.resourceUtilization.length > 0, 'metrics.resourceUtilization có dữ liệu');
  ok(typeof g.assignments[0].skillMatch === 'number', 'mỗi assignment có skillMatch');
  ok(g.executionTime >= 0 && 'generations' in g, 'có executionTime và generations');

  const csp = await call('POST', '/optimization/run/csp', { token: TOK.admin, body: {} });
  ok(csp.data.result.status === 'completed', 'CSP chạy xong');
  ok(csp.data.result.fitness > 0, 'CSP CÓ fitness (lỗi cũ: luôn 0)', `(${csp.data.result.fitness})`);
  ok(csp.data.result.metrics.resourceUtilization.length > 0, 'CSP có metrics đầy đủ');
  ok(typeof csp.data.result.assignments[0].skillMatch === 'number', 'CSP assignment có skillMatch');
  const cspViolations = csp.data.result.constraintReport.details.violated;
  ok(cspViolations.every((d) => d.type !== 'capacity'), 'CSP không vi phạm ràng buộc capacity');
  // Dữ liệu mẫu có công việc bắt đầu trước khi tiền nhiệm của nó kết thúc. Thuật toán
  // không đổi được ngày nên phải báo lại chứ không được im lặng bỏ qua (H4).
  ok(cspViolations.some((d) => d.type === 'dependency'),
    'CSP báo lại phụ thuộc sai thứ tự trong dữ liệu mẫu',
    cspViolations.find((d) => d.type === 'dependency')?.subject || '');

  const hy = await call('POST', '/optimization/run/hybrid', { token: TOK.admin, body: { populationSize: 30, maxGenerations: 50 } });
  ok(hy.data.result.status === 'completed', 'Hybrid chạy xong');
  ok('cspFeasible' in hy.data, 'Hybrid trả cờ cspFeasible');
  ok(hy.data.result.constraintReport !== undefined, 'Hybrid có constraintReport từ pha CSP');

  // Pha GA phải chạy trên miền do pha CSP lọc, không phải chạy rời rạc như trước.
  const reduction = hy.data.result.domainReduction;
  ok(reduction?.restricted === true, 'Hybrid: GA nhận miền giá trị từ CSP');
  ok(
    reduction.feasiblePairs <= reduction.totalPairs && reduction.totalPairs > 0,
    'Số cặp khả thi không vượt quá toàn bộ không gian',
    `${reduction.feasiblePairs}/${reduction.totalPairs}`
  );
  ok(typeof reduction.tasksReopened === 'number', 'Báo số task phải mở lại miền');

  const gaOnly = await call('POST', '/optimization/run/genetic', {
    token: TOK.admin, body: { populationSize: 30, maxGenerations: 50 },
  });
  ok(gaOnly.data.result.domainReduction?.restricted !== true,
    'Chạy GA đơn lẻ thì không thu hẹp miền — khác biệt thật giữa hai chế độ');

  const hist = await call('GET', '/optimization/history', { token: TOK.admin });
  ok(hist.data.results.length >= 3, 'Lịch sử có đủ các lần chạy');
  const recent = hist.data.results.slice(0, 3);
  ok(recent.every((r) => r.fitness > 0), 'Cả 3 thuật toán đều có fitness > 0 trong lịch sử',
    `(${recent.map((r) => r.algorithm + '=' + r.fitness).join(', ')})`);

  const gone = await call('GET', '/optimization/000000000000000000000000', { token: TOK.admin });
  ok(gone.status === 404, 'Kết quả không tồn tại → 404');

  const memberApply = await call('POST', `/optimization/${gaId}/apply`, { token: TOK.member });
  ok(memberApply.status === 403, 'Member áp dụng kết quả → 403');

  const applied = await call('POST', `/optimization/${gaId}/apply`, { token: TOK.admin });
  ok(applied.status === 200 && applied.data.appliedCount > 0, 'Admin áp dụng kết quả', `(${applied.data?.appliedCount} task)`);
  const twice = await call('POST', `/optimization/${gaId}/apply`, { token: TOK.admin });
  ok(twice.status === 400, 'Áp dụng lần 2 → 400');
}

// ══════════════════════════════════════════════
S('7. Analytics');
{
  const dash = await call('GET', '/analytics/dashboard', { token: TOK.admin });
  ok(dash.data.projects && dash.data.tasks && dash.data.resources, 'dashboard trả đủ 3 nhóm');
  ok(Array.isArray(dash.data.recentTasks) && Array.isArray(dash.data.recentOptimizations), 'dashboard có recentTasks/recentOptimizations');

  const util = await call('GET', '/analytics/utilization', { token: TOK.admin });
  ok('highBurnout' in util.data.summary, 'summary.highBurnout tồn tại (lỗi cũ: client đọc highBurnoutRisk)');
  ok(util.data.resources.every((r) => ['low', 'medium', 'high'].includes(r.burnoutRisk)), 'burnoutRisk chỉ nhận low/medium/high');
  ok(Array.isArray(util.data.departments), 'có tổng hợp theo phòng ban');
  const sorted = util.data.resources.every((r, i, a) => i === 0 || a[i - 1].utilization >= r.utilization);
  ok(sorted, 'resources sắp xếp giảm dần theo utilization');

  const ta = await call('GET', '/analytics/tasks', { token: TOK.admin });
  ok(Array.isArray(ta.data.byStatus) && Array.isArray(ta.data.byProject), 'analytics/tasks trả byStatus + byProject');
  ok(typeof ta.data.hours.efficiency === 'number', 'có chỉ số hiệu suất giờ');

  const cmp = await call('GET', `/analytics/optimization-comparison/${gaId}`, { token: TOK.admin });
  ok(typeof cmp.data.metrics?.before?.stdDev === 'number', 'metrics.before.stdDev là number');
  ok(typeof cmp.data.metrics?.after?.stdDev === 'number', 'metrics.after.stdDev là number');
  ok(typeof cmp.data.metrics?.after?.overloadedCount === 'number', 'metrics.after.overloadedCount là number');
  ok(typeof cmp.data.metrics?.after?.avgSkillMatch === 'number', 'metrics.after.avgSkillMatch là number');
  ok(cmp.data.resources.every((r) => r.resourceId && r.resourceName && 'beforeWorkload' in r && 'afterWorkload' in r),
    'resources[] đủ field cho bảng client');
  ok(Array.isArray(cmp.data.current) && Array.isArray(cmp.data.optimized), 'giữ tương thích ngược current/optimized');
}

// ══════════════════════════════════════════════
S('8. Notifications & Activity Logs');
{
  const n = await call('GET', '/notifications', { token: TOK.admin });
  ok(Array.isArray(n.data.notifications) && typeof n.unreadCount === 'number', 'GET /notifications + unreadCount');
  ok((await call('PATCH', '/notifications/read-all', { token: TOK.admin })).status === 200, 'Đánh dấu tất cả đã đọc');

  const logs = await call('GET', '/activity-logs', { token: TOK.admin });
  ok(logs.data.logs.length > 0, 'ActivityLog đã ghi nhận hành động', `(${logs.total} bản ghi)`);
  const actions = new Set(logs.data.logs.map((l) => l.action));
  ok(actions.has('CREATE_PROJECT') && actions.has('CREATE_TASK'), 'ghi nhận CREATE_PROJECT và CREATE_TASK');
  ok(actions.has('APPLY_OPTIMIZATION'), 'ghi nhận APPLY_OPTIMIZATION');
  ok(logs.data.logs.every((l) => l.description && l.entityType), 'mỗi log có description + entityType');

  const stats = await call('GET', '/activity-logs/stats', { token: TOK.admin });
  ok(typeof stats.data.total === 'number' && Array.isArray(stats.data.byEntityType), 'GET /activity-logs/stats');

  const memberClear = await call('DELETE', '/activity-logs', { token: TOK.member });
  ok(memberClear.status === 403, 'Member xóa nhật ký → 403');
}

// ══════════════════════════════════════════════
S('9. Dọn dẹp fixture');
{
  await call('DELETE', `/resources/${resId}`, { token: TOK.admin });
  const dd = await call('DELETE', `/departments/${deptId}`, { token: TOK.admin });
  ok(dd.status === 200, 'Xóa phòng ban sau khi hết nhân sự → 200');

  const noForce = await call('DELETE', `/projects/${projectId}`, { token: TOK.admin });
  ok(noForce.status === 400, 'Xóa dự án còn task → 400 (yêu cầu ?force=true)');
  const forced = await call('DELETE', `/projects/${projectId}?force=true`, { token: TOK.admin });
  ok(forced.status === 200, 'Xóa dự án với ?force=true → 200');
  const orphan = await call('GET', `/tasks/${taskB}`, { token: TOK.admin });
  ok(orphan.status === 404, 'Task của dự án đã xóa cũng bị xóa theo');
}

// ══════════════════════════════════════════════
process.exit(summary() ? 1 : 0);
