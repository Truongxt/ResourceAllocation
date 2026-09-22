// Thông báo và phiên đăng nhập — hai chỗ lỗi không làm request nào đỏ
//
// Cả bốn ca dưới đây trước khi sửa đều trả 200 kèm body hợp lệ. Cái mất đi nằm
// ngoài response: thông báo không được tạo, danh sách phiên trả về rỗng. Không
// bộ test nào dựa trên mã trạng thái bắt được loại lỗi này, nên ở đây kiểm tác
// dụng phụ: đếm bản ghi thực tế sau mỗi lời gọi.

import { call, ok, section as S, summary } from './helpers.mjs';

const TOK = {};
let projectId;
let assigneeId;
let followerId;
let taskId;

S('Chuẩn bị dữ liệu');
{
  const pm = await call('POST', '/auth/login', { body: { email: 'pm@rao.com', password: 'password123' } });
  TOK.pm = pm.data?.token;

  const assignee = await call('POST', '/auth/login', { body: { email: 'nam.tran@rao.com', password: 'password123' } });
  TOK.assignee = assignee.data?.token;
  assigneeId = assignee.data?.user?._id;

  const follower = await call('POST', '/auth/login', { body: { email: 'hoa.le@rao.com', password: 'password123' } });
  TOK.follower = follower.data?.token;
  followerId = follower.data?.user?._id;

  ok(!!TOK.pm && !!TOK.assignee && !!TOK.follower, 'Đăng nhập đủ ba vai');

  const proj = await call('POST', '/projects', {
    token: TOK.pm,
    body: {
      name: `Dự án kiểm thử thông báo ${Date.now()}`,
      description: 'Kiểm thử thông báo và phiên đăng nhập',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      members: [{ user: assigneeId, role: 'developer', allocation: 100 }],
    },
  });
  projectId = proj.data?.project?._id;

  const task = await call('POST', '/tasks', {
    token: TOK.pm,
    body: {
      title: 'Công việc nhận thông báo',
      project: projectId,
      assignee: assigneeId,
      startDate: '2026-10-05',
      endDate: '2026-10-15',
      estimatedHours: 8,
    },
  });
  taskId = task.data?.task?._id;
  ok(!!projectId && !!taskId, 'Tạo được dự án và công việc');
}

/** Số thông báo của một người theo loại. */
const countByType = async (token, type) => {
  const res = await call('GET', '/notifications?limit=100', { token });
  return (res.data?.notifications || []).filter((n) => n.type === type).length;
};

S('Bình luận sinh ra thông báo cho người thực hiện');
{
  const before = await countByType(TOK.assignee, 'task_comment');

  const res = await call('POST', `/tasks/${taskId}/comments`, {
    token: TOK.pm,
    body: { content: 'Nhờ bạn cập nhật tiến độ giúp mình' },
  });
  ok(res.status === 201, 'Thêm bình luận trả 201');

  const after = await countByType(TOK.assignee, 'task_comment');
  // Trước khi sửa: enum của Notification không có 'task_comment' nên bản ghi bị
  // ValidationError, sendNotification nuốt lỗi và trả null. Request vẫn 201.
  ok(after === before + 1, `Người thực hiện nhận thêm 1 thông báo task_comment (${before} → ${after})`);
}

S('Thêm người theo dõi sinh ra thông báo cho chính họ');
{
  const before = await countByType(TOK.follower, 'task_follower_added');

  const res = await call('POST', `/tasks/${taskId}/followers`, {
    token: TOK.pm,
    body: { userIds: [followerId] },
  });
  ok(res.status === 200, 'Thêm người theo dõi trả 200');

  const after = await countByType(TOK.follower, 'task_follower_added');
  ok(after === before + 1, `Người theo dõi nhận thêm 1 thông báo (${before} → ${after})`);
}

S('Việc con sinh ra thông báo cho người phụ trách việc cha');
{
  const before = await countByType(TOK.assignee, 'task_subtask_added');

  const res = await call('POST', `/tasks/${taskId}/subtasks`, {
    token: TOK.pm,
    body: { title: 'Việc con kiểm thử thông báo', estimatedHours: 2 },
  });
  ok(res.status === 201, 'Tạo việc con trả 201');

  const after = await countByType(TOK.assignee, 'task_subtask_added');
  ok(after === before + 1, `Người phụ trách việc cha nhận thêm 1 thông báo (${before} → ${after})`);
}

S('Phiên đăng nhập: liệt kê và thu hồi');
{
  // Mỗi lần đăng nhập tạo một refresh token. Danh sách phiên phải thấy được nó.
  const list = await call('GET', '/auth/sessions', { token: TOK.follower });
  const sessions = list.data?.sessions || [];
  // Trước khi sửa: truy vấn lọc theo `userId` trong khi field của RefreshToken là
  // `user`, nên luôn khớp 0 bản ghi và màn hình phiên đăng nhập trống trơn.
  ok(sessions.length >= 1, `Thấy ít nhất 1 phiên đang hoạt động (${sessions.length})`);
  ok(!!sessions[0]?.createdAt && !!sessions[0]?.expiresAt, 'Phiên có mốc tạo và mốc hết hạn');

  const revoked = await call('DELETE', `/auth/sessions/${sessions[0]._id}`, { token: TOK.follower });
  ok(revoked.status === 200, 'Thu hồi phiên trả 200');

  const after = await call('GET', '/auth/sessions', { token: TOK.follower });
  ok(
    (after.data?.sessions || []).length === sessions.length - 1,
    'Phiên đã thu hồi biến khỏi danh sách'
  );

  const missing = await call('DELETE', '/auth/sessions/000000000000000000000000', { token: TOK.follower });
  ok(missing.status === 404, 'Thu hồi phiên không tồn tại trả 404');
}

S('appPermissions chỉ nhận object');
{
  const admin = await call('POST', '/auth/login', { body: { email: 'admin@rao.com', password: 'password123' } });
  TOK.admin = admin.data?.token;

  // Field khai báo `type: Object` nên Mongoose nhận cả mảng. Lưu được mảng vào đây
  // thì giao diện đọc appPermissions.projects ra undefined mà không có lỗi nào.
  const asArray = await call('PUT', `/auth/users/${followerId}/app-permissions`, {
    token: TOK.admin,
    body: { appPermissions: ['optimize'] },
  });
  ok(asArray.status === 400, 'Gửi mảng bị từ chối 400');

  const asObject = await call('PUT', `/auth/users/${followerId}/app-permissions`, {
    token: TOK.admin,
    body: { appPermissions: { projects: 'view', tasks: 'manage' } },
  });
  ok(asObject.status === 200, 'Gửi object được nhận 200');
  ok(
    asObject.data?.user?.appPermissions?.projects === 'view',
    'Quyền lưu đúng dạng đọc được theo phân hệ'
  );
}

summary();
