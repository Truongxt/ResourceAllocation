// Bộ kiểm thử ma trận phân quyền công việc chuẩn Base Wework
// Kiểm tra tất cả các trường hợp theo tài liệu hướng dẫn:
// https://help.base.vn/support/solutions/articles/63000273353-base-wework-ph%C3%A2n-quy%E1%BB%81n-thao-t%C3%A1c-trong-wework

import { call, ok, section as S, summary } from './helpers.mjs';

const TOK = {};
let projectId;
let memberId;
let followerMemberId;
let outsiderMemberId;
let taskId;

S('Base Wework: Chuẩn bị dữ liệu và Đăng nhập');
{
  const adminLogin = await call('POST', '/auth/login', { body: { email: 'admin@rao.com', password: 'password123' } });
  TOK.admin = adminLogin.data?.token;

  const pmLogin = await call('POST', '/auth/login', { body: { email: 'pm@rao.com', password: 'password123' } });
  TOK.pm = pmLogin.data?.token;

  const memberLogin = await call('POST', '/auth/login', { body: { email: 'nam.tran@rao.com', password: 'password123' } });
  TOK.member = memberLogin.data?.token;
  memberId = memberLogin.data?.user?._id;

  // Tạo thêm 1 member làm follower và 1 member làm outsider
  const rnd = Date.now();
  const followerUser = await call('POST', '/auth/register', {
    body: { name: 'Follower User', email: `follower_${rnd}@rao.com`, password: 'password123' }
  });
  followerMemberId = followerUser.data?.user?._id;
  TOK.follower = followerUser.data?.token;

  const outsiderUser = await call('POST', '/auth/register', {
    body: { name: 'Outsider User', email: `outsider_${rnd}@rao.com`, password: 'password123' }
  });
  outsiderMemberId = outsiderUser.data?.user?._id;
  TOK.outsider = outsiderUser.data?.token;

  ok(!!TOK.admin && !!TOK.pm && !!TOK.member && !!TOK.follower && !!TOK.outsider, 'Đăng nhập đủ các vai trò thử nghiệm');
}

S('Base Wework: Tạo dự án và Cấu hình phân quyền (Permissions)');
{
  const projRes = await call('POST', '/projects', {
    token: TOK.pm,
    body: {
      name: `Dự án Test Quyền Base Wework ${Date.now()}`,
      description: 'Dự án kiểm thử ma trận phân quyền',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      members: [
        { user: memberId, role: 'developer', allocation: 100 },
        { user: followerMemberId, role: 'developer', allocation: 50 },
      ],
      permissions: {
        allowAssigneeEditDeadline: true,
        allowAssigneeEditTitleDesc: false,
        allowAssigneeReassign: false,
        allowFollowerComment: true,
        allowMembersCreateTasks: true,
        allowCreatorDeleteTask: true,
        allowAssigneeDeleteTask: false,
        allowFollowerMarkDone: false,
      }
    }
  });

  ok(projRes.status === 201, 'PM tạo dự án thành công');
  projectId = projRes.data?.project?._id;
  ok(!!projectId, 'Lấy được projectId');

  // Member cập nhật cài đặt phân quyền dự án -> BỊ CHẶN 403
  const memberUpdatePerm = await call('PATCH', `/projects/${projectId}/permissions`, {
    token: TOK.member,
    body: { allowAssigneeEditTitleDesc: true }
  });
  ok(memberUpdatePerm.status === 403, 'Member cập nhật cài đặt quyền dự án bị chặn 403');

  // PM cập nhật cài đặt phân quyền dự án -> THÀNH CÔNG 200
  const pmUpdatePerm = await call('PATCH', `/projects/${projectId}/permissions`, {
    token: TOK.pm,
    body: { allowAssigneeEditTitleDesc: false, allowFollowerMarkDone: false }
  });
  ok(pmUpdatePerm.status === 200, 'PM cập nhật cài đặt quyền dự án trả 200');
  ok(pmUpdatePerm.data?.permissions?.allowAssigneeEditTitleDesc === false, 'Cài đặt permissions được lưu chính xác');
}

S('Base Wework: Tạo công việc theo quyền Thành viên & Giao việc');
{
  // 1. PM tạo task giao cho Member (Member là Assignee, PM là Creator)
  const pmTaskRes = await call('POST', '/tasks', {
    token: TOK.pm,
    body: {
      title: 'Task do PM giao cho Member',
      description: 'Mô tả ban đầu',
      project: projectId,
      assignee: memberId,
      followers: [followerMemberId],
      startDate: '2026-10-05',
      dueDate: '2026-10-15',
      priority: 'high',
      estimatedHours: 10,
    }
  });
  ok(pmTaskRes.status === 201, 'PM tạo task giao cho Member thành công');
  taskId = pmTaskRes.data?.task?._id;
  ok(!!taskId, 'Lấy được taskId giao cho Member');

  // 2. Member tự tạo task trong dự án (khi allowMembersCreateTasks = true)
  const memberTaskRes = await call('POST', '/tasks', {
    token: TOK.member,
    body: {
      title: 'Task do Member tự tạo',
      project: projectId,
      startDate: '2026-10-06',
      dueDate: '2026-10-16',
    }
  });
  ok(memberTaskRes.status === 201, 'Member trong dự án tự tạo task thành công');
  const creatorTaskId = memberTaskRes.data?.task?._id;

  // 3. Outsider (không thuộc dự án) tạo task -> 403
  const outsiderCreateTask = await call('POST', '/tasks', {
    token: TOK.outsider,
    body: {
      title: 'Task do Outsider tạo',
      project: projectId,
      startDate: '2026-10-05',
      dueDate: '2026-10-15',
    }
  });
  ok(outsiderCreateTask.status === 403, 'Người không thuộc dự án tạo task bị chặn 403');
}

S('Base Wework: Chỉnh sửa nội dung công việc (allowAssigneeEditTitleDesc)');
{
  // Khi allowAssigneeEditTitleDesc = false, Assignee sửa tiêu đề -> 403
  const editTitleBlocked = await call('PUT', `/tasks/${taskId}`, {
    token: TOK.member,
    body: { title: 'Tiêu đề sửa đổi không phép' }
  });
  ok(editTitleBlocked.status === 403, 'Assignee sửa tiêu đề khi chưa cấp quyền bị chặn 403');

  // PM cấp quyền allowAssigneeEditTitleDesc = true
  await call('PATCH', `/projects/${projectId}/permissions`, {
    token: TOK.pm,
    body: { allowAssigneeEditTitleDesc: true }
  });

  // Giờ Assignee sửa tiêu đề -> THÀNH CÔNG 200
  const editTitleAllowed = await call('PUT', `/tasks/${taskId}`, {
    token: TOK.member,
    body: { title: 'Tiêu đề đã được sửa hợp lệ' }
  });
  ok(editTitleAllowed.status === 200, 'Assignee sửa tiêu đề sau khi được cấp quyền trả 200');
  ok(editTitleAllowed.data?.task?.title === 'Tiêu đề đã được sửa hợp lệ', 'Tiêu đề cập nhật đúng');
}

S('Base Wework: Đánh dấu hoàn thành (allowFollowerMarkDone)');
{
  // Follower thử mark done khi allowFollowerMarkDone = false -> 403
  const followerDoneBlocked = await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.follower,
    body: { status: 'done' }
  });
  ok(followerDoneBlocked.status === 403, 'Follower mark done khi chưa được cấp quyền bị chặn 403');

  // Assignee mark done -> Được phép theo mặc định (200)
  const assigneeDone = await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.member,
    body: { status: 'done' }
  });
  ok(assigneeDone.status === 200, 'Assignee mark done thành công');
}

S('Base Wework: Sửa hạn chót Deadline (allowAssigneeEditDeadline)');
{
  // Reset lại trạng thái in_progress
  await call('PATCH', `/tasks/${taskId}/status`, {
    token: TOK.pm,
    body: { status: 'in_progress' }
  });

  // Kiểm tra GET /tasks và GET /tasks/:id trả về project.permissions
  const getTasksRes = await call('GET', `/tasks?project=${projectId}`, { token: TOK.member });
  const fetchedTask = getTasksRes.data?.tasks?.find((t) => t._id === taskId);
  ok(fetchedTask?.project?.permissions !== undefined, 'GET /tasks trả về project.permissions');
  ok(fetchedTask?.project?.permissions?.allowAssigneeEditDeadline === true, 'project.permissions.allowAssigneeEditDeadline là true');

  const getTaskDetailRes = await call('GET', `/tasks/${taskId}`, { token: TOK.member });
  ok(getTaskDetailRes.data?.task?.project?.permissions !== undefined, 'GET /tasks/:id trả về project.permissions');

  // Assignee sửa deadline qua PATCH /tasks/:id/deadline khi allowAssigneeEditDeadline = true -> 200
  const editDeadlineOk = await call('PATCH', `/tasks/${taskId}/deadline`, {
    token: TOK.member,
    body: { dueDate: '2026-10-25', reason: 'Xin gia hạn thêm 10 ngày để hoàn thiện' }
  });
  ok(editDeadlineOk.status === 200, 'Assignee cập nhật deadline thành công khi allowAssigneeEditDeadline=true');

  // Assignee sửa deadline qua PUT /tasks/:id (luồng Form chỉnh sửa) kèm các trường không đổi -> 200
  const editTaskFormOk = await call('PUT', `/tasks/${taskId}`, {
    token: TOK.member,
    body: {
      project: projectId, // Không đổi
      priority: 'high',   // Không đổi
      estimatedHours: 10, // Không đổi
      startDate: '2026-10-05',
      endDate: '2026-10-28',
      deadlineReason: 'Điều chỉnh qua form chỉnh sửa công việc',
    }
  });
  ok(editTaskFormOk.status === 200, 'Assignee sửa deadline qua PUT /tasks/:id thành công dù form gửi kèm trường không đổi');
  ok(editTaskFormOk.data?.task?.deadlineHistory?.length > 0, 'deadlineHistory được ghi nhận chính xác');

  // PM tắt allowAssigneeEditDeadline = false
  await call('PATCH', `/projects/${projectId}/permissions`, {
    token: TOK.pm,
    body: { allowAssigneeEditDeadline: false }
  });

  // Giờ Assignee sửa deadline -> BỊ CHẶN 403
  const editDeadlineBlocked = await call('PATCH', `/tasks/${taskId}/deadline`, {
    token: TOK.member,
    body: { dueDate: '2026-10-30' }
  });
  ok(editDeadlineBlocked.status === 403, 'Assignee sửa deadline bị chặn 403 khi allowAssigneeEditDeadline=false');
}

S('Base Wework: Xóa công việc (allowCreatorDeleteTask & allowAssigneeDeleteTask)');
{
  // Người ngoài xóa task -> 403
  const outsiderDelete = await call('DELETE', `/tasks/${taskId}`, { token: TOK.outsider });
  ok(outsiderDelete.status === 403, 'Người ngoài xóa task bị chặn 403');

  // Member tạo thêm 1 task riêng để test xóa
  const memberOwnTask = await call('POST', '/tasks', {
    token: TOK.member,
    body: {
      title: 'Task do Member tạo để test xóa',
      project: projectId,
      startDate: '2026-10-06',
      dueDate: '2026-10-16',
    }
  });
  const memberTaskId = memberOwnTask.data?.task?._id;

  // PM tắt allowCreatorDeleteTask = false
  await call('PATCH', `/projects/${projectId}/permissions`, {
    token: TOK.pm,
    body: { allowCreatorDeleteTask: false, allowAssigneeDeleteTask: false }
  });

  // Creator xóa task khi bị tắt quyền -> 403
  const creatorDeleteBlocked = await call('DELETE', `/tasks/${memberTaskId}`, { token: TOK.member });
  ok(creatorDeleteBlocked.status === 403, 'Creator xóa task bị chặn 403 khi allowCreatorDeleteTask=false');

  // PM bật lại allowCreatorDeleteTask = true
  await call('PATCH', `/projects/${projectId}/permissions`, {
    token: TOK.pm,
    body: { allowCreatorDeleteTask: true }
  });

  // Creator xóa task khi được bật quyền -> THÀNH CÔNG 200
  const creatorDeleteAllowed = await call('DELETE', `/tasks/${memberTaskId}`, { token: TOK.member });
  ok(creatorDeleteAllowed.status === 200, 'Creator xóa task thành công khi allowCreatorDeleteTask=true');
}

S('Base Wework: Dọn dẹp');
{
  if (projectId) {
    const delProj = await call('DELETE', `/projects/${projectId}?force=true`, { token: TOK.admin });
    ok(delProj.status === 200, 'Admin xóa dự án thử nghiệm thành công');
  }
}

const failed = summary();
process.exit(failed ? 1 : 0);

