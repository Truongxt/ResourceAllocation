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
process.exit(summary() ? 1 : 0);
