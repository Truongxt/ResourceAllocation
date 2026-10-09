/**
 * GET /analytics/performance — báo cáo kết quả theo người, qua HTTP.
 *
 * Phép tính đã có bộ đơn vị `performance-summary`. Bộ này giữ phần còn lại: ai lọt vào
 * từng phạm vi, ai được gọi phạm vi nào, kỳ báo cáo lọc theo deadline, và đúng/trễ hạn
 * đi qua luồng hoàn thành thật (`completedAt` do server ghi, không tự dựng).
 *
 * Người dựng mới (quản lý, hai cấp dưới, một người ngoài) chỉ có việc do bộ này tạo,
 * nên số đếm của họ là số chính xác, không lẫn dữ liệu mẫu.
 */
import { call, ok, section as S, summary } from './helpers.mjs';

const stamp = Date.now();
const FROM = '2026-01-01';
const TO = '2027-12-31';
const perf = (token, query) => call('GET', `/analytics/performance?${query}`, { token });
const rowOf = (res, id) => (res.data?.people || []).find((p) => String(p.user?._id) === String(id));

// ── Dựng dữ liệu ─────────────────────────────────────────────────────
const admin = await call('POST', '/auth/login', { body: { email: 'admin@rao.com', password: 'password123' } });
const TA = admin.data.token;
const dept = (await call('GET', '/departments', { token: TA })).data.departments[0];

const mkUser = async (tag) => {
  const email = `perf.${tag}.${stamp}@rao.com`;
  const made = await call('POST', '/auth/users', {
    token: TA, body: { name: `Perf ${tag} ${stamp}`, email, password: 'password123', role: 'member', department: dept.name, position: 'Dev' },
  });
  const login = await call('POST', '/auth/login', { body: { email, password: 'password123' } });
  return { id: made.data?.user?._id, token: login.data?.token };
};
const boss = await mkUser('boss');
const sub1 = await mkUser('sub1');
const sub2 = await mkUser('sub2');
const outsider = await mkUser('out');
for (const u of [sub1, sub2]) {
  await call('PUT', `/auth/users/${u.id}/manager`, { token: TA, body: { managerId: boss.id } });
}

const project = (await call('POST', '/projects', {
  token: TA,
  body: {
    name: `Perf ${stamp}`, startDate: '2026-01-01', endDate: '2028-12-31',
    members: [boss, sub1, sub2, outsider].map((u) => ({ user: u.id, role: 'developer', allocation: 50 })),
  },
})).data?.project;
await call('PATCH', `/projects/${project?._id}/permissions`, { token: TA, body: { failureConfig: { enabled: true, allowedRoles: [] } } });

const mkTask = async (assignee, endDate, title) => (await call('POST', '/tasks', {
  token: TA,
  body: { title: `${title} ${stamp}`, project: project._id, assignee, estimatedHours: 4, ...(endDate ? { startDate: '2026-01-05', endDate } : {}) },
})).data?.task?._id;

// sub1: đúng hạn, trễ hạn, thất bại, còn hạn (có gia hạn), một việc ngoài kỳ, một việc không có deadline.
const onTime = await mkTask(sub1.id, '2027-06-10', 'đúng hạn');
const late = await mkTask(sub1.id, '2026-01-10', 'trễ hạn');
const failed = await mkTask(sub1.id, '2027-06-12', 'thất bại');
const extended = await mkTask(sub1.id, '2027-06-15', 'gia hạn');
await mkTask(sub1.id, '2028-06-01', 'ngoài kỳ');
await mkTask(sub1.id, null, 'không hạn');
await mkTask(boss.id, '2026-02-01', 'quá hạn');
await mkTask(outsider.id, '2027-06-10', 'người ngoài');

const completeOnTime = await call('PATCH', `/tasks/${onTime}/complete`, { token: TA });
const completeLate = await call('PATCH', `/tasks/${late}/complete`, { token: TA });
const markFailed = await call('PATCH', `/tasks/${failed}/status`, { token: TA, body: { status: 'failed', failureReason: 'Khách hủy' } });
const extend = await call('PUT', `/tasks/${extended}`, { token: TA, body: { endDate: '2027-06-20', deadlineReason: 'Chờ khách' } });

ok(!!(boss.token && sub1.token && sub2.token && outsider.token && project?._id), 'Dựng đủ người và dự án');
ok([completeOnTime, completeLate, markFailed, extend].every((r) => r.status === 200),
  'Hoàn thành, đánh dấu thất bại và gia hạn đều qua',
  [completeOnTime, completeLate, markFailed, extend].map((r) => r.status).join('/'));

// ══════════════════════════════════════════════
S('Phạm vi "me"');
{
  const res = await perf(boss.token, `scope=me&from=${FROM}&to=${TO}`);
  ok(res.status === 200 && res.data?.people?.length === 1, 'Chỉ có một dòng là chính mình', `status=${res.status} ${res.data?.people?.length} dòng`);
  const me = rowOf(res, boss.id);
  ok(me?.total === 1 && me?.overdue === 1, 'Việc chưa xong mà deadline đã qua → quá hạn', JSON.stringify(me && { total: me.total, overdue: me.overdue }));
}

// ══════════════════════════════════════════════
S('Phạm vi "subordinates"');
{
  const res = await perf(boss.token, `scope=subordinates&from=${FROM}&to=${TO}`);
  const ids = (res.data?.people || []).map((p) => String(p.user._id)).sort();
  ok(res.status === 200 && JSON.stringify(ids) === JSON.stringify([sub1.id, sub2.id].map(String).sort()),
    'Đúng hai cấp dưới trực tiếp — không có chính mình, không có người ngoài', `status=${res.status} ${ids.length} dòng`);

  const s1 = rowOf(res, sub1.id);
  const want = { total: 4, onTime: 1, late: 1, failed: 1, open: 1, extensions: 1, onTimeRate: 50 };
  const got = s1 && Object.fromEntries(Object.keys(want).map((k) => [k, s1[k]]));
  ok(JSON.stringify(got) === JSON.stringify(want),
    'Đúng/trễ theo completedAt thật, thất bại, gia hạn; việc ngoài kỳ và không hạn không tính', JSON.stringify(got));

  const s2 = rowOf(res, sub2.id);
  ok(s2?.total === 0 && s2?.onTimeRate === null, 'Cấp dưới không có việc vẫn hiện với số 0');
  ok(res.data?.excluded?.noDeadline === 1, 'Việc còn mở không có deadline được đếm riêng', `noDeadline=${res.data?.excluded?.noDeadline}`);

  const plain = await perf(sub1.token, `scope=subordinates&from=${FROM}&to=${TO}`);
  ok(plain.status === 200 && plain.data?.people?.length === 0, 'Người không quản lý ai → danh sách rỗng', `${plain.data?.people?.length} dòng`);
}

// ══════════════════════════════════════════════
S('Phạm vi "all" và quyền');
{
  const denied = await perf(boss.token, `scope=all&from=${FROM}&to=${TO}`);
  ok(denied.status === 403, 'Người không phải Owner/Admin gọi scope=all → 403', `status=${denied.status}`);

  const res = await perf(TA, `scope=all&from=${FROM}&to=${TO}`);
  ok(res.status === 200 && [boss, sub1, sub2, outsider].every((u) => rowOf(res, u.id)), 'Admin thấy mọi người trong công ty', `status=${res.status}`);
  ok(rowOf(res, sub1.id)?.total === 4, 'Số của một người không đổi theo phạm vi');

  const def = await perf(boss.token, '');
  ok(def.status === 200 && def.data?.scope === 'me', 'Không truyền scope → mặc định "me"', `status=${def.status} scope=${def.data?.scope}`);
  const now = new Date();
  const from = new Date(def.data?.from);
  ok(from.getFullYear() === now.getFullYear() && from.getMonth() === now.getMonth() && from.getDate() === 1,
    'Không truyền kỳ → mặc định từ đầu tháng này', `from=${def.data?.from}`);
}

// ══════════════════════════════════════════════
S('Tham số sai');
{
  ok((await perf(TA, 'scope=xyz')).status === 400, 'scope lạ → 400');
  ok((await perf(TA, 'scope=me&from=2027-01-01&to=2026-01-01')).status === 400, 'from > to → 400');
  ok((await perf(TA, 'scope=me&from=abc')).status === 400, 'Ngày sai → 400');
}

// ══════════════════════════════════════════════
S('Phân lập công ty');
{
  const regB = await call('POST', '/auth/register', {
    body: { name: 'Chủ B', email: `perf.${stamp}@b.com`, password: 'password123', companyName: `Công ty B perf ${stamp}` },
  });
  const res = await perf(regB.data?.token, `scope=all&from=${FROM}&to=${TO}`);
  const ids = (res.data?.people || []).map((p) => String(p.user._id));
  ok(res.status === 200 && ids.length === 1 && ids[0] === String(regB.data?.user?._id), 'Admin công ty B chỉ thấy chính mình', `${ids.length} dòng`);
  ok(res.data?.totals?.total === 0, 'Không lọt việc nào của công ty A');

  // Gán người của B làm quản lý của người A bị chặn từ trước, nên kiểm thêm chiều
  // ngược: quản lý của A gọi subordinates không thấy ai ngoài công ty.
  const mine = await perf(boss.token, `scope=subordinates&from=${FROM}&to=${TO}`);
  ok((mine.data?.people || []).every((p) => [sub1.id, sub2.id].map(String).includes(String(p.user._id))), 'Cấp dưới chỉ là người cùng công ty');
}

process.exit(summary() ? 1 : 0);
