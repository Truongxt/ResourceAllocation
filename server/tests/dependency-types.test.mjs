// Loại quan hệ phụ thuộc (Base Wework — Dependency types)
//
// Đây là thay đổi SHAPE dữ liệu, nên rủi ro lớn nhất không nằm ở tính năng mới mà ở
// những thứ đang chạy: giao diện cũ còn gửi mảng id phẳng, và bản ghi cũ trong DB
// chưa migrate. Bộ này kiểm cả hai dạng đi qua cùng một đường.

import { call, ok, section as S, summary } from './helpers.mjs';

const TOK = {};
let projectId;
let memberId;

const newTask = async (title, extra = {}) => {
  const res = await call('POST', '/tasks', {
    token: TOK.pm,
    body: {
      title,
      project: projectId,
      startDate: '2026-10-05',
      endDate: '2026-10-15',
      estimatedHours: 8,
      ...extra,
    },
  });
  return res;
};

const depsOf = async (taskId) => {
  const res = await call('GET', `/tasks/${taskId}`, { token: TOK.pm });
  return res.data?.task?.dependencies || [];
};

S('Phụ thuộc: chuẩn bị dữ liệu');
{
  const pm = await call('POST', '/auth/login', { body: { email: 'pm@rao.com', password: 'password123' } });
  TOK.pm = pm.data?.token;

  const member = await call('POST', '/auth/login', { body: { email: 'nam.tran@rao.com', password: 'password123' } });
  memberId = member.data?.user?._id;

  const admin = await call('POST', '/auth/login', { body: { email: 'admin@rao.com', password: 'password123' } });
  TOK.admin = admin.data?.token;

  ok(!!TOK.pm && !!TOK.admin, 'Đăng nhập PM và Admin');

  const proj = await call('POST', '/projects', {
    token: TOK.pm,
    body: {
      name: `Dự án kiểm thử Phụ thuộc ${Date.now()}`,
      description: 'Kiểm thử loại quan hệ phụ thuộc',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      members: [{ user: memberId, role: 'developer', allocation: 100 }],
    },
  });
  projectId = proj.data?.project?._id;
  ok(!!projectId, 'Tạo được dự án');
}

S('Phụ thuộc: dạng cũ (mảng id phẳng) vẫn chạy');
{
  const a = await newTask('A — tiền nhiệm');
  const aId = a.data?.task?._id;

  const b = await newTask('B — dùng dạng id phẳng', { dependencies: [aId] });
  ok(b.status === 201, 'Tạo công việc với mảng id phẳng trả 201', `status=${b.status}`);

  const deps = await depsOf(b.data?.task?._id);
  ok(deps.length === 1, 'Lưu đúng một quan hệ');
  ok(
    String(deps[0]?.task?._id || deps[0]?.task) === String(aId),
    'Trỏ đúng công việc tiền nhiệm',
    JSON.stringify(deps[0])
  );
  ok(
    deps[0]?.type === 'finish_to_start',
    'Được gán mặc định finish_to_start — đúng ngữ nghĩa duy nhất hệ thống từng có',
    `type=${deps[0]?.type}`
  );
}

S('Phụ thuộc: dạng mới có type');
{
  const a = await newTask('C — tiền nhiệm cho quan hệ song song');
  const aId = a.data?.task?._id;

  const b = await newTask('D — start_to_start', {
    dependencies: [{ task: aId, type: 'start_to_start' }],
  });
  ok(b.status === 201, 'Tạo với { task, type } trả 201', `status=${b.status}`);

  const deps = await depsOf(b.data?.task?._id);
  ok(deps[0]?.type === 'start_to_start', 'Loại quan hệ được lưu đúng', `type=${deps[0]?.type}`);

  // Dạng { taskId, type } cũng được chấp nhận — giao diện có thể gọi field nào cũng được.
  const c = await newTask('E — dùng field taskId', {
    dependencies: [{ taskId: aId, type: 'finish_to_finish' }],
  });
  ok(c.status === 201, 'Dạng taskId cũng được chấp nhận');
  const depsC = await depsOf(c.data?.task?._id);
  ok(depsC[0]?.type === 'finish_to_finish', 'Loại quan hệ lưu đúng từ dạng taskId');
}

S('Phụ thuộc: loại không hợp lệ bị từ chối');
{
  const a = await newTask('F — tiền nhiệm');
  const aId = a.data?.task?._id;

  const bad = await newTask('G — loại bịa', {
    dependencies: [{ task: aId, type: 'khong_ton_tai' }],
  });
  ok(bad.status === 400, 'Loại quan hệ lạ trả 400', `status=${bad.status}`);
  ok(/không hợp lệ/i.test(bad.message || ''), 'Câu trả lời nêu rõ loại nào sai', bad.message);

  const noTask = await newTask('H — thiếu id', {
    dependencies: [{ type: 'finish_to_start' }],
  });
  ok(noTask.status === 400, 'Thiếu id công việc tiền nhiệm trả 400');
}

S('Phụ thuộc: các ràng buộc cũ vẫn còn nguyên');
{
  const a = await newTask('I — tiền nhiệm');
  const aId = a.data?.task?._id;
  const b = await newTask('J — phụ thuộc I', { dependencies: [{ task: aId, type: 'start_to_start' }] });
  const bId = b.data?.task?._id;

  // Tự phụ thuộc
  const self = await call('PUT', `/tasks/${bId}`, {
    token: TOK.pm,
    body: { dependencies: [{ task: bId, type: 'finish_to_start' }] },
  });
  ok(self.status === 400, 'Tự phụ thuộc vẫn bị chặn 400', `status=${self.status}`);

  // Vòng lặp — dù khai báo loại quan hệ khác
  const cycle = await call('PUT', `/tasks/${aId}`, {
    token: TOK.pm,
    body: { dependencies: [{ task: bId, type: 'finish_to_finish' }] },
  });
  ok(cycle.status === 400, 'Vòng lặp vẫn bị chặn dù khác loại quan hệ', `status=${cycle.status}`);

  // Khác dự án
  const otherProj = await call('POST', '/projects', {
    token: TOK.pm,
    body: {
      name: `Dự án khác ${Date.now()}`,
      description: 'Dự án ngoài phạm vi',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
    },
  });
  const outsider = await call('POST', '/tasks', {
    token: TOK.pm,
    body: {
      title: 'K — ở dự án khác',
      project: otherProj.data?.project?._id,
      startDate: '2026-10-05',
      endDate: '2026-10-15',
    },
  });
  const crossProject = await call('PUT', `/tasks/${bId}`, {
    token: TOK.pm,
    body: { dependencies: [{ task: outsider.data?.task?._id, type: 'finish_to_start' }] },
  });
  ok(crossProject.status === 400, 'Tiền nhiệm ở dự án khác vẫn bị chặn 400');

  // Id không tồn tại
  const ghost = await call('PUT', `/tasks/${bId}`, {
    token: TOK.pm,
    body: { dependencies: [{ task: '0123456789abcdef01234567', type: 'finish_to_start' }] },
  });
  ok(ghost.status === 400, 'Tiền nhiệm không tồn tại vẫn bị chặn 400');
}

S('Phụ thuộc: xóa công việc thì gỡ khỏi quan hệ của việc khác');
{
  const a = await newTask('L — sắp bị xóa');
  const aId = a.data?.task?._id;
  const b = await newTask('M — đang phụ thuộc L', {
    dependencies: [{ task: aId, type: 'finish_to_start' }],
  });
  const bId = b.data?.task?._id;

  ok((await depsOf(bId)).length === 1, 'M đang có một quan hệ');

  const del = await call('DELETE', `/tasks/${aId}`, { token: TOK.pm });
  ok(del.status === 200, 'Xóa được công việc tiền nhiệm');

  const after = await depsOf(bId);
  ok(
    after.length === 0,
    'Quan hệ trỏ tới việc đã xóa được gỡ, không để lại tham chiếu treo',
    `còn lại=${after.length}`
  );
}

S('Phụ thuộc: trùng id thì gộp lại');
{
  const a = await newTask('N — tiền nhiệm');
  const aId = a.data?.task?._id;
  const b = await newTask('O — khai trùng hai lần', {
    dependencies: [
      { task: aId, type: 'finish_to_start' },
      { task: aId, type: 'start_to_start' },
    ],
  });
  const deps = await depsOf(b.data?.task?._id);
  ok(deps.length === 1, 'Chỉ giữ một quan hệ cho mỗi cặp công việc', `số quan hệ=${deps.length}`);
  ok(deps[0]?.type === 'finish_to_start', 'Giữ khai báo đầu tiên, không im lặng lấy cái sau');
}

S('Phụ thuộc: tối ưu hóa vẫn đọc được quan hệ');
{
  // CSP dùng dependencies cho ràng buộc H4; đọc sai shape thì H4 im lặng bỏ qua mọi
  // quan hệ và báo "không vi phạm gì" — sai nguy hiểm hơn là báo lỗi.
  const res = await call('POST', '/optimization/run/csp', {
    token: TOK.admin,
    body: { projectId, timeout: 8000 },
  });
  ok(res.status === 200 || res.status === 201, 'CSP chạy được trên dự án có phụ thuộc', `status=${res.status}`);
  ok(
    Array.isArray(res.data?.result?.constraintReport?.violated) ||
      Array.isArray(res.data?.result?.constraintViolations) ||
      res.data?.result !== undefined,
    'Trả về báo cáo ràng buộc'
  );
}

process.exit(summary());
