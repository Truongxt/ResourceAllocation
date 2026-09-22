/**
 * Phân lập công ty trên toàn bộ nhóm công việc.
 *
 * Bộ này ra đời từ một phép đo, không từ việc đọc code — và đó là lý do nó đáng
 * giữ. Đọc `taskAccess.js` thì thấy cả 11 guard đều mở đầu bằng
 * `if (PRIVILEGED_ROLES.includes(req.user.role)) return next();`, dễ kết luận là
 * *mọi* endpoint đều hở. Chạy thật thì `GET`/`PUT`/`DELETE`/`PATCH status` vẫn
 * chặn đúng, vì **controller** của chúng tự kiểm công ty. Hở đúng ở mười endpoint
 * mà controller quên kiểm.
 *
 * Suy luận sai cả hai chiều; chỉ phép đo mới ra đúng danh sách.
 *
 * Cách đo: đăng ký một công ty B hoàn toàn mới, rồi cho admin của nó thao tác lên
 * công việc của công ty A **chỉ bằng id**. Mọi đường đều phải là 403.
 */
import { call, ok, section as S, summary } from './helpers.mjs';

const stamp = Date.now();

const a = await call('POST', '/auth/login', {
  body: { email: 'pm@rao.com', password: 'password123' },
});
const b = await call('POST', '/auth/register', {
  body: {
    name: 'Chủ B',
    email: `b.${stamp}@b.com`,
    password: 'password123',
    companyName: `Công ty B ${stamp}`,
  },
});

const TA = a.data.token;
const TB = b.data.token;

const projects = await call('GET', '/projects', { token: TA });
const proj = (projects.data?.projects || [])[0];
const task = await call('POST', '/tasks', {
  token: TA,
  body: {
    title: `Thăm dò ${stamp}`,
    project: proj._id,
    startDate: '2026-11-01',
    endDate: '2026-11-05',
    estimatedHours: 4,
  },
});
const id = task.data.task._id;

S('Admin công ty B thao tác lên công việc công ty A');
const read = await call('GET', `/tasks/${id}`, { token: TB });
ok(read.status === 403, 'GET bị chặn', `status=${read.status}`);

const edit = await call('PUT', `/tasks/${id}`, {
  token: TB,
  body: { title: 'BỊ SỬA BỞI CÔNG TY B' },
});
ok(edit.status === 403, 'PUT bị chặn', `status=${edit.status}`);

const chk = await call('POST', `/tasks/${id}/checklist`, {
  token: TB,
  body: { title: 'mục lạ' },
});
ok(chk.status === 403, 'Thêm checklist bị chặn', `status=${chk.status}`);

const status = await call('PATCH', `/tasks/${id}/status`, {
  token: TB,
  body: { status: 'done' },
});
ok(status.status === 403, 'Đổi trạng thái bị chặn', `status=${status.status}`);

const after = await call('GET', `/tasks/${id}`, { token: TA });
ok(
  after.data?.task?.title?.includes('Thăm dò'),
  'Tiêu đề KHÔNG bị sửa',
  `title=${after.data?.task?.title}`
);

const del = await call('DELETE', `/tasks/${id}`, { token: TB });
ok(del.status === 403, 'DELETE bị chặn', `status=${del.status}`);

const alive = await call('GET', `/tasks/${id}`, { token: TA });
ok(alive.status === 200, 'Công việc vẫn còn', `status=${alive.status}`);

S('Quét rộng — mọi nhánh còn lại');
// Dựng sẵn một mục checklist bằng token A để thử toggle/remove từ B.
await call('POST', `/tasks/${id}/checklist`, { token: TA, body: { title: 'mục của A' } });
const withItem = await call('GET', `/tasks/${id}`, { token: TA });
const item = (withItem.data?.task?.checklist || []).find((c) => c.title === 'mục của A');

const probes = [
  ['POST', `/tasks/${id}/checklist`, { title: 'x' }, 'thêm checklist'],
  ['PUT', `/tasks/${id}/checklist/${item?._id}/toggle`, null, 'tick checklist'],
  ['DELETE', `/tasks/${id}/checklist/${item?._id}`, null, 'xóa mục checklist'],
  ['POST', `/tasks/${id}/followers`, { userId: b.data.user._id }, 'tự thêm mình làm người theo dõi'],
  ['POST', `/tasks/${id}/duplicate`, {}, 'nhân bản'],
  ['POST', `/tasks/${id}/move`, { targetProject: null }, 'di chuyển'],
  ['PATCH', `/tasks/${id}/deadline`, { endDate: '2027-01-01', reason: 'x' }, 'đổi hạn'],
  ['POST', `/tasks/${id}/report-result`, { outcome: 'success', summary: 'x' }, 'nộp kết quả'],
  ['POST', `/tasks/${id}/review`, { decision: 'approve' }, 'duyệt'],
  ['PATCH', `/tasks/${id}/complete`, {}, 'đánh dấu hoàn thành'],
  ['POST', `/tasks/${id}/subtasks`, { title: 'con' }, 'tạo việc con'],
];

for (const [method, path, body, label] of probes) {
  const r = await call(method, path, { token: TB, ...(body ? { body } : {}) });
  // Chỉ chấp nhận 403. Không nhận 404/400 là "đã chặn": cả hai từng che mất lỗ
  // hổng trong lúc đo — 404 vì gọi sai method, 400 vì dừng ở bước validate trước
  // khi tới bước phân quyền. Cả hai lần đều suýt kết luận là an toàn.
  ok(r.status === 403, `${label} — 403`, `status=${r.status}`);
}

await call('DELETE', `/tasks/${id}`, { token: TA });

// ══════════════════════════════════════════════
// Ngoài nhóm công việc: dự án, nhân sự.
//
// Phần này tìm ra thêm hai lỗ mà đọc code rất khó thấy, vì cả hai đều **có**
// kiểm quyền — chỉ là kiểm nhầm thứ:
//   - `updateProjectPermissions` xét `role === 'admin'`, mà admin công ty nào
//     cũng là admin.
//   - `updateSkills` dùng `findByIdAndUpdate`, gộp đọc và ghi làm một nên không
//     còn chỗ chen kiểm tra vào.
// ══════════════════════════════════════════════

S('Dự án và nhân sự');
{
  const others = [];

  if (proj) {
    others.push(
      ['GET', `/projects/${proj._id}`, null, 'xem dự án'],
      ['PUT', `/projects/${proj._id}`, { name: 'BỊ SỬA' }, 'sửa dự án'],
      ['PATCH', `/projects/${proj._id}/quick-edit`, { status: 'on_hold' }, 'sửa nhanh dự án'],
      ['PATCH', `/projects/${proj._id}/permissions`, { allowMembersCreateTasks: true }, 'đổi phân quyền dự án'],
      ['POST', `/projects/${proj._id}/members`, { user: b.data.user._id, role: 'developer' }, 'tự thêm mình vào dự án'],
      ['DELETE', `/projects/${proj._id}`, null, 'xóa dự án']
    );
  }

  const resources = await call('GET', '/resources', { token: TA });
  const res0 = (resources.data?.resources || [])[0];
  if (res0) {
    others.push(
      ['GET', `/resources/${res0._id}`, null, 'xem nhân sự'],
      ['PUT', `/resources/${res0._id}`, { position: 'BỊ SỬA' }, 'sửa nhân sự'],
      ['PUT', `/resources/${res0._id}/skills`, { skills: [] }, 'xóa sạch kỹ năng nhân sự'],
      ['DELETE', `/resources/${res0._id}`, null, 'xóa nhân sự']
    );
  }

  ok(others.length > 0, 'Có dữ liệu mẫu để đối chiếu', `${others.length} đường`);
  for (const [method, path, body, label] of others) {
    const r = await call(method, path, { token: TB, ...(body ? { body } : {}) });
    ok(r.status === 403, `${label} — 403`, `status=${r.status}`);
  }
}

// ══════════════════════════════════════════════
S('Phòng ban — và một ngoại lệ có chủ đích');
{
  // Phải dựng HAI công ty mới cho phần này. Phòng ban của công ty mặc định là
  // **template dùng chung**: mọi công ty đều xem được, và sửa nó sẽ tạo ra một
  // bản sao thuộc công ty người sửa chứ không đụng bản gốc.
  //
  // Lần đo đầu tiên dùng công ty mặc định làm "nạn nhân" nên đọc ra kết quả vô
  // nghĩa — tưởng là lỗ hổng trong khi đó là tính năng. Giữ ghi chú này lại vì
  // cái bẫy đó rất dễ sập lần nữa.
  const mk = async (tag) => {
    const r = await call('POST', '/auth/register', {
      body: {
        name: `Chủ ${tag}`,
        email: `dept.${tag}.${stamp}@x.com`,
        password: 'password123',
        companyName: `Công ty ${tag} ${stamp}`,
      },
    });
    return r.data.token;
  };

  const TC = await mk('C');
  const TD = await mk('D');

  const created = await call('POST', '/departments', {
    token: TC,
    body: { name: `Phòng C ${stamp}`, code: `PC${stamp % 100000}` },
  });
  const dept = created.data?.department;
  ok(!!dept, 'Dựng được phòng ban của công ty C', `status=${created.status}`);

  if (dept) {
    const read = await call('GET', `/departments/${dept._id}`, { token: TD });
    ok(read.status === 403,
      'D KHÔNG xem được phòng ban của C — endpoint này trả kèm dự án, ngân sách, quản lý',
      `status=${read.status}`);

    const edit = await call('PUT', `/departments/${dept._id}`, {
      token: TD, body: { name: 'BỊ SỬA', code: 'XXX' },
    });
    ok(edit.status === 403, 'D không sửa được', `status=${edit.status}`);

    const del = await call('DELETE', `/departments/${dept._id}`, { token: TD });
    ok(del.status === 403, 'D không xóa được', `status=${del.status}`);

    const still = await call('GET', `/departments/${dept._id}`, { token: TC });
    ok(still.status === 200, 'C vẫn xem được phòng ban của mình', `status=${still.status}`);
    ok(still.data?.department?.name?.includes('Phòng C'), 'Tên không bị sửa',
      `name=${still.data?.department?.name}`);
  }

  // Và chiều ngược lại: công ty mới vẫn phải dùng được phòng ban của chính mình.
  // `GET /departments` nhân bản bộ mẫu vào công ty ngay lần liệt kê đầu, nên sau
  // lời gọi này D phải có phòng ban riêng và đọc được chúng.
  //
  // Bài này giữ cho bản vá không siết quá tay: chặn nhầm ở đây thì công ty mới
  // mở ứng dụng ra là không có phòng ban nào dùng được.
  const own = await call('GET', '/departments', { token: TD });
  const mine = (own.data?.departments || [])[0];
  ok(!!mine, 'Công ty mới được cấp bộ phòng ban của riêng mình', `${own.data?.departments?.length ?? 0} phòng ban`);

  if (mine) {
    const readMine = await call('GET', `/departments/${mine._id}`, { token: TD });
    ok(readMine.status === 200, 'Và đọc được chúng theo id', `status=${readMine.status}`);
  }
}

// ══════════════════════════════════════════════
S('Tối ưu hóa — cả phân hệ từng không có ranh giới');
{
  // `OptimizationResult` trước đây **không có** trường `companyName`, nên không
  // có gì để lọc theo. `getHistory` còn bỏ hẳn bộ lọc khi người gọi là `admin`
  // — mà admin công ty nào cũng là admin.
  //
  // Đây là lỗ nặng nhất trong đợt rà: áp một phương án là ghi đè phân công thật
  // của cả một công ty, và công ty ngoài làm được điều đó.
  // Phân hệ này nằm sau `authorizeApp('optimize')` nên PM không vào được —
  // phải dùng admin của chính công ty A.
  const adminA = await call('POST', '/auth/login', {
    body: { email: 'admin@rao.com', password: 'password123' },
  });
  const TAdmin = adminA.data.token;

  const run = await call('POST', '/optimization/run/genetic', {
    token: TAdmin,
    body: { populationSize: 20, generations: 10 },
  });
  const resultId = run.data?.result?._id;
  ok(!!resultId, 'Công ty A chạy được một lượt tối ưu', `status=${run.status}`);

  if (resultId) {
    for (const [method, path, label] of [
      ['GET', `/optimization/${resultId}`, 'xem kết quả'],
      ['POST', `/optimization/${resultId}/apply`, 'ÁP phương án — ghi đè phân công của A'],
      ['POST', `/optimization/${resultId}/rollback`, 'hoàn tác phương án'],
    ]) {
      const r = await call(method, path, { token: TB, body: method === 'POST' ? {} : undefined });
      ok(r.status === 403, `B không ${label}`, `status=${r.status}`);
    }

    // `compare` cần HAI id khác nhau, nếu không nó dừng ở bước validate và trả
    // 400 — trông như "đã chặn" trong khi bước phân quyền chưa hề chạy. Phải
    // dựng đủ hai lượt thì bài kiểm mới chạm được tới chỗ cần kiểm.
    const run2 = await call('POST', '/optimization/run/genetic', {
      token: TAdmin,
      body: { populationSize: 20, generations: 10 },
    });
    const secondId = run2.data?.result?._id;
    ok(!!secondId && secondId !== resultId, 'Dựng được lượt chạy thứ hai để so sánh');

    if (secondId) {
      const cmp = await call('GET', `/optimization/compare?ids=${resultId},${secondId}`, { token: TB });
      ok(cmp.status === 403, 'B không so sánh được hai phương án của A', `status=${cmp.status}`);

      const cmpOwn = await call('GET', `/optimization/compare?ids=${resultId},${secondId}`, { token: TAdmin });
      ok(cmpOwn.status === 200, 'Nhưng A so sánh được của chính mình', `status=${cmpOwn.status}`);
    }

    const hist = await call('GET', '/optimization/history', { token: TB });
    const n = (hist.data?.results || []).length;
    ok(n === 0, 'Lịch sử của B không chứa lượt chạy của A', `${n} bản ghi`);

    const own = await call('GET', '/optimization/history', { token: TAdmin });
    ok((own.data?.results || []).length > 0,
      'Nhưng A vẫn thấy lượt chạy của chính mình',
      `${(own.data?.results || []).length} bản ghi`);
  }
}

// ══════════════════════════════════════════════
S('Nhật ký hoạt động — vết kiểm toán không được lẫn giữa các công ty');
{
  // Cùng khuôn với lịch sử tối ưu: model không có `companyName`, và nhánh
  // `admin` bỏ hẳn bộ lọc. Nhưng ở đây còn một đường phá hoại: `clearActivityLogs`
  // gọi `deleteMany({})` — một admin bất kỳ xóa sạch nhật ký của mọi công ty.
  //
  // Nhật ký là thứ duy nhất ghi lại ai đã làm gì. Mất nó là mất luôn khả năng
  // điều tra chính lần mất đó.
  const adminA = await call('POST', '/auth/login', {
    body: { email: 'admin@rao.com', password: 'password123' },
  });
  const TAdmin = adminA.data.token;

  const beforeA = await call('GET', '/activity-logs?limit=100', { token: TAdmin });
  const countA = beforeA.data?.logs?.length ?? beforeA.data?.activityLogs?.length ?? 0;
  ok(countA > 0, 'Công ty A có nhật ký', `${countA} bản ghi`);

  const seenByB = await call('GET', '/activity-logs?limit=100', { token: TB });
  const logsB = seenByB.data?.logs || seenByB.data?.activityLogs || [];
  ok(logsB.length === 0, 'B KHÔNG thấy nhật ký của A', `${logsB.length} bản ghi`);

  const statsB = await call('GET', '/activity-logs/stats', { token: TB });
  const topB = statsB.data?.topUsers || [];
  ok(topB.length === 0, 'Bảng xếp hạng của B không lòi tên người của A', `${topB.length} tên`);

  // Và đường phá hoại: B xóa nhật ký thì chỉ được xóa của chính B.
  //
  // Đếm số bản ghi là KHÔNG đủ, và điều đó đã được kiểm bằng cách phá code thử:
  // `clearActivityLogs` tự ghi một vết "đã xóa nhật ký" SAU khi xóa, nên dù
  // `deleteMany({})` cuốn sạch mọi công ty, A vẫn "còn 1 bản ghi" — chính vết của
  // B. Bài kiểm đếm số lượng vẫn xanh trong khi dữ liệu đã mất hết.
  //
  // Nên phải tìm một vết CỤ THỂ của A và đòi nó còn nguyên.
  const marker = `Phòng mốc ${stamp}`;
  const madeDept = await call('POST', '/departments', {
    token: TAdmin,
    body: { name: marker, code: `MK${stamp % 100000}` },
  });
  ok(madeDept.status === 201, 'A tạo một thực thể để sinh vết nhật ký', `status=${madeDept.status}`);

  const hasMarker = async (token) => {
    const r = await call('GET', `/activity-logs?limit=100&search=${encodeURIComponent(marker)}`, { token });
    return (r.data?.logs || []).some((l) => (l.entityTitle || l.description || '').includes(marker));
  };

  ok(await hasMarker(TAdmin), 'Vết đó nằm trong nhật ký của A');
  ok(!(await hasMarker(TB)), 'Và KHÔNG lọt sang nhật ký của B');

  await call('DELETE', '/activity-logs', { token: TB });

  ok(await hasMarker(TAdmin), 'B xóa nhật ký của mình KHÔNG cuốn theo vết của A');

  if (madeDept.data?.department?._id) {
    await call('DELETE', `/departments/${madeDept.data.department._id}`, { token: TAdmin });
  }
}

// ══════════════════════════════════════════════
S('Nhóm việc và việc lặp lại');
{
  // `taskGroup` vốn đã lọc đúng (`findOneAndUpdate` kèm `companyName`), giữ bài
  // kiểm để nó không bị sửa hỏng về sau.
  //
  // `recurringTask` thì khác: `getRecurringTasks` lọc theo công ty từ lâu, nhưng
  // ba đường thao tác theo id chỉ `findById` trần. Nặng nhất là `run-now` — nó
  // **tạo công việc mới** trong dự án của cấu hình, nên người ngoài kích hoạt
  // được việc ghi dữ liệu vào dự án công ty khác.
  const grp = await call('POST', '/task-groups', {
    token: TA,
    body: { name: `Nhóm ${stamp}`, project: proj._id },
  });
  const grpId = grp.data?.group?._id;
  ok(!!grpId, 'A tạo được nhóm việc', `status=${grp.status}`);

  if (grpId) {
    const edit = await call('PUT', `/task-groups/${grpId}`, { token: TB, body: { name: 'BỊ SỬA' } });
    ok(edit.status !== 200, 'B không sửa được nhóm việc của A', `status=${edit.status}`);

    const del = await call('DELETE', `/task-groups/${grpId}`, { token: TB });
    ok(del.status !== 200, 'B không xóa được nhóm việc của A', `status=${del.status}`);

    await call('DELETE', `/task-groups/${grpId}`, { token: TA });
  }

  const rec = await call('POST', '/recurring-tasks', {
    token: TA,
    body: {
      title: `Lặp ${stamp}`,
      project: proj._id,
      frequency: 'weekly',
      daysOfWeek: [1],
      startDate: '2026-10-01',
      durationHours: 4,
    },
  });
  const recId = rec.data?.recurringTask?._id || rec.data?.item?._id || rec.data?._id;
  ok(!!recId, 'A tạo được cấu hình lặp lại', `status=${rec.status}`);

  if (recId) {
    for (const [method, path, body, label] of [
      ['PUT', `/recurring-tasks/${recId}`, { title: 'BỊ SỬA' }, 'sửa cấu hình'],
      ['POST', `/recurring-tasks/${recId}/run-now`, {}, 'CHẠY NGAY — tạo công việc trong dự án của A'],
      ['DELETE', `/recurring-tasks/${recId}`, null, 'xóa cấu hình'],
    ]) {
      const r = await call(method, path, { token: TB, ...(body ? { body } : {}) });
      ok(r.status === 403, `B không ${label}`, `status=${r.status}`);
    }

    await call('DELETE', `/recurring-tasks/${recId}`, { token: TA });
  }
}

process.exit(summary() ? 1 : 0);
