// Người theo dõi công việc (Base Wework — Followers)
//
// Follower xem và bình luận, KHÔNG phải người thực hiện. Bộ này chốt ba thứ dễ vỡ:
// trần số lượng, ranh giới ai được gỡ ai, và ràng buộc quan trọng nhất — người theo
// dõi không được sinh ra khối lượng công việc.

import { call, ok, section as S, summary } from './helpers.mjs';

const TOK = {};
let projectId;
let assigneeId;
let followerId;
let outsiderId;
let taskId;

/** ObjectId hợp lệ về hình thức nhưng không trỏ tới tài khoản nào. */
const fakeObjectId = () =>
  [...Array(24)].map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

S('Followers: chuẩn bị dữ liệu');
{
  const pm = await call('POST', '/auth/login', { body: { email: 'pm@rao.com', password: 'password123' } });
  TOK.pm = pm.data?.token;

  const assignee = await call('POST', '/auth/login', { body: { email: 'nam.tran@rao.com', password: 'password123' } });
  TOK.assignee = assignee.data?.token;
  assigneeId = assignee.data?.user?._id;

  // Người theo dõi là nhân sự đã có hồ sơ trong seeder, để kiểm được phần workload.
  const follower = await call('POST', '/auth/login', { body: { email: 'hoa.le@rao.com', password: 'password123' } });
  TOK.follower = follower.data?.token;
  followerId = follower.data?.user?._id;

  const outsider = await call('POST', '/auth/login', { body: { email: 'tuan.pham@rao.com', password: 'password123' } });
  TOK.outsider = outsider.data?.token;
  outsiderId = outsider.data?.user?._id;

  ok(!!TOK.pm && !!TOK.assignee && !!TOK.follower && !!TOK.outsider, 'Đăng nhập đủ bốn vai trò');

  const proj = await call('POST', '/projects', {
    token: TOK.pm,
    body: {
      name: `Dự án kiểm thử Followers ${Date.now()}`,
      description: 'Kiểm thử người theo dõi công việc',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      members: [
        { user: assigneeId, role: 'developer', allocation: 100 },
        { user: followerId, role: 'developer', allocation: 50 },
      ],
    },
  });
  projectId = proj.data?.project?._id;
  ok(!!projectId, 'Tạo được dự án');

  const task = await call('POST', '/tasks', {
    token: TOK.pm,
    body: {
      title: 'Công việc có người theo dõi',
      project: projectId,
      assignee: assigneeId,
      startDate: '2026-10-05',
      endDate: '2026-10-15',
      estimatedHours: 10,
    },
  });
  taskId = task.data?.task?._id;
  ok(!!taskId, 'Tạo được công việc');
}

S('Followers: thêm và gỡ hợp lệ');
{
  const add = await call('POST', `/tasks/${taskId}/followers`, {
    token: TOK.pm,
    body: { userIds: [followerId, outsiderId] },
  });
  ok(add.status === 200, 'Thêm hàng loạt bằng userIds trả 200', `status=${add.status}`);
  ok(add.data?.followers?.length === 2, 'Cả hai người vào danh sách trong một lần gọi');

  const remove = await call('DELETE', `/tasks/${taskId}/followers/${outsiderId}`, { token: TOK.pm });
  ok(remove.status === 200, 'Gỡ người theo dõi trả 200');

  // Giao diện hiện tại còn gửi dạng đơn; bỏ hỗ trợ là hỏng nút đang chạy.
  const addSingle = await call('POST', `/tasks/${taskId}/followers`, {
    token: TOK.pm,
    body: { userId: outsiderId },
  });
  ok(addSingle.status === 200, 'Dạng userId đơn lẻ vẫn được chấp nhận');
}

S('Followers: các trường hợp bị từ chối');
{
  const dup = await call('POST', `/tasks/${taskId}/followers`, {
    token: TOK.pm,
    body: { userIds: [followerId] },
  });
  ok(dup.status === 400, 'Thêm lại người đã theo dõi trả 400');

  const self = await call('POST', `/tasks/${taskId}/followers`, {
    token: TOK.pm,
    body: { userIds: [assigneeId] },
  });
  ok(self.status === 400, 'Thêm chính người thực hiện làm người theo dõi trả 400');

  const ghost = await call('POST', `/tasks/${taskId}/followers`, {
    token: TOK.pm,
    body: { userIds: [fakeObjectId()] },
  });
  ok(ghost.status === 400, 'Id không trỏ tới tài khoản nào trả 400');

  const empty = await call('POST', `/tasks/${taskId}/followers`, { token: TOK.pm, body: {} });
  ok(empty.status === 400, 'Không chọn ai trả 400');

  const gone = await call('DELETE', `/tasks/${taskId}/followers/${fakeObjectId()}`, { token: TOK.pm });
  ok(gone.status === 404, 'Gỡ người vốn không theo dõi trả 404 chứ không im lặng trả 200');
}

S('Followers: trần 50 người');
{
  // Trần nằm ở schema nên mọi đường ghi đều bị chặn, kể cả lúc tạo công việc.
  const over = await call('POST', '/tasks', {
    token: TOK.pm,
    body: {
      title: 'Công việc vượt trần người theo dõi',
      project: projectId,
      startDate: '2026-10-05',
      endDate: '2026-10-15',
      followers: [...Array(51)].map(fakeObjectId),
    },
  });
  ok(over.status === 400, 'Tạo công việc với 51 người theo dõi bị chặn 400', `status=${over.status}`);

  const full = await call('POST', '/tasks', {
    token: TOK.pm,
    body: {
      title: 'Công việc đã đủ 50 người theo dõi',
      project: projectId,
      startDate: '2026-10-05',
      endDate: '2026-10-15',
      followers: [...Array(50)].map(fakeObjectId),
    },
  });
  ok(full.status === 201, 'Đúng 50 người theo dõi thì vẫn tạo được', `status=${full.status}`);

  const oneMore = await call('POST', `/tasks/${full.data?.task?._id}/followers`, {
    token: TOK.pm,
    body: { userIds: [followerId] },
  });
  ok(oneMore.status === 400, 'Thêm người thứ 51 bị chặn 400');
}

S('Followers: ranh giới ai được gỡ ai');
{
  const selfLeave = await call('DELETE', `/tasks/${taskId}/followers/${followerId}`, {
    token: TOK.follower,
  });
  ok(selfLeave.status === 200, 'Người theo dõi tự rời được', `status=${selfLeave.status}`);

  await call('POST', `/tasks/${taskId}/followers`, { token: TOK.pm, body: { userIds: [followerId] } });

  const kickOther = await call('DELETE', `/tasks/${taskId}/followers/${followerId}`, {
    token: TOK.outsider,
  });
  ok(kickOther.status === 403, 'Người theo dõi khác không gỡ được người thứ ba', `status=${kickOther.status}`);
}

S('Followers: không sinh ra khối lượng công việc');
{
  const resources = await call('GET', '/resources?limit=100', { token: TOK.pm });
  const list = resources.data?.resources || [];
  const resourceOf = (userId) => list.find((r) => String(r.user?._id || r.user) === String(userId));

  const followerResource = resourceOf(followerId);
  const assigneeResource = resourceOf(assigneeId);
  ok(!!followerResource && !!assigneeResource, 'Tìm thấy hồ sơ nhân sự của cả hai người');

  // `currentWorkload` được tính đúng bằng truy vấn đứng sau `assignments`, nên đây
  // cũng là phép kiểm trực tiếp cho công thức tải: có mặt trong danh sách nghĩa là
  // giờ công được cộng, vắng mặt nghĩa là không.
  const followerDetail = await call('GET', `/resources/${followerResource?._id}`, { token: TOK.pm });
  const followerTasks = (followerDetail.data?.assignments || []).map((t) => String(t._id));
  ok(!followerTasks.includes(String(taskId)), 'Việc chỉ theo dõi KHÔNG nằm trong danh sách việc được giao');

  const assigneeDetail = await call('GET', `/resources/${assigneeResource?._id}`, { token: TOK.pm });
  const assigneeTasks = (assigneeDetail.data?.assignments || []).map((t) => String(t._id));
  ok(assigneeTasks.includes(String(taskId)), 'Cùng việc đó vẫn được tính cho người thực hiện');
}

process.exit(summary());
