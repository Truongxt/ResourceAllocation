// Bàn giao công việc hàng loạt (Base Wework — Bulk reassign)
//
// Nghiệp vụ thật: nhân sự nghỉ việc hoặc điều chuyển, cần chuyển toàn bộ việc đang mở
// sang người khác trong một thao tác. Thứ dễ hỏng nhất là PHẠM VI: đổi rộng hơn ý
// định thì cuốn theo cả việc ở dự án khác, và đổi cả việc đã đóng thì viết lại lịch
// sử ai đã thực sự làm.

import { call, ok, section as S, summary } from './helpers.mjs';

const TOK = {};
let projectA;
let projectB;
let fromUserId;
let toUserId;

const newTask = async (title, projectId, assignee) => {
  const res = await call('POST', '/tasks', {
    token: TOK.pm,
    body: {
      title,
      project: projectId,
      assignee,
      startDate: '2026-10-05',
      endDate: '2026-10-15',
      estimatedHours: 5,
    },
  });
  return res.data?.task?._id;
};

const assigneeOf = async (taskId) => {
  const res = await call('GET', `/tasks/${taskId}`, { token: TOK.pm });
  const a = res.data?.task?.assignee;
  return String(a?._id || a || '');
};

S('Bàn giao: chuẩn bị dữ liệu');
{
  const admin = await call('POST', '/auth/login', { body: { email: 'admin@rao.com', password: 'password123' } });
  TOK.admin = admin.data?.token;

  const pm = await call('POST', '/auth/login', { body: { email: 'pm@rao.com', password: 'password123' } });
  TOK.pm = pm.data?.token;

  const from = await call('POST', '/auth/login', { body: { email: 'nam.tran@rao.com', password: 'password123' } });
  TOK.member = from.data?.token;
  fromUserId = from.data?.user?._id;

  const to = await call('POST', '/auth/login', { body: { email: 'hoa.le@rao.com', password: 'password123' } });
  toUserId = to.data?.user?._id;

  ok(!!TOK.admin && !!TOK.pm && !!fromUserId && !!toUserId, 'Đăng nhập đủ các vai trò');

  const members = [
    { user: fromUserId, role: 'developer', allocation: 100 },
    { user: toUserId, role: 'developer', allocation: 100 },
  ];

  const a = await call('POST', '/projects', {
    token: TOK.pm,
    body: {
      name: `Dự án A bàn giao ${Date.now()}`,
      description: 'Dự án chính',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      members,
    },
  });
  projectA = a.data?.project?._id;

  const b = await call('POST', '/projects', {
    token: TOK.pm,
    body: {
      name: `Dự án B không liên quan ${Date.now()}`,
      description: 'Dự án phải đứng ngoài lệnh bàn giao',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      members,
    },
  });
  projectB = b.data?.project?._id;

  ok(!!projectA && !!projectB, 'Tạo được hai dự án');
}

S('Bàn giao: xem trước đúng tập sẽ bị đổi');
{
  const open1 = await newTask('A — việc đang mở 1', projectA, fromUserId);
  const open2 = await newTask('A — việc đang mở 2', projectA, fromUserId);
  const closed = await newTask('A — việc đã xong', projectA, fromUserId);
  await call('PATCH', `/tasks/${closed}/status`, { token: TOK.pm, body: { status: 'done' } });
  const otherProject = await newTask('B — việc ở dự án khác', projectB, fromUserId);

  const preview = await call('GET', `/tasks/reassign-preview?fromUserId=${fromUserId}&projectId=${projectA}`, {
    token: TOK.pm,
  });
  ok(preview.status === 200, 'PM xem trước được', `status=${preview.status}`);

  const ids = (preview.data?.tasks || []).map((t) => String(t._id));
  ok(ids.includes(String(open1)) && ids.includes(String(open2)), 'Hai việc đang mở nằm trong tập');
  ok(!ids.includes(String(closed)), 'Việc đã Hoàn thành KHÔNG nằm trong tập');
  ok(!ids.includes(String(otherProject)), 'Việc ở dự án khác KHÔNG nằm trong tập');
  ok(typeof preview.data?.totalEstimatedHours === 'number', 'Có tổng giờ ước tính để ước lượng tải');

  const noUser = await call('GET', '/tasks/reassign-preview', { token: TOK.pm });
  ok(noUser.status === 400, 'Thiếu người bàn giao trả 400');
}

S('Bàn giao: chỉ Admin/PM được gọi');
{
  const byMember = await call('POST', '/tasks/bulk-reassign', {
    token: TOK.member,
    body: { fromUserId, toUserId, projectId: projectA },
  });
  ok(byMember.status === 403, 'Thành viên thường bị chặn 403', `status=${byMember.status}`);

  const previewByMember = await call('GET', `/tasks/reassign-preview?fromUserId=${fromUserId}`, {
    token: TOK.member,
  });
  ok(previewByMember.status === 403, 'Thành viên thường cũng không xem trước được');
}

S('Bàn giao: giới hạn theo danh sách taskIds');
{
  const t1 = await newTask('Chọn đích danh 1', projectA, fromUserId);
  const t2 = await newTask('Chọn đích danh 2', projectA, fromUserId);
  const t3 = await newTask('Không được đụng tới', projectA, fromUserId);

  const res = await call('POST', '/tasks/bulk-reassign', {
    token: TOK.pm,
    body: { fromUserId, toUserId, taskIds: [t1, t2], reason: 'Điều chuyển nội bộ' },
  });
  ok(res.status === 200, 'Bàn giao theo danh sách trả 200', `status=${res.status}`);
  ok(res.data?.movedCount === 2, 'Đúng hai việc được đổi', `movedCount=${res.data?.movedCount}`);

  ok((await assigneeOf(t1)) === String(toUserId), 'Việc 1 đã sang người nhận');
  ok((await assigneeOf(t2)) === String(toUserId), 'Việc 2 đã sang người nhận');
  ok((await assigneeOf(t3)) === String(fromUserId), 'Việc không được chọn vẫn thuộc người cũ');
}

S('Bàn giao: giới hạn theo dự án');
{
  const inA = await newTask('A — sẽ bị bàn giao', projectA, fromUserId);
  const inB = await newTask('B — phải đứng ngoài', projectB, fromUserId);

  const res = await call('POST', '/tasks/bulk-reassign', {
    token: TOK.pm,
    body: { fromUserId, toUserId, projectId: projectA },
  });
  ok(res.status === 200, 'Bàn giao theo dự án trả 200');

  ok((await assigneeOf(inA)) === String(toUserId), 'Việc trong dự án A đã đổi chủ');
  ok((await assigneeOf(inB)) === String(fromUserId), 'Việc ở dự án B không bị đụng tới');
}

S('Bàn giao: không đụng việc đã ngã ngũ');
{
  const doneTask = await newTask('Việc đã hoàn thành', projectA, fromUserId);
  await call('PATCH', `/tasks/${doneTask}/status`, { token: TOK.pm, body: { status: 'done' } });

  const failedTask = await newTask('Việc đã thất bại', projectA, fromUserId);
  await call('PATCH', `/projects/${projectA}/permissions`, {
    token: TOK.pm,
    body: { failureConfig: { enabled: true, allowedRoles: [] } },
  });
  await call('PATCH', `/tasks/${failedTask}/status`, {
    token: TOK.pm,
    body: { status: 'failed', failureReason: 'Hủy theo yêu cầu khách hàng' },
  });

  const openTask = await newTask('Việc còn mở', projectA, fromUserId);

  const res = await call('POST', '/tasks/bulk-reassign', {
    token: TOK.pm,
    body: { fromUserId, toUserId, projectId: projectA },
  });
  ok(res.status === 200, 'Lệnh bàn giao chạy');
  ok((await assigneeOf(openTask)) === String(toUserId), 'Việc còn mở đã đổi chủ');
  ok((await assigneeOf(doneTask)) === String(fromUserId), 'Việc đã Hoàn thành giữ nguyên người làm');
  ok((await assigneeOf(failedTask)) === String(fromUserId), 'Việc đã Thất bại cũng giữ nguyên người làm');
}

S('Bàn giao: việc chờ đánh giá đổi người làm nhưng không đổi người duyệt');
{
  await call('PATCH', `/projects/${projectA}/permissions`, {
    token: TOK.pm,
    body: { reviewConfig: { enabled: true, reviewers: [toUserId], slaHours: 24 } },
  });

  const taskId = await newTask('Việc đang chờ đánh giá', projectA, fromUserId);
  await call('PATCH', `/tasks/${taskId}/complete`, { token: TOK.member });

  const before = await call('GET', `/tasks/${taskId}`, { token: TOK.pm });
  ok(before.data?.task?.status === 'review', 'Việc đang ở Chờ đánh giá');

  await call('POST', '/tasks/bulk-reassign', {
    token: TOK.pm,
    body: { fromUserId, toUserId, taskIds: [taskId] },
  });

  const after = await call('GET', `/tasks/${taskId}`, { token: TOK.pm });
  ok(String(after.data?.task?.assignee?._id || after.data?.task?.assignee) === String(toUserId),
    'Người thực hiện đã đổi');
  ok(after.data?.task?.status === 'review', 'Vẫn ở Chờ đánh giá, không bị reset trạng thái');
  ok((after.data?.task?.reviewers || []).length === 0, 'reviewers cấp công việc không bị lệnh bàn giao ghi đè');
}

S('Bàn giao: các trường hợp bị từ chối');
{
  const same = await call('POST', '/tasks/bulk-reassign', {
    token: TOK.pm,
    body: { fromUserId, toUserId: fromUserId },
  });
  ok(same.status === 400, 'Bàn giao cho chính mình trả 400');

  const ghost = await call('POST', '/tasks/bulk-reassign', {
    token: TOK.pm,
    body: { fromUserId, toUserId: '0123456789abcdef01234567' },
  });
  ok(ghost.status === 404, 'Người nhận không tồn tại trả 404', `status=${ghost.status}`);

  const nothing = await call('POST', '/tasks/bulk-reassign', {
    token: TOK.pm,
    body: { fromUserId: toUserId, toUserId: fromUserId, projectId: projectB, taskIds: ['0123456789abcdef01234567'] },
  });
  ok(nothing.status === 400, 'Không có việc nào phù hợp thì trả 400 chứ không báo thành công');
}

S('Bàn giao: để lại đúng một vết trong nhật ký');
{
  const logs = await call('GET', '/activity-logs?action=BULK_REASSIGN&limit=50', { token: TOK.admin });
  const entries = (logs.data?.logs || logs.data?.activityLogs || []).filter(
    (l) => l.action === 'BULK_REASSIGN'
  );
  ok(entries.length > 0, 'Có bản ghi BULK_REASSIGN trong nhật ký', `số bản ghi=${entries.length}`);

  const latest = entries[0];
  ok(Array.isArray(latest?.details?.taskIds), 'Bản ghi liệt kê các công việc đã đổi');
  ok(!!latest?.details?.fromUserId && !!latest?.details?.toUserId, 'Bản ghi nêu rõ từ ai sang ai');
}

process.exit(summary());
