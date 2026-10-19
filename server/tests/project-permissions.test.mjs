// Thao tác quản lý một dự án — sửa, xóa, thành viên, nhóm công việc — chỉ dành cho Admin/Owner
// hoặc PM của chính dự án đó. Trước 19/10 các route này chỉ kiểm vai trò và công ty: PM sửa,
// xóa được dự án của PM khác, còn nhóm công việc thì ai trong công ty cũng tạo/sửa/xóa được.
// Giao diện ẩn nút theo đúng luật này, nên luật phải nằm ở server trước.
import { call, login, ok, section as S, summary } from './helpers.mjs';

const stamp = Date.now();
const admin = await login('admin@rao.com');
const pm = await login('pm@rao.com');
const member = await login('nam.tran@rao.com');
const memberId = (await call('GET', '/auth/me', { token: member })).data?.user?._id;
const otherId = (await call('GET', '/auth/users', { token: admin })).data?.users?.find((u) => u.email === 'hoa.le@rao.com')?._id;

const mkProject = async (token, name) => (await call('POST', '/projects', {
  token,
  body: { name: `${name} ${stamp}`, startDate: '2026-11-02', endDate: '2026-12-31', members: [{ user: memberId, role: 'developer', allocation: 50 }] },
})).data?.project?._id;

const adminProject = await mkProject(admin, 'Dự án admin quản lý');
const pmProject = await mkProject(pm, 'Dự án PM quản lý');
ok(!!adminProject && !!pmProject, 'Chuẩn bị: một dự án của admin, một dự án của PM');

// ══════════════════════════════════════════════
S('Sửa, xóa dự án: PM chỉ trên dự án mình quản lý');
{
  const edit = await call('PUT', `/projects/${adminProject}`, { token: pm, body: { description: 'PM sửa dự án người khác' } });
  ok(edit.status === 403, 'PM không sửa được dự án người khác quản lý', `status=${edit.status}`);
  const del = await call('DELETE', `/projects/${adminProject}?force=true`, { token: pm });
  ok(del.status === 403, 'PM không xóa được dự án người khác quản lý', `status=${del.status}`);
  const still = await call('GET', `/projects/${adminProject}`, { token: admin });
  ok(still.status === 200, 'Dự án của admin vẫn còn');

  const ownEdit = await call('PUT', `/projects/${pmProject}`, { token: pm, body: { description: 'PM sửa dự án mình' } });
  ok(ownEdit.status === 200, 'PM sửa được dự án mình quản lý', `status=${ownEdit.status}`);
  const adminEdit = await call('PUT', `/projects/${pmProject}`, { token: admin, body: { description: 'Admin sửa dự án của PM' } });
  ok(adminEdit.status === 200, 'Admin sửa được dự án bất kỳ trong công ty', `status=${adminEdit.status}`);
}

// ══════════════════════════════════════════════
S('Thành viên dự án: PM chỉ trên dự án mình quản lý');
{
  const add = await call('POST', `/projects/${adminProject}/members`, { token: pm, body: { user: otherId, role: 'developer', allocation: 20 } });
  ok(add.status === 403, 'PM không thêm được thành viên vào dự án người khác', `status=${add.status}`);
  const upd = await call('PUT', `/projects/${adminProject}/members/${memberId}`, { token: pm, body: { allocation: 10 } });
  ok(upd.status === 403, 'PM không sửa được thành viên của dự án người khác', `status=${upd.status}`);
  const rm = await call('DELETE', `/projects/${adminProject}/members/${memberId}`, { token: pm });
  ok(rm.status === 403, 'PM không gỡ được thành viên của dự án người khác', `status=${rm.status}`);

  const ownAdd = await call('POST', `/projects/${pmProject}/members`, { token: pm, body: { user: otherId, role: 'developer', allocation: 20 } });
  ok(ownAdd.status === 200 || ownAdd.status === 201, 'PM thêm được thành viên vào dự án mình', `status=${ownAdd.status} ${ownAdd.message || ''}`);
}

// ══════════════════════════════════════════════
S('Nhóm công việc: chỉ Admin/Owner hoặc PM của dự án');
{
  const byMember = await call('POST', '/task-groups', { token: member, body: { name: `Nhóm của member ${stamp}`, project: adminProject } });
  ok(byMember.status === 403, 'Thành viên không tạo được nhóm công việc', `status=${byMember.status}`);
  const byOtherPm = await call('POST', '/task-groups', { token: pm, body: { name: `Nhóm của PM khác ${stamp}`, project: adminProject } });
  ok(byOtherPm.status === 403, 'PM không tạo được nhóm trong dự án người khác', `status=${byOtherPm.status}`);

  const byAdmin = await call('POST', '/task-groups', { token: admin, body: { name: `Nhóm admin ${stamp}`, project: adminProject } });
  ok(byAdmin.status === 201, 'Admin tạo được nhóm', `status=${byAdmin.status}`);
  const groupId = byAdmin.data?.group?._id;

  const rename = await call('PUT', `/task-groups/${groupId}`, { token: member, body: { name: 'Đổi tên' } });
  ok(rename.status === 403, 'Thành viên không đổi tên được nhóm', `status=${rename.status}`);
  const reorder = await call('PUT', '/task-groups/reorder', { token: pm, body: { orderedIds: [groupId] } });
  ok(reorder.status === 403, 'PM không sắp xếp được nhóm của dự án người khác', `status=${reorder.status}`);
  const remove = await call('DELETE', `/task-groups/${groupId}`, { token: pm });
  ok(remove.status === 403, 'PM không xóa được nhóm của dự án người khác', `status=${remove.status}`);

  const view = await call('GET', `/task-groups/${adminProject}`, { token: member });
  ok(view.status === 200 && (view.data?.groups || []).some((g) => g._id === groupId), 'Thành viên vẫn xem được nhóm', `status=${view.status}`);

  const ownGroup = await call('POST', '/task-groups', { token: pm, body: { name: `Nhóm PM ${stamp}`, project: pmProject } });
  ok(ownGroup.status === 201, 'PM tạo được nhóm trong dự án mình', `status=${ownGroup.status}`);
  const ownRename = await call('PUT', `/task-groups/${ownGroup.data?.group?._id}`, { token: pm, body: { name: 'Đổi tên nhóm PM' } });
  ok(ownRename.status === 200, 'PM đổi tên được nhóm trong dự án mình', `status=${ownRename.status}`);
}

// ══════════════════════════════════════════════
// PM chỉ có quyền của PM trên dự án mình quản lý. Ở dự án khác — kể cả khi có tên trong đó —
// PM chỉ là một thành viên: theo công tắc của dự án và vai trò trên từng việc.
const pmId = (await call('GET', '/auth/me', { token: pm })).data?.user?._id;
await call('POST', `/projects/${adminProject}/members`, { token: admin, body: { user: pmId, role: 'developer', allocation: 20 } });
const mkTask = async (token, projectId, title, extra = {}) => (await call('POST', '/tasks', {
  token,
  body: { title: `${title} ${stamp}`, project: projectId, startDate: '2026-11-02', endDate: '2026-11-06', estimatedHours: 4, ...extra },
})).data?.task?._id;

S('Công việc ở dự án người khác: PM chỉ như thành viên');
{
  const othersTask = await mkTask(admin, adminProject, 'Việc admin giao Nam', { assignee: memberId });
  ok(!!othersTask, 'Admin tạo việc trong dự án mình, giao cho Nam');

  const edit = await call('PUT', `/tasks/${othersTask}`, { token: pm, body: { title: 'PM sửa việc người khác' } });
  ok(edit.status === 403, 'PM không sửa được việc không phải của mình', `status=${edit.status}`);
  const status = await call('PATCH', `/tasks/${othersTask}/status`, { token: pm, body: { status: 'in_progress' } });
  ok(status.status === 403, 'PM không đổi được trạng thái việc giao cho người khác', `status=${status.status}`);
  const del = await call('DELETE', `/tasks/${othersTask}`, { token: pm });
  ok(del.status === 403, 'PM không xóa được việc trong dự án người khác', `status=${del.status}`);

  // Là thành viên nên vẫn tạo được việc — dự án mặc định bật `allowMembersCreateTasks`.
  const asMember = await mkTask(pm, adminProject, 'PM tạo như thành viên');
  ok(!!asMember, 'PM tạo được việc trong dự án mình là thành viên (quyền thành viên)');

  const ownTask = await mkTask(pm, pmProject, 'Việc trong dự án PM', { assignee: memberId });
  const ownEdit = await call('PUT', `/tasks/${ownTask}`, { token: pm, body: { title: `PM sửa việc dự án mình ${stamp}` } });
  ok(ownEdit.status === 200, 'PM sửa được mọi việc trong dự án mình', `status=${ownEdit.status}`);
  const ownDel = await call('DELETE', `/tasks/${ownTask}`, { token: pm });
  ok(ownDel.status === 200, 'PM xóa được việc trong dự án mình', `status=${ownDel.status}`);
}

S('Duyệt kết quả: PM không duyệt được việc ở dự án người khác');
{
  await call('PATCH', `/projects/${adminProject}/permissions`, { token: admin, body: { reviewConfig: { enabled: true } } });
  const task = await mkTask(admin, adminProject, 'Việc cần duyệt', { assignee: memberId });
  const done = await call('PATCH', `/tasks/${task}/complete`, { token: member });
  ok(done.data?.task?.status === 'review', 'Nam báo xong → chờ duyệt', `status=${done.status} ${done.data?.task?.status}`);
  const byPm = await call('POST', `/tasks/${task}/review`, { token: pm, body: { decision: 'approve' } });
  ok(byPm.status === 403, 'PM không duyệt được', `status=${byPm.status}`);
  const byAdmin = await call('POST', `/tasks/${task}/review`, { token: admin, body: { decision: 'approve' } });
  ok(byAdmin.status === 200, 'Quản lý dự án (admin) duyệt được', `status=${byAdmin.status}`);
}

S('Bàn giao hàng loạt và việc lặp lại: PM chỉ trên dự án mình quản lý');
{
  const othersTask = await mkTask(admin, adminProject, 'Việc của Nam ở dự án admin', { assignee: memberId });
  const ownTask = await mkTask(pm, pmProject, 'Việc của Nam ở dự án PM', { assignee: memberId });
  const preview = await call('GET', `/tasks/reassign-preview?fromUserId=${memberId}`, { token: pm });
  const ids = (preview.data?.tasks || []).map((t) => t._id);
  ok(preview.status === 200 && ids.includes(ownTask), 'PM thấy việc của Nam trong dự án mình', `status=${preview.status}`);
  ok(!ids.includes(othersTask), 'PM không thấy (nên không bàn giao được) việc ở dự án người khác');

  const recurring = (projectId) => call('POST', '/recurring-tasks', {
    token: pm, body: { title: `Lặp ${stamp}`, project: projectId, frequency: 'weekly', daysOfWeek: [1], startDate: '2026-11-02', durationHours: 2 },
  });
  const others = await recurring(adminProject);
  ok(others.status === 403, 'PM không tạo được việc lặp lại ở dự án người khác', `status=${others.status}`);
  const own = await recurring(pmProject);
  ok(own.status === 201, 'PM tạo được việc lặp lại ở dự án mình', `status=${own.status}`);
  const ownId = own.data?.recurringTask?._id;
  const byOther = await call('DELETE', `/recurring-tasks/${ownId}`, { token: admin });
  ok(byOther.status === 200, 'Admin xóa được việc lặp lại ở mọi dự án', `status=${byOther.status}`);
}

// ══════════════════════════════════════════════
// App Admin `work` (quản trị ứng dụng Wework, do Owner cấp) tạo được dự án dù vai trò là thành
// viên — đồng bộ với tạo phòng ban. Người tạo thành người quản lý dự án, nên quản lý được dự án
// đó: luật gắn với dự án, không gắn với nhãn vai trò.
S('App Admin work: tạo dự án và quản lý dự án mình tạo');
{
  const regC = await call('POST', '/auth/register', {
    body: { name: 'Chủ C', email: `owner.c.${stamp}@c.com`, password: 'password123', companyName: `Công ty C perm ${stamp}` },
  });
  const ownerC = regC.data?.token;
  const mkUser = async (tag) => (await call('POST', '/auth/users', {
    token: ownerC, body: { name: `NV ${tag}`, email: `${tag}.${stamp}@c.com`, password: 'password123', role: 'member' },
  })).data?.user?._id;
  const workAdminId = await mkUser('workadmin');
  const plainId = await mkUser('plain');
  const grant = await call('PUT', `/auth/users/${workAdminId}/app-admin`, { token: ownerC, body: { appAdmins: ['work'] } });
  ok(grant.status === 200, 'Owner cấp App Admin work cho một thành viên', `status=${grant.status}`);
  const workAdmin = await login(`workadmin.${stamp}@c.com`);
  const plain = await login(`plain.${stamp}@c.com`);

  const blocked = await call('POST', '/projects', { token: plain, body: { name: `Thành viên thường ${stamp}`, startDate: '2026-11-02', endDate: '2026-12-31' } });
  ok(blocked.status === 403, 'Thành viên thường không tạo được dự án (công ty để mặc định)', `status=${blocked.status}`);

  const created = await call('POST', '/projects', { token: workAdmin, body: { name: `Dự án của App Admin ${stamp}`, startDate: '2026-11-02', endDate: '2026-12-31' } });
  ok(created.status === 201, 'App Admin work tạo được dự án', `status=${created.status} ${created.message || ''}`);
  const own = created.data?.project?._id;
  ok(String(created.data?.project?.manager?._id || created.data?.project?.manager) === String(workAdminId), 'Người tạo là người quản lý dự án');

  const edit = await call('PUT', `/projects/${own}`, { token: workAdmin, body: { description: 'Sửa dự án mình tạo' } });
  ok(edit.status === 200, 'Người quản lý (vai trò thành viên) sửa được dự án mình', `status=${edit.status}`);
  const addMember = await call('POST', `/projects/${own}/members`, { token: workAdmin, body: { user: plainId, role: 'developer', allocation: 30 } });
  ok(addMember.status === 200 || addMember.status === 201, 'Thêm được thành viên vào dự án mình', `status=${addMember.status}`);
  const recurring = await call('POST', '/recurring-tasks', {
    token: workAdmin, body: { title: `Lặp C ${stamp}`, project: own, frequency: 'weekly', daysOfWeek: [1], startDate: '2026-11-02', durationHours: 2 },
  });
  ok(recurring.status === 201, 'Cấu hình được việc lặp lại trong dự án mình', `status=${recurring.status}`);
  await call('DELETE', `/recurring-tasks/${recurring.data?.recurringTask?._id}`, { token: workAdmin });
  const archive = await call('POST', `/projects/${own}/archive`, { token: workAdmin });
  ok(archive.status === 200, 'Lưu trữ được dự án mình', `status=${archive.status}`);

  const byPlain = await call('PUT', `/projects/${own}`, { token: plain, body: { description: 'Thành viên sửa' } });
  ok(byPlain.status === 403 || byPlain.status === 409, 'Thành viên của dự án vẫn không sửa được dự án', `status=${byPlain.status}`);
}

// ══════════════════════════════════════════════
S('Xóa dự án mình quản lý');
{
  const del = await call('DELETE', `/projects/${pmProject}?force=true`, { token: pm });
  ok(del.status === 200, 'PM xóa được dự án mình quản lý', `status=${del.status}`);
}

process.exit(summary() ? 1 : 0);
