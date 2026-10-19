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
S('Xóa dự án mình quản lý');
{
  const del = await call('DELETE', `/projects/${pmProject}?force=true`, { token: pm });
  ok(del.status === 200, 'PM xóa được dự án mình quản lý', `status=${del.status}`);
}

process.exit(summary() ? 1 : 0);
