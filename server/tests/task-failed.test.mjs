// Trạng thái "Thất bại" (Base Wework — Failed)
//
// Failed là trạng thái ĐÓNG và có hệ quả trong báo cáo, nên nó có ba lớp chặn mà các
// trạng thái khác không có: dự án phải bật tính năng, phải có lý do, và không được
// nhảy thẳng từ "Chờ đánh giá" sang. Bộ này kiểm cả ba, cộng với vết để lại trong DB.

import { call, ok, section as S, summary } from './helpers.mjs';

const TOK = {};
let projectId;
let memberId;
let outsiderId;

/** Tạo một công việc mới giao cho member, trả về id. */
const newTask = async (title) => {
  const res = await call('POST', '/tasks', {
    token: TOK.pm,
    body: {
      title,
      project: projectId,
      assignee: memberId,
      startDate: '2026-10-05',
      endDate: '2026-10-15',
      estimatedHours: 8,
    },
  });
  return res.data?.task?._id;
};

const setFailureConfig = (body) =>
  call('PATCH', `/projects/${projectId}/permissions`, { token: TOK.pm, body: { failureConfig: body } });

S('Thất bại: chuẩn bị dữ liệu');
{
  const pm = await call('POST', '/auth/login', { body: { email: 'pm@rao.com', password: 'password123' } });
  TOK.pm = pm.data?.token;

  const member = await call('POST', '/auth/login', { body: { email: 'nam.tran@rao.com', password: 'password123' } });
  TOK.member = member.data?.token;
  memberId = member.data?.user?._id;

  const outsider = await call('POST', '/auth/login', { body: { email: 'hoa.le@rao.com', password: 'password123' } });
  TOK.outsider = outsider.data?.token;
  outsiderId = outsider.data?.user?._id;

  ok(!!TOK.pm && !!TOK.member && !!TOK.outsider, 'Đăng nhập đủ ba vai trò');

  const proj = await call('POST', '/projects', {
    token: TOK.pm,
    body: {
      name: `Dự án kiểm thử Thất bại ${Date.now()}`,
      description: 'Kiểm thử trạng thái thất bại',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      members: [
        { user: memberId, role: 'developer', allocation: 100 },
        { user: outsiderId, role: 'developer', allocation: 50 },
      ],
    },
  });
  projectId = proj.data?.project?._id;
  ok(!!projectId, 'Tạo được dự án');
  ok(
    proj.data?.project?.failureConfig?.enabled === false,
    'Dự án mới mặc định TẮT tính năng đánh dấu thất bại'
  );
}

S('Thất bại: dự án chưa bật thì không ai đánh dấu được');
{
  const taskId = await newTask('Việc khi tính năng còn tắt');
  const res = await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.pm,
    body: { status: 'failed', failureReason: 'Khách hàng hủy hợp đồng' },
  });
  ok(res.status === 400, 'Dự án tắt failureConfig thì trả 400', `status=${res.status}`);
  ok(/chưa bật/i.test(res.message || ''), 'Câu trả lời nói rõ vì sao bị từ chối', res.message);
}

S('Thất bại: bật tính năng rồi mới đánh dấu được');
{
  const cfg = await setFailureConfig({ enabled: true, allowedRoles: [] });
  ok(cfg.status === 200, 'PM bật được failureConfig');
  ok(cfg.data?.failureConfig?.enabled === true, 'Cấu hình được lưu lại');

  const taskId = await newTask('Việc thiếu lý do');
  const noReason = await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.pm,
    body: { status: 'failed' },
  });
  ok(noReason.status === 400, 'Thiếu lý do thất bại trả 400', `status=${noReason.status}`);

  const blank = await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.pm,
    body: { status: 'failed', failureReason: '   ' },
  });
  ok(blank.status === 400, 'Lý do chỉ có khoảng trắng cũng bị từ chối');

  const done = await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.pm,
    body: { status: 'failed', failureReason: 'Phụ thuộc bên thứ ba không giao hàng' },
  });
  ok(done.status === 200, 'Có lý do thì đánh dấu được', `status=${done.status}`);
  ok(done.data?.task?.status === 'failed', 'Trạng thái đã là failed');

  const detail = await call('GET', `/tasks/${taskId}`, { token: TOK.pm });
  const task = detail.data?.task;
  ok(task?.failureReason === 'Phụ thuộc bên thứ ba không giao hàng', 'Lý do được lưu nguyên văn');
  ok(!!task?.failedAt, 'Có mốc thời gian đánh dấu');
  ok(!!task?.failedBy, 'Có người đánh dấu');
}

S('Thất bại: không đi tắt từ Chờ đánh giá');
{
  const taskId = await newTask('Việc đang chờ đánh giá');
  await call('PATCH', `/tasks/${taskId}/status`, { token: TOK.pm, body: { status: 'review' } });

  const direct = await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.pm,
    body: { status: 'failed', failureReason: 'Kết quả không đạt' },
  });
  ok(direct.status === 400, 'review → failed trực tiếp bị chặn 400', `status=${direct.status}`);

  const back = await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.pm,
    body: { status: 'in_progress' },
  });
  ok(back.status === 200, 'Quay về Đang làm thì được');

  const viaDetour = await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.pm,
    body: { status: 'failed', failureReason: 'Kết quả không đạt' },
  });
  ok(viaDetour.status === 200, 'review → in_progress → failed là đường vòng hợp lệ');
}

S('Thất bại: mở lại việc thì xóa vết cũ');
{
  const taskId = await newTask('Việc bị đóng rồi mở lại');
  await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.pm,
    body: { status: 'failed', failureReason: 'Đánh giá sai phạm vi' },
  });

  const reopen = await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.pm,
    body: { status: 'in_progress' },
  });
  ok(reopen.status === 200, 'Mở lại việc đã thất bại');

  const detail = await call('GET', `/tasks/${taskId}`, { token: TOK.pm });
  const task = detail.data?.task;
  ok(!task?.failureReason, 'Lý do thất bại cũ bị xóa', `còn lại="${task?.failureReason}"`);
  ok(!task?.failedAt && !task?.failedBy, 'Mốc thời gian và người đánh dấu cũng bị xóa');
}

S('Thất bại: quyền đánh dấu theo allowedRoles');
{
  await setFailureConfig({ enabled: true, allowedRoles: [] });
  const taskId = await newTask('Việc kiểm tra quyền');

  const denied = await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.member,
    body: { status: 'failed', failureReason: 'Không làm được' },
  });
  ok(denied.status === 403, 'Người thực hiện bị chặn 403 khi allowedRoles rỗng', `status=${denied.status}`);

  // Vẫn phải đổi được trạng thái thường — chặn nhầm cả luồng bình thường thì hỏng to.
  const normal = await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.member,
    body: { status: 'in_progress' },
  });
  ok(normal.status === 200, 'Nhưng người thực hiện vẫn đổi được trạng thái thường');

  await setFailureConfig({ enabled: true, allowedRoles: ['assignee'] });
  const allowed = await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.member,
    body: { status: 'failed', failureReason: 'Không làm được' },
  });
  ok(allowed.status === 200, 'Thêm "assignee" vào allowedRoles thì đánh dấu được', `status=${allowed.status}`);

  const other = await newTask('Việc của người khác');
  const byOutsider = await call('PATCH', `/tasks/${other}/status`, {
    token: TOK.outsider,
    body: { status: 'failed', failureReason: 'Tôi thấy việc này hỏng' },
  });
  ok(byOutsider.status === 403, 'Thành viên khác trong dự án vẫn bị chặn 403', `status=${byOutsider.status}`);
}

S('Thất bại: ảnh hưởng đúng tới báo cáo');
{
  const stats = await call('GET', '/analytics/dashboard', { token: TOK.pm });
  const tasks = stats.data?.tasks || {};
  ok(typeof tasks.failed === 'number' && tasks.failed > 0, 'Dashboard đếm riêng số việc thất bại', `failed=${tasks.failed}`);

  // Việc đã đóng không còn là việc "quá hạn": endDate 15/10/2026 đã ở quá khứ so với
  // thời điểm chạy test, nên nếu bị tính nhầm thì con số overdue sẽ nuốt chúng vào.
  const list = await call('GET', `/tasks?project=${projectId}&limit=100`, { token: TOK.pm });
  const failedTasks = (list.data?.tasks || []).filter((t) => t.status === 'failed');
  ok(failedTasks.length > 0, 'Có việc thất bại trong dự án để đối chiếu');

  const util = await call('GET', '/analytics/utilization', { token: TOK.pm });
  const rows = util.data?.resources || [];
  ok(
    rows.some((r) => typeof r.failedRate === 'number'),
    'Báo cáo theo thành viên có cột tỷ lệ thất bại'
  );
  ok(
    typeof util.data?.summary?.totalFailedTasks === 'number',
    'Thẻ tổng hợp có tổng số việc thất bại'
  );
}

process.exit(summary());
