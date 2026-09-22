// Luồng "Chờ đánh giá" (Base Wework — Review workflow có SLA)
//
// Điểm dễ sai nhất của luồng này không phải state machine mà là chỗ đo đúng/trễ hạn:
// phải tính theo lúc NGƯỜI LÀM bấm hoàn thành, không theo lúc người đánh giá duyệt.
// Bộ này chốt cả hai: các bước chuyển, và con số báo cáo không đổ oan cho người làm.

import { call, ok, section as S, summary } from './helpers.mjs';

const TOK = {};
let projectId;
let memberId;
let reviewerId;
let outsiderId;

const newTask = async (title, endDate = '2026-10-15') => {
  const res = await call('POST', '/tasks', {
    token: TOK.pm,
    body: {
      title,
      project: projectId,
      assignee: memberId,
      startDate: '2026-10-05',
      endDate,
      estimatedHours: 8,
    },
  });
  return res.data?.task?._id;
};

const setReviewConfig = (body) =>
  call('PATCH', `/projects/${projectId}/permissions`, { token: TOK.pm, body: { reviewConfig: body } });

S('Đánh giá: chuẩn bị dữ liệu');
{
  const pm = await call('POST', '/auth/login', { body: { email: 'pm@rao.com', password: 'password123' } });
  TOK.pm = pm.data?.token;

  const member = await call('POST', '/auth/login', { body: { email: 'nam.tran@rao.com', password: 'password123' } });
  TOK.member = member.data?.token;
  memberId = member.data?.user?._id;

  const reviewer = await call('POST', '/auth/login', { body: { email: 'hoa.le@rao.com', password: 'password123' } });
  TOK.reviewer = reviewer.data?.token;
  reviewerId = reviewer.data?.user?._id;

  const outsider = await call('POST', '/auth/login', { body: { email: 'tuan.pham@rao.com', password: 'password123' } });
  TOK.outsider = outsider.data?.token;
  outsiderId = outsider.data?.user?._id;

  ok(!!TOK.pm && !!TOK.member && !!TOK.reviewer && !!TOK.outsider, 'Đăng nhập đủ bốn vai trò');

  const proj = await call('POST', '/projects', {
    token: TOK.pm,
    body: {
      name: `Dự án kiểm thử Đánh giá ${Date.now()}`,
      description: 'Kiểm thử luồng đánh giá kết quả',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      members: [
        { user: memberId, role: 'developer', allocation: 100 },
        { user: reviewerId, role: 'developer', allocation: 50 },
        { user: outsiderId, role: 'developer', allocation: 50 },
      ],
    },
  });
  projectId = proj.data?.project?._id;
  ok(!!projectId, 'Tạo được dự án');
  ok(proj.data?.project?.reviewConfig?.enabled === false, 'Dự án mới mặc định TẮT đánh giá');
}

S('Đánh giá: dự án tắt thì giữ nguyên hành vi cũ');
{
  const taskId = await newTask('Việc khi chưa bật đánh giá');
  const res = await call('PATCH', `/tasks/${taskId}/complete`, { token: TOK.member });
  ok(res.status === 200, 'Người thực hiện báo hoàn thành trả 200', `status=${res.status}`);
  ok(res.data?.task?.status === 'done', 'Việc chuyển thẳng sang Hoàn thành');
  ok(res.data?.task?.progress === 100, 'Tiến độ đặt về 100%');
  ok(!!res.data?.task?.completedAt, 'completedAt vẫn được ghi kể cả khi tắt đánh giá');

  // Đường cũ PATCH /status cũng không đổi gì.
  const other = await newTask('Việc đổi trạng thái theo đường cũ');
  const direct = await call('PATCH', `/tasks/${other}/status`, { token: TOK.member, body: { status: 'done' } });
  ok(direct.status === 200, 'PATCH /status sang done vẫn chạy khi tắt đánh giá');
}

S('Đánh giá: bật rồi thì hoàn thành phải qua cửa người đánh giá');
{
  const cfg = await setReviewConfig({ enabled: true, reviewers: [reviewerId], slaHours: 24 });
  ok(cfg.status === 200, 'PM bật được reviewConfig');

  const taskId = await newTask('Việc cần được đánh giá');
  const complete = await call('PATCH', `/tasks/${taskId}/complete`, { token: TOK.member });
  ok(complete.status === 200, 'Báo hoàn thành trả 200');
  ok(complete.data?.task?.status === 'review', 'Việc dừng ở Chờ đánh giá, KHÔNG nhảy sang Hoàn thành');
  ok(!!complete.data?.task?.completedAt, 'Ghi mốc người làm bấm hoàn thành');
  ok(!!complete.data?.task?.reviewRequestedAt, 'Ghi mốc bắt đầu chờ đánh giá');

  // Người thực hiện không được tự tuyên bố xong.
  const selfDone = await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.member,
    body: { status: 'done' },
  });
  ok(selfDone.status === 400, 'Người thực hiện tự chuyển sang done bị chặn 400', `status=${selfDone.status}`);

  // Nộp báo cáo kết quả cũng không được đi vòng.
  const viaReport = await call('POST', `/tasks/${taskId}/report-result`, {
    token: TOK.member,
    body: { summary: 'Đã xong', markAsDone: true },
  });
  ok(viaReport.status === 200, 'Nộp báo cáo kết quả vẫn được');
  ok(
    viaReport.data?.task?.status === 'review',
    'Nhưng markAsDone không đưa việc sang Hoàn thành khi dự án bật đánh giá',
    `status=${viaReport.data?.task?.status}`
  );
}

S('Đánh giá: ai được duyệt');
{
  const taskId = await newTask('Việc kiểm tra quyền duyệt');
  await call('PATCH', `/tasks/${taskId}/complete`, { token: TOK.member });

  const byOutsider = await call('POST', `/tasks/${taskId}/review`, {
    token: TOK.outsider,
    body: { decision: 'approve' },
  });
  ok(byOutsider.status === 403, 'Người ngoài danh sách đánh giá bị chặn 403', `status=${byOutsider.status}`);

  const byAssignee = await call('POST', `/tasks/${taskId}/review`, {
    token: TOK.member,
    body: { decision: 'approve' },
  });
  ok(byAssignee.status === 403, 'Người thực hiện không tự duyệt việc của mình');

  const approved = await call('POST', `/tasks/${taskId}/review`, {
    token: TOK.reviewer,
    body: { decision: 'approve', comment: 'Đạt yêu cầu' },
  });
  ok(approved.status === 200, 'Người đánh giá duyệt được', `status=${approved.status}`);
  ok(approved.data?.task?.status === 'done', 'Duyệt xong thì việc sang Hoàn thành');
  ok(approved.data?.task?.reviewDecision === 'approved', 'Ghi lại quyết định approved');
  ok(!!approved.data?.task?.reviewedBy, 'Ghi lại ai duyệt');
}

S('Đánh giá: trả lại phải nói lý do');
{
  const taskId = await newTask('Việc bị trả lại');
  await call('PATCH', `/tasks/${taskId}/complete`, { token: TOK.member });

  const noComment = await call('POST', `/tasks/${taskId}/review`, {
    token: TOK.reviewer,
    body: { decision: 'reject' },
  });
  ok(noComment.status === 400, 'Trả lại mà không nêu lý do bị chặn 400', `status=${noComment.status}`);

  const rejected = await call('POST', `/tasks/${taskId}/review`, {
    token: TOK.reviewer,
    body: { decision: 'reject', comment: 'Thiếu phần kiểm thử' },
  });
  ok(rejected.status === 200, 'Trả lại kèm lý do thì được');
  ok(rejected.data?.task?.status === 'in_progress', 'Việc quay lại Đang làm');
  ok(rejected.data?.task?.reviewComment === 'Thiếu phần kiểm thử', 'Lý do trả lại được lưu');

  // Nộp lại vòng hai: dấu vết vòng trước phải được dọn.
  const again = await call('PATCH', `/tasks/${taskId}/complete`, { token: TOK.member });
  ok(again.data?.task?.status === 'review', 'Nộp lại thì việc về Chờ đánh giá');
  ok(again.data?.task?.reviewDecision === 'pending', 'Quyết định của vòng trước bị xóa');
  ok(!again.data?.task?.reviewedAt, 'Mốc duyệt của vòng trước bị xóa');
}

S('Đánh giá: không nhảy thẳng sang Thất bại');
{
  await call('PATCH', `/projects/${projectId}/permissions`, {
    token: TOK.pm,
    body: { failureConfig: { enabled: true, allowedRoles: [] } },
  });

  const taskId = await newTask('Việc chờ đánh giá rồi muốn đánh thất bại');
  await call('PATCH', `/tasks/${taskId}/complete`, { token: TOK.member });

  const direct = await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.pm,
    body: { status: 'failed', failureReason: 'Kết quả không dùng được' },
  });
  ok(direct.status === 400, 'review → failed vẫn bị chặn khi đã bật cả hai tính năng', `status=${direct.status}`);
}

S('Đánh giá: danh sách việc đang chờ');
{
  const list = await call('GET', '/tasks/pending-review', { token: TOK.reviewer });
  ok(list.status === 200, 'Người đánh giá xem được danh sách chờ', `status=${list.status}`);
  ok(Array.isArray(list.data?.tasks), 'Trả về mảng công việc');
  ok(
    list.data.tasks.every((t) => t.status === 'review'),
    'Mọi việc trong danh sách đều đang ở Chờ đánh giá'
  );
  ok(
    list.data.tasks.every((t) => typeof t.isOverdueReview === 'boolean'),
    'Mỗi việc kèm cờ quá hạn SLA'
  );
  ok(
    list.data.tasks.every((t) => t.isOverdueReview === false),
    'Việc vừa nộp chưa thể quá hạn SLA 24 giờ'
  );

  const byOutsider = await call('GET', '/tasks/pending-review', { token: TOK.outsider });
  ok(byOutsider.data?.tasks?.length === 0, 'Người không được giao đánh giá thì không thấy việc nào');
}

S('Đánh giá: đúng hạn tính theo lúc người làm bấm xong');
{
  // Hạn chót đặt ở tương lai: người làm bấm hoàn thành hôm nay là ĐÚNG HẠN, kể cả
  // khi người đánh giá duyệt muộn. Đây là quy tắc dễ cài sai nhất của cả luồng.
  const taskId = await newTask('Việc xong trước hạn', '2099-12-31');
  await call('PATCH', `/tasks/${taskId}/complete`, { token: TOK.member });
  const approved = await call('POST', `/tasks/${taskId}/review`, {
    token: TOK.reviewer,
    body: { decision: 'approve' },
  });
  ok(approved.status === 200, 'Duyệt xong việc làm trước hạn');

  const detail = await call('GET', `/tasks/${taskId}`, { token: TOK.pm });
  const task = detail.data?.task;
  ok(
    new Date(task.completedAt) <= new Date(task.endDate),
    'completedAt nằm trước hạn chót'
  );
  ok(
    new Date(task.reviewedAt) >= new Date(task.completedAt),
    'reviewedAt luôn sau completedAt — hai mốc tách bạch, không dùng lẫn'
  );

  const stats = await call('GET', '/analytics/dashboard', { token: TOK.pm });
  const t = stats.data?.tasks || {};
  ok(typeof t.completedOnTime === 'number', 'Dashboard có số việc hoàn thành đúng hạn');
  ok(t.completedOnTime > 0, 'Việc vừa duyệt được tính là đúng hạn', `onTime=${t.completedOnTime}`);
  ok(typeof t.completedLate === 'number', 'Dashboard có số việc hoàn thành sau hạn');
  ok(
    typeof t.completedWithoutTimestamp === 'number',
    'Việc xong từ trước khi có luồng đánh giá được đếm riêng, không nhét vào đúng hạn'
  );
  ok(typeof t.pendingReview === 'number', 'Dashboard có số việc đang chờ đánh giá');
  ok(typeof t.overdueReview === 'number', 'Dashboard có số việc chờ đánh giá quá SLA');
}

process.exit(summary());
