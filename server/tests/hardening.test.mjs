// Năm bản vá của đợt rà soát `FEATURES.md` — những chỗ lớp e2e **không** chứng
// minh được.
//
// Vì sao không để chúng ở `e2e/`: xem bảng "Chọn lớp cho từng bản vá" trong
// `docs/TESTING.md`. Tóm tắt — phân lập công ty cần hai công ty mà hệ thống
// không có endpoint xóa User (bộ e2e dùng chung một database và sẽ để rác vĩnh
// viễn); payload sai dạng là thứ giao diện không gửi được; còn `order` của
// checklist thì màn hình render theo thứ tự mảng nên nhìn vào đó không phân
// biệt được đã sửa hay chưa.
//
// Ở đây thì cả năm đều kiểm được thẳng thắn: runner seed lại database trước
// từng bộ, và gọi API thì muốn gửi gì cũng được.

import { call, login, ok, section as S, summary } from './helpers.mjs';

const TOK = {};
const stamp = Date.now();

S('Chuẩn bị: hai công ty tách biệt');
{
  TOK.admin = await login('admin@rao.com');
  TOK.pm = await login('pm@rao.com');
  ok(!!TOK.admin && !!TOK.pm, 'Đăng nhập được công ty A (Công ty Công nghệ RAO)');

  // Đăng ký kèm `companyName` tạo hẳn một công ty mới, người đăng ký thành
  // Owner + admin của công ty đó — đúng đường mà người dùng thật đi.
  const reg = await call('POST', '/auth/register', {
    body: {
      name: 'Chủ Công Ty B',
      email: `owner.b.${stamp}@congtyb.com`,
      password: 'password123',
      companyName: `Công ty B ${stamp}`,
    },
  });
  TOK.ownerB = reg.data?.token;
  ok(reg.status === 201 && !!TOK.ownerB, 'Tạo được công ty B qua đăng ký', `status=${reg.status}`);
  ok(reg.data?.user?.isOwner === true, 'Người đăng ký công ty B là Owner của công ty đó');
}

S('Phân lập công ty: GET /auth/guests');
{
  const guestEmail = `khach.a.${stamp}@doitac.com`;
  const created = await call('POST', '/auth/guests', {
    token: TOK.admin,
    body: { name: 'Khách của công ty A', email: guestEmail, password: 'password123' },
  });
  ok(created.status === 201, 'Công ty A tạo được tài khoản khách', `status=${created.status}`);

  const seenByA = await call('GET', '/auth/guests', { token: TOK.admin });
  ok(
    (seenByA.data?.guests || []).some((g) => g.email === guestEmail),
    'Công ty A nhìn thấy khách của chính mình'
  );

  // Trước khi sửa, endpoint trả **mọi** tài khoản isGuest trên toàn hệ thống.
  const seenByB = await call('GET', '/auth/guests', { token: TOK.ownerB });
  ok(
    !(seenByB.data?.guests || []).some((g) => g.email === guestEmail),
    'Công ty B KHÔNG nhìn thấy khách của công ty A',
    `B thấy ${(seenByB.data?.guests || []).length} khách`
  );
}

S('Phân lập công ty: special-grants và app-admin');
{
  // Lấy id một tài khoản của công ty A để công ty B thử đụng vào.
  const usersA = await call('GET', '/auth/users', { token: TOK.admin });
  const victim = (usersA.data?.users || []).find((u) => u.email === 'nam.tran@rao.com');
  ok(!!victim, 'Có tài khoản công ty A để thử ranh giới');

  // Owner công ty B qua được cửa vai trò (isOwner/admin) — cửa duy nhất còn lại
  // đúng là cái vừa thêm. Trước khi sửa, hai lời gọi này trả 200.
  const grants = await call('PUT', `/auth/users/${victim._id}/special-grants`, {
    token: TOK.ownerB,
    body: { specialGrants: ['can_change_email'] },
  });
  ok(grants.status === 403, 'Công ty B không cấp được quyền đặc biệt cho người công ty A', `status=${grants.status}`);

  const appAdmin = await call('PUT', `/auth/users/${victim._id}/app-admin`, {
    token: TOK.ownerB,
    body: { appAdmins: ['optimize'] },
  });
  ok(appAdmin.status === 403, 'Công ty B không phong được App Admin cho người công ty A', `status=${appAdmin.status}`);

  // Và phải chắc là dữ liệu thật sự không đổi, chứ không chỉ mã trạng thái đẹp.
  const after = await call('GET', '/auth/users', { token: TOK.admin });
  const victimAfter = (after.data?.users || []).find((u) => u.email === 'nam.tran@rao.com');
  ok(
    !(victimAfter?.specialGrants || []).includes('can_change_email') &&
      !(victimAfter?.appAdmins || []).includes('optimize'),
    'Hồ sơ người công ty A không bị sửa gì'
  );
}

S('POST /auth/users không trả mật khẩu dạng rõ');
{
  const res = await call('POST', '/auth/users', {
    token: TOK.admin,
    body: { name: `Nhân sự mới ${stamp}`, email: `moi.${stamp}@rao.com` },
  });
  ok(res.status === 201, 'Tạo tài khoản thành công', `status=${res.status}`);

  // Email đang tắt (mặc định, và NODE_ENV=test), nên đây chính là nhánh từng lộ
  // `plainPassword` ra response.
  ok(res.data?.emailStatus?.simulated === true, 'Đang ở nhánh email mô phỏng — đúng nhánh từng rò');

  const body = JSON.stringify(res.data || {});
  ok(!body.includes('plainPassword'), 'Response không chứa khóa plainPassword');
  ok(!body.includes('123456'), 'Response không chứa mật khẩu mặc định dạng rõ');
  ok(!!res.data?.emailStatus?.preview?.email, 'Vẫn giữ lại email trong preview để còn dùng được');
}

S('POST /tasks/:id/move kiểm dự án đích và tiền nhiệm');
{
  const projects = await call('GET', '/projects', { token: TOK.pm });
  const [projA, projB] = projects.data?.projects || [];
  ok(!!projA && !!projB, 'Dữ liệu mẫu có ít nhất hai dự án');

  const mk = async (title) =>
    call('POST', '/tasks', {
      token: TOK.pm,
      body: { title, project: projA._id, startDate: '2026-10-01', endDate: '2026-10-10', estimatedHours: 4 },
    });

  const first = await mk(`Tiền nhiệm ${stamp}`);
  const second = await call('POST', '/tasks', {
    token: TOK.pm,
    body: {
      title: `Kế nhiệm ${stamp}`,
      project: projA._id,
      startDate: '2026-10-11',
      endDate: '2026-10-20',
      estimatedHours: 4,
      dependencies: [{ task: first.data?.task?._id, type: 'finish_to_start' }],
    },
  });
  ok(second.status === 201, 'Tạo được cặp công việc có phụ thuộc', `status=${second.status}`);

  const ghost = await call('POST', `/tasks/${second.data.task._id}/move`, {
    token: TOK.pm,
    body: { targetProjectId: '000000000000000000000000' },
  });
  ok(ghost.status === 404, 'Chuyển sang dự án không tồn tại trả 404', `status=${ghost.status}`);

  const crossProject = await call('POST', `/tasks/${second.data.task._id}/move`, {
    token: TOK.pm,
    body: { targetProjectId: projB._id },
  });
  ok(crossProject.status === 400, 'Chuyển đi mà tiền nhiệm ở lại dự án cũ trả 400', `status=${crossProject.status}`);

  // Kiểm tác dụng phụ, không chỉ mã trạng thái: task phải còn nguyên ở dự án cũ.
  const after = await call('GET', `/tasks/${second.data.task._id}`, { token: TOK.pm });
  ok(
    String(after.data?.task?.project?._id || after.data?.task?.project) === String(projA._id),
    'Công việc vẫn nằm ở dự án cũ sau khi bị từ chối'
  );

  await call('DELETE', `/tasks/${second.data.task._id}`, { token: TOK.pm });
  await call('DELETE', `/tasks/${first.data.task._id}`, { token: TOK.pm });
}

S('POST /tasks/:id/report-result chặn payload sai dạng bằng tiếng Việt');
{
  const projects = await call('GET', '/projects', { token: TOK.pm });
  const projA = (projects.data?.projects || [])[0];
  const task = await call('POST', '/tasks', {
    token: TOK.pm,
    body: { title: `Báo cáo ${stamp}`, project: projA._id, startDate: '2026-10-01', endDate: '2026-10-10', estimatedHours: 4 },
  });

  const bad = await call('POST', `/tasks/${task.data.task._id}/report-result`, {
    token: TOK.pm,
    body: { summary: 'Xong', deliverableLinks: ['https://example.com/pr/1'] },
  });
  ok(bad.status === 400, 'Mảng chuỗi bị từ chối 400', `status=${bad.status}`);
  // Trước khi sửa, câu này là nguyên văn lỗi Mongoose:
  // "Cast to embedded failed ... ObjectParameterError".
  ok(
    /mảng đối tượng/i.test(bad.message || ''),
    'Thông báo là câu tiếng Việt viết tay, không phải lỗi cast của Mongoose',
    bad.message
  );

  const good = await call('POST', `/tasks/${task.data.task._id}/report-result`, {
    token: TOK.pm,
    body: { summary: 'Xong', deliverableLinks: [{ title: 'PR', url: 'https://example.com/pr/1' }] },
  });
  ok(good.status === 200, 'Đúng dạng object thì vẫn nộp được', `status=${good.status}`);

  await call('DELETE', `/tasks/${task.data.task._id}`, { token: TOK.pm });
}

S('Xóa mục checklist thì đánh lại order');
{
  const projects = await call('GET', '/projects', { token: TOK.pm });
  const projA = (projects.data?.projects || [])[0];
  const task = await call('POST', '/tasks', {
    token: TOK.pm,
    body: { title: `Checklist ${stamp}`, project: projA._id, startDate: '2026-10-01', endDate: '2026-10-10', estimatedHours: 4 },
  });
  const taskId = task.data.task._id;

  for (const title of ['Mục 1', 'Mục 2', 'Mục 3']) {
    await call('POST', `/tasks/${taskId}/checklist`, { token: TOK.pm, body: { title } });
  }

  const before = await call('GET', `/tasks/${taskId}`, { token: TOK.pm });
  const middle = (before.data?.task?.checklist || []).find((c) => c.title === 'Mục 2');
  ok(!!middle, 'Có đủ ba mục checklist');

  await call('DELETE', `/tasks/${taskId}/checklist/${middle._id}`, { token: TOK.pm });

  // Thêm mục mới: nó lấy `order = checklist.length`. Nếu xóa không đánh lại số
  // thì mục này trùng order với mục còn lại, và thứ tự hiển thị chỉ còn phụ
  // thuộc vào thứ tự mảng — đúng lỗi đã sửa.
  await call('POST', `/tasks/${taskId}/checklist`, { token: TOK.pm, body: { title: 'Mục 4' } });

  const after = await call('GET', `/tasks/${taskId}`, { token: TOK.pm });
  const orders = (after.data?.task?.checklist || []).map((c) => c.order);
  ok(orders.length === 3, 'Còn lại ba mục', `orders=[${orders}]`);
  ok(new Set(orders).size === orders.length, 'Không có order nào trùng nhau', `orders=[${orders}]`);
  ok(
    orders.join(',') === '0,1,2',
    'Order liền mạch từ 0 theo đúng vị trí hiển thị',
    `orders=[${orders}]`
  );

  await call('DELETE', `/tasks/${taskId}`, { token: TOK.pm });
}

process.exit(summary() ? 1 : 0);
