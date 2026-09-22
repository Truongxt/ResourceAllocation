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
const guestEmail = `khach.a.${stamp}@doitac.com`;
let guestId;

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
  const created = await call('POST', '/auth/guests', {
    token: TOK.admin,
    body: { name: 'Khách của công ty A', email: guestEmail, password: 'password123' },
  });
  guestId = created.data?.guest?._id;
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

S('Vai trò "khách" trong dự án nay dùng được');
{
  // Enum `Project.members[].role` trước đây không có 'guest', nên:
  //   - thêm thành viên với vai trò này bị Mongoose chặn (400),
  //   - nhánh `role === 'guest'` trong taskAccess.js không bao giờ chạy,
  //   - và công tắc `allowGuestCreateTask` (có cả trong model lẫn trên màn hình
  //     Chi tiết dự án) không điều khiển được gì.
  const guestToken = await login(guestEmail);
  ok(!!guestToken, 'Đăng nhập được bằng tài khoản khách');

  const proj = await call('POST', '/projects', {
    token: TOK.pm,
    body: {
      name: `Dự án có khách ${stamp}`,
      description: 'Kiểm thử vai trò guest',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
    },
  });
  const projectId = proj.data?.project?._id;
  ok(!!projectId, 'Tạo được dự án để mời khách vào', `status=${proj.status}`);

  const added = await call('POST', `/projects/${projectId}/members`, {
    token: TOK.pm,
    body: { user: guestId, role: 'guest', allocation: 0 },
  });
  ok(added.status === 201 || added.status === 200, 'Thêm được thành viên với vai trò guest', `status=${added.status}`);

  const savedRole = (added.data?.project?.members || []).find(
    (m) => String(m.user?._id || m.user) === String(guestId)
  )?.role;
  ok(savedRole === 'guest', 'Vai trò lưu đúng là guest chứ không rơi về mặc định', `role=${savedRole}`);

  const mkTask = () =>
    call('POST', '/tasks', {
      token: guestToken,
      body: {
        title: `Việc do khách tạo ${stamp}`,
        project: projectId,
        startDate: '2026-10-02',
        endDate: '2026-10-09',
        estimatedHours: 2,
      },
    });

  const blocked = await mkTask();
  ok(blocked.status === 403, 'Mặc định khách không tạo được công việc', `status=${blocked.status}`);
  ok(
    /Khách chưa được cấp quyền/i.test(blocked.message || ''),
    'Chặn bằng đúng nhánh dành cho khách, không phải nhánh thành viên thường',
    blocked.message
  );

  // Bật công tắc mà giao diện Chi tiết dự án vẫn hiển thị — trước bản vá, bật
  // hay tắt đều không đổi gì vì không ai từng là 'guest'.
  const toggled = await call('PATCH', `/projects/${projectId}/permissions`, {
    token: TOK.pm,
    body: { allowGuestCreateTask: true },
  });
  ok(toggled.status === 200, 'Bật allowGuestCreateTask thành công', `status=${toggled.status}`);

  const allowed = await mkTask();
  ok(allowed.status === 201, 'Bật rồi thì khách tạo được công việc', `status=${allowed.status}`);

  if (allowed.data?.task?._id) {
    await call('DELETE', `/tasks/${allowed.data.task._id}`, { token: TOK.pm });
  }
  await call('DELETE', `/projects/${projectId}?force=true`, { token: TOK.pm });
}

S('currentWorkload là tải tuần CAO ĐIỂM, không phải tổng giờ tích lũy');
{
  // Tính chất cần khẳng định: **cùng số giờ, trải dài khác nhau thì tải tuần khác
  // nhau**. Trước bản vá, cả hai ca dưới đây đều cộng đủ 80h và cho ra cùng một
  // con số — đó chính là lỗi đơn vị (tổng tích lũy đem so với năng lực TUẦN).
  //
  // Dùng một tài khoản mới tinh để mốc so sánh bằng 0, không phụ thuộc việc người
  // trong dữ liệu mẫu đang gánh bao nhiêu.
  const fresh = await call('POST', '/auth/users', {
    token: TOK.admin,
    body: { name: `Nhân sự đo tải ${stamp}`, email: `dotai.${stamp}@rao.com` },
  });
  ok(fresh.status === 201, 'Tạo được nhân sự mới để đo', `status=${fresh.status}`);
  const freshUserId = fresh.data?.user?._id;

  const resAfterCreate = await call('GET', '/resources?limit=100', { token: TOK.admin });
  const freshResource = (resAfterCreate.data?.resources || []).find(
    (r) => String(r.user?._id || r.user) === String(freshUserId)
  );
  ok(!!freshResource, 'Tài khoản mới có sẵn hồ sơ nhân sự đi kèm');

  const projects0 = await call('GET', '/projects', { token: TOK.pm });
  const projId0 = (projects0.data?.projects || [])[0]?._id;

  const peakOf = async () => {
    const res = await call('GET', `/resources/${freshResource._id}`, { token: TOK.admin });
    return {
      peak: res.data?.resource?.currentWorkload,
      unscheduled: res.data?.resource?.unscheduledWorkload,
    };
  };

  const makeTask = async (title, days, hours) => {
    const start = new Date();
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    return call('POST', '/tasks', {
      token: TOK.pm,
      body: {
        title,
        project: projId0,
        assignee: freshUserId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        estimatedHours: hours,
      },
    });
  };

  ok((await peakOf()).peak === 0, 'Chưa có việc thì tải tuần bằng 0');

  // 80 giờ trải 8 tuần ≈ 10 giờ/tuần.
  const longTask = await makeTask(`Việc dài 8 tuần ${stamp}`, 56, 80);
  const afterLong = await peakOf();
  ok(
    afterLong.peak > 0 && afterLong.peak < 20,
    '80h trải 8 tuần ra tải tuần nhỏ (không phải 80h)',
    `peak=${afterLong.peak}h`
  );

  await call('DELETE', `/tasks/${longTask.data.task._id}`, { token: TOK.pm });

  // Cũng 80 giờ nhưng dồn trong 5 ngày → vượt hẳn năng lực tuần.
  const shortTask = await makeTask(`Việc dồn 1 tuần ${stamp}`, 4, 80);
  const afterShort = await peakOf();
  ok(
    afterShort.peak > afterLong.peak,
    'Cùng 80h nhưng dồn 1 tuần thì tải tuần cao hơn hẳn',
    `dồn=${afterShort.peak}h so với trải=${afterLong.peak}h`
  );
  ok(afterShort.peak >= 40, 'Và vượt năng lực tuần (40h)', `peak=${afterShort.peak}h`);

  await call('DELETE', `/tasks/${shortTask.data.task._id}`, { token: TOK.pm });

  // Việc không có ngày: không trải lên trục thời gian được, phải vào mục riêng.
  const noDate = await call('POST', '/tasks', {
    token: TOK.pm,
    body: {
      title: `Việc chưa xếp lịch ${stamp}`,
      project: projId0,
      assignee: freshUserId,
      estimatedHours: 12,
    },
  });
  const afterNoDate = await peakOf();
  ok(afterNoDate.unscheduled === 12, 'Giờ việc chưa xếp lịch vào unscheduledWorkload', `=${afterNoDate.unscheduled}`);
  ok(afterNoDate.peak === 0, 'Và KHÔNG bị nhét vào tải tuần', `peak=${afterNoDate.peak}`);

  await call('DELETE', `/tasks/${noDate.data.task._id}`, { token: TOK.pm });
}


S('Trang Nhân sự và trang Báo cáo phải nói cùng một con số');
{
  // Hai trang lấy tải từ hai đường khác nhau: /resources đọc `currentWorkload` lưu
  // sẵn, /analytics/utilization tính live từ task trong phạm vi người gọi. Trước
  // đây chúng khớp nhau chỉ vì **cùng sai một kiểu** (cộng tổng tích lũy), nên sửa
  // một bên là lệch ngay — đó đúng là chuyện vừa xảy ra và bị lớp e2e bắt.
  // Nay cả hai gọi chung `weeklyLoadOf`, và bài này khóa lại điều đó.
  const util = await call('GET', '/analytics/utilization', { token: TOK.admin });
  const rows = util.data?.breakdown || util.data?.resources || [];
  ok(rows.length > 0, 'Báo cáo trả về danh sách nhân sự', `${rows.length} dòng`);

  const resList = await call('GET', '/resources?limit=100', { token: TOK.admin });
  const byName = new Map(
    (resList.data?.resources || []).map((r) => [r.user?.name || r.position, r.currentWorkload])
  );

  let compared = 0;
  let mismatch = null;
  for (const row of rows) {
    if (!byName.has(row.name)) continue;
    compared++;
    const fromResources = byName.get(row.name);
    // Cho sai số làm tròn 0.1h vì hai đường làm tròn ở hai chỗ khác nhau.
    if (Math.abs((fromResources || 0) - (row.workload || 0)) > 0.11) {
      mismatch = `${row.name}: /resources=${fromResources}h nhưng /reports=${row.workload}h`;
      break;
    }
  }
  ok(compared > 0, 'Có nhân sự xuất hiện ở cả hai nguồn để đối chiếu', `${compared} người`);
  ok(!mismatch, 'Mọi người đều khớp giữa hai nguồn', mismatch || '');
}

process.exit(summary() ? 1 : 0);
