/**
 * Job định kỳ: endpoint nội bộ gọi từ cron bên ngoài.
 *
 * Rủi ro của cách này nằm ở ba chỗ, và bộ này giữ cả ba:
 *   - Ai cũng gọi được thì ai cũng sinh được việc → khóa `X-Job-Secret`.
 *   - Cron gọi lại khi timeout, hoặc hai instance cùng được gọi → job phải chạy lại an toàn.
 *   - Quên cấu hình cron thì job không bao giờ chạy mà không ai biết → `/jobs/status` báo `stale`.
 */
import { API, call, login, ok, section as S, summary } from './helpers.mjs';

const SECRET = process.env.JOB_SECRET || 'rao_test_job_secret';
const stamp = Date.now();
const runJob = async (name, secret = SECRET) => {
  const res = await fetch(`${API}/internal/jobs/${name}`, {
    method: 'POST',
    headers: secret === null ? {} : { 'X-Job-Secret': secret },
  });
  return { status: res.status, ...(await res.json().catch(() => ({}))) };
};

const admin = await login('admin@rao.com');
const member = await login('nam.tran@rao.com');

// ══════════════════════════════════════════════
S('Khóa của endpoint nội bộ');
{
  ok((await runJob('recurring-tasks', null)).status === 401, 'Thiếu X-Job-Secret → 401');
  ok((await runJob('recurring-tasks', 'sai')).status === 401, 'Sai X-Job-Secret → 401');
  ok((await runJob('khong-co-job-nay')).status === 404, 'Tên job lạ → 404');
  const viaUser = await fetch(`${API}/internal/jobs/recurring-tasks`, { method: 'POST', headers: { Authorization: `Bearer ${admin}` } });
  ok(viaUser.status === 401, 'Token đăng nhập (kể cả admin) không thay được khóa job', `status=${viaUser.status}`);
}

S('Server không đặt JOB_SECRET: endpoint tắt hẳn');
{
  // Server test luôn có JOB_SECRET, nên kiểm thẳng hàm chốt bằng req/res giả.
  const { createRequire } = await import('module');
  const { requireJobSecret } = createRequire(import.meta.url)('../src/routes/internal.routes.js');
  const saved = process.env.JOB_SECRET;
  delete process.env.JOB_SECRET;
  let status = 0;
  let passed = false;
  const res = { status: (s) => { status = s; return { json: () => {} }; } };
  requireJobSecret({ get: () => '' }, res, () => { passed = true; });
  ok(status === 503 && !passed, 'Thiếu JOB_SECRET → 503, không cho qua kể cả khi header rỗng', `status=${status}`);
  if (saved !== undefined) process.env.JOB_SECRET = saved;
}

S('Trước lần chạy đầu: trạng thái báo chưa chạy');
{
  const denied = await call('GET', '/jobs/status', { token: member });
  ok(denied.status === 403, 'Member không xem được trạng thái job', `status=${denied.status}`);
  const st = await call('GET', '/jobs/status', { token: admin });
  const recurring = (st.data?.jobs || []).find((j) => j.name === 'recurring-tasks');
  ok(st.status === 200 && recurring && recurring.lastSuccessAt === null && recurring.stale === true,
    'Job chưa từng chạy → lastSuccessAt null, stale', JSON.stringify(recurring));
}

// ══════════════════════════════════════════════
/** Số lượt hằng ngày đến hạn tính tới bây giờ: lượt đầu là ngày sau startDate, mỗi lượt lúc 07:00. */
const dueDailyRuns = (startDate) => {
  const d = new Date(startDate);
  d.setDate(d.getDate() + 1);
  d.setHours(7, 0, 0, 0);
  let count = 0;
  for (const now = new Date(); d <= now; d.setDate(d.getDate() + 1)) count++;
  return count;
};
const tasksTitled = async (title) =>
  ((await call('GET', `/tasks?limit=100&search=${encodeURIComponent(title)}`, { token: admin })).data?.tasks || [])
    .filter((t) => t.title === title);

S('Job việc lặp lại: sinh bù đủ lượt lỡ trong một lần, chạy song song không sinh trùng');
{
  const project = (await call('GET', '/projects', { token: admin })).data.projects[0]._id;
  const start = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  const title = `Lặp hằng ngày ${stamp}`;
  const rec = await call('POST', '/recurring-tasks', {
    token: admin, body: { title, project, frequency: 'daily', startDate: start, durationHours: 2 },
  });
  ok(rec.status === 201, 'Tạo cấu hình lặp hằng ngày, đã đến hạn', `status=${rec.status} ${rec.message || ''}`);
  const due = dueDailyRuns(start);

  // Cron gọi lại khi timeout, hoặc hai instance cùng được gọi.
  const [a, b] = await Promise.all([runJob('recurring-tasks'), runJob('recurring-tasks')]);
  ok(a.status === 200 && b.status === 200, 'Hai lần gọi song song đều 200', `${a.status}/${b.status} ${a.message || ''}`);
  const made = await tasksTitled(title);
  // Trước đây mỗi lần gọi chỉ sinh một lượt: lỡ 3 ngày thì phải đợi 3 lần cron mới đuổi kịp.
  ok(made.length === due, 'Sinh đủ mọi lượt đến hạn ngay trong lần gọi này', `${made.length}/${due} việc`);
  const days = new Set(made.map((t) => String(t.startDate).slice(0, 10)));
  ok(days.size === made.length, 'Mỗi lượt đúng một việc — không ngày nào trùng', [...days].join(','));
  const generated = (a.data?.result?.generated || 0) + (b.data?.result?.generated || 0);
  ok(generated >= due, 'Kết quả job báo số việc đã sinh', `generated=${generated}`);

  await runJob('recurring-tasks');
  ok((await tasksTitled(title)).length === due, 'Gọi lại khi không còn lượt đến hạn thì không sinh thêm');
}

S('Job việc lặp lại: lỡ quá nhiều lượt thì mỗi lần gọi sinh tối đa 31');
{
  const project = (await call('GET', '/projects', { token: admin })).data.projects[0]._id;
  const start = new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10);
  const title = `Lặp lỡ lâu ${stamp}`;
  await call('POST', '/recurring-tasks', {
    token: admin, body: { title, project, frequency: 'daily', startDate: start, durationHours: 2 },
  });
  const due = dueDailyRuns(start);

  await runJob('recurring-tasks');
  ok((await tasksTitled(title)).length === 31, 'Lần gọi đầu dừng ở trần 31 lượt', `${(await tasksTitled(title)).length}/${due}`);
  await runJob('recurring-tasks');
  ok((await tasksTitled(title)).length === due, 'Lần gọi sau sinh nốt phần còn lại', `${(await tasksTitled(title)).length}/${due}`);
}

S('Job chụp workload: khớp trang Utilization, chạy lại trong ngày không trùng');
{
  const first = await runJob('workload-snapshot');
  const again = await runJob('workload-snapshot');
  ok(first.status === 200 && again.status === 200, 'Chạy hai lần trong ngày đều 200', `${first.status}/${again.status}`);
  ok(first.data?.result?.snapshots > 0, 'Báo số nhân sự đã chụp', JSON.stringify(first.data?.result));

  const today = new Date().toISOString().slice(0, 10);
  const hist = await call('GET', `/analytics/workload-history?from=${today}&to=${today}`, { token: admin });
  const people = hist.data?.history?.resources || [];
  ok(hist.status === 200 && people.length > 0, 'GET /analytics/workload-history trả chuỗi theo người', `status=${hist.status} ${people.length} người`);
  ok(people.every((p) => p.points.length === 1), 'Mỗi người đúng một điểm cho hôm nay — chạy lại thì ghi đè, không thêm',
    people.map((p) => p.points.length).join(','));

  // Ảnh chụp phải là đúng con số trang Utilization đang hiện, không phải một phép tính khác.
  const util = (await call('GET', '/analytics/utilization', { token: admin })).data?.resources || [];
  const mismatches = people.filter((p) => {
    const u = util.find((r) => String(r.id || r._id) === String(p._id));
    return u && Math.abs((u.workload || 0) - p.points[0].workload) > 0.05;
  });
  const compared = people.filter((p) => util.some((r) => String(r.id || r._id) === String(p._id)) && p.points[0].workload > 0);
  ok(compared.length > 0, 'Có người mang tải thật để so (bài so sánh không đạt vô nghĩa)', `${compared.length} người`);
  ok(mismatches.length === 0, 'Tải trong ảnh chụp khớp trang Utilization', mismatches.map((m) => m.name).join(', '));
  ok(people.every((p) => p.points[0].capacity > 0), 'Có capacity để tính tỉ lệ');

  const regB = await call('POST', '/auth/register', {
    body: { name: 'Chủ B', email: `jobs.${stamp}@b.com`, password: 'password123', companyName: `Công ty B jobs ${stamp}` },
  });
  const histB = await call('GET', `/analytics/workload-history?from=${today}&to=${today}`, { token: regB.data?.token });
  const idsA = new Set(people.map((p) => String(p._id)));
  ok((histB.data?.history?.resources || []).every((p) => !idsA.has(String(p._id))), 'Công ty B không thấy nhân sự của A');
  ok((await call('GET', '/analytics/workload-history?from=abc', { token: admin })).status === 400, 'Ngày sai → 400');
}

S('Sau khi chạy: trạng thái ghi nhận');
{
  const st = await call('GET', '/jobs/status', { token: admin });
  const recurring = (st.data?.jobs || []).find((j) => j.name === 'recurring-tasks');
  ok(!!recurring?.lastSuccessAt && recurring.stale === false, 'Có lastSuccessAt, hết stale', JSON.stringify(recurring));
}

process.exit(summary() ? 1 : 0);
