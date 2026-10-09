// Trường dữ liệu tùy chỉnh theo dự án.
//
// Mỗi dự án tự khai thêm trường cho công việc (văn bản, số, ngày, chọn một). Bộ này khóa:
// ai được khai, server kiểm định nghĩa ra sao, mọi đường ghi giá trị (tạo, sửa) kiểm đúng kiểu
// và lựa chọn, xóa trường / bỏ lựa chọn / chuyển dự án không để lại giá trị mồ côi, lọc theo
// trường chọn một, và nhân bản giữ được cả định nghĩa lẫn giá trị.
import { call, login, ok, section, summary } from './helpers.mjs';

const admin = await login('admin@rao.com');
const pm = await login('pm@rao.com');
const nam = await login('nam.tran@rao.com');

const iso = (offsetDays) => new Date(Date.now() + offsetDays * 86400000).toISOString();
const stamp = Date.now();
const pmId = (await call('GET', '/auth/me', { token: pm })).data?.user?._id;
const namId = (await call('GET', '/auth/me', { token: nam })).data?.user?._id;

const newProject = async (name) => (await call('POST', '/projects', {
  token: admin,
  body: { name: `${name} ${stamp}`, manager: pmId, startDate: iso(0), endDate: iso(30), members: [{ user: namId, role: 'developer' }] },
})).data?.project;

const putFields = (token, projectId, fields) => call('PUT', `/projects/${projectId}/custom-fields`, { token, body: { fields } });
const newTask = (token, body) => call('POST', '/tasks', { token, body: { estimatedHours: 4, ...body } });
const getTask = async (id) => (await call('GET', `/tasks/${id}`, { token: admin })).data?.task;

const project = await newProject('Marketing');

section('Khai trường');
const saved = await putFields(pm, project._id, [
  { name: 'Kênh', type: 'select', options: ['Facebook', 'TikTok', 'Email'], required: true },
  { name: 'Ngân sách', type: 'number' },
  { name: 'Ngày phát hành', type: 'date' },
  { name: 'Ghi chú khách hàng', type: 'text' },
]);
const fields = saved.data?.project?.customFields || [];
ok(saved.status === 200 && fields.length === 4, 'Quản lý dự án khai được trường', `status=${saved.status} ${saved.message || ''}`);
ok(fields.every((f) => /^f_[a-z0-9]{8}$/.test(f.key)), 'Server sinh key cho mỗi trường', fields.map((f) => f.key).join(','));
ok(fields.map((f) => f.order).join() === '0,1,2,3', 'Giữ đúng thứ tự gửi lên');
const [channel, budget, release, note] = fields;

{
  const member = await putFields(nam, project._id, [{ name: 'X', type: 'text' }]);
  ok(member.status === 403, 'Thành viên không khai được', `status=${member.status}`);
  const dupName = await putFields(pm, project._id, [{ name: 'Kênh', type: 'text' }, { name: ' kênh ', type: 'number' }]);
  ok(dupName.status === 400, 'Tên trùng (không phân biệt hoa thường, khoảng trắng) → 400', `status=${dupName.status}`);
  const badType = await putFields(pm, project._id, [{ name: 'Công thức', type: 'formula' }]);
  ok(badType.status === 400, 'Kiểu lạ → 400', `status=${badType.status}`);
  const noOptions = await putFields(pm, project._id, [{ name: 'Chọn', type: 'select', options: [] }]);
  ok(noOptions.status === 400, 'Chọn một mà không có lựa chọn → 400', `status=${noOptions.status}`);
  const tooMany = await putFields(pm, project._id, Array.from({ length: 21 }, (_, i) => ({ name: `T${i}`, type: 'text' })));
  ok(tooMany.status === 400, 'Quá 20 trường → 400', `status=${tooMany.status}`);
  const retype = await putFields(pm, project._id, fields.map((f) => (f.key === budget.key ? { ...f, type: 'text' } : f)));
  ok(retype.status === 400, 'Đổi kiểu một trường đã có → 400', `status=${retype.status} ${retype.message || ''}`);
  const fakeKey = await putFields(pm, project._id, [...fields, { key: 'f_zzzzzzzz', name: 'Giả', type: 'text' }]);
  ok(fakeKey.status === 400, 'Gửi key không có trong dự án → 400', `status=${fakeKey.status}`);
  const after = (await call('GET', `/projects/${project._id}`, { token: admin })).data?.project?.customFields || [];
  ok(after.length === 4, 'Các lần bị từ chối không đổi gì');
}

section('Giá trị khi tạo và sửa việc');
const created = await newTask(nam, {
  title: `Chiến dịch tháng 11 ${stamp}`,
  project: project._id,
  customValues: { [channel.key]: 'TikTok', [budget.key]: 15000000, [release.key]: '2026-11-20', [note.key]: 'Ưu tiên video ngắn' },
});
const taskId = created.data?.task?._id;
ok(created.status === 201, 'Tạo việc kèm giá trị đúng → 201', `status=${created.status} ${created.message || ''}`);
{
  const t = await getTask(taskId);
  const v = t?.customValues || {};
  ok(v[channel.key] === 'TikTok' && v[budget.key] === 15000000 && v[note.key] === 'Ưu tiên video ngắn', 'Đọc lại đúng giá trị', JSON.stringify(v));
  ok(String(v[release.key]).startsWith('2026-11-20'), 'Ngày lưu thành kiểu ngày', String(v[release.key]));
}
{
  const missing = await newTask(nam, { title: `Thiếu kênh ${stamp}`, project: project._id, customValues: { [budget.key]: 1 } });
  ok(missing.status === 400, 'Thiếu trường bắt buộc khi tạo → 400', `status=${missing.status} ${missing.message || ''}`);
  const none = await newTask(nam, { title: `Không gửi gì ${stamp}`, project: project._id });
  ok(none.status === 400, 'Không gửi customValues mà dự án có trường bắt buộc → 400', `status=${none.status}`);
  const badOption = await newTask(nam, { title: `Sai kênh ${stamp}`, project: project._id, customValues: { [channel.key]: 'Zalo' } });
  ok(badOption.status === 400, 'Giá trị ngoài lựa chọn → 400', `status=${badOption.status}`);
  const badNumber = await newTask(nam, { title: `Sai số ${stamp}`, project: project._id, customValues: { [channel.key]: 'Email', [budget.key]: 'nhiều' } });
  ok(badNumber.status === 400, 'Số không hợp lệ → 400', `status=${badNumber.status}`);
  const badDate = await newTask(nam, { title: `Sai ngày ${stamp}`, project: project._id, customValues: { [channel.key]: 'Email', [release.key]: '31/02/2026' } });
  ok(badDate.status === 400, 'Ngày không hợp lệ → 400', `status=${badDate.status}`);
  const unknown = await newTask(nam, { title: `Key lạ ${stamp}`, project: project._id, customValues: { [channel.key]: 'Email', 'f_abcdefgh': 'x' } });
  ok(unknown.status === 400, 'Trường không có trong dự án → 400', `status=${unknown.status}`);
  const badKey = await newTask(nam, { title: `Key sai dạng ${stamp}`, project: project._id, customValues: { [channel.key]: 'Email', notakey: 'x' } });
  ok(badKey.status === 400, 'Key sai dạng → 400', `status=${badKey.status}`);
  // Khóa có `.` hoặc `$` bị middleware sanitize cắt trước khi tới controller — lớp chặn thứ nhất.
  const injected = await newTask(nam, { title: `Key độc ${stamp}`, project: project._id, customValues: { [channel.key]: 'Email', 'a.b': 'x' } });
  const injectedValues = (await getTask(injected.data?.task?._id))?.customValues || {};
  ok(!Object.keys(injectedValues).some((k) => k.startsWith('a')), 'Key có dấu chấm không bao giờ được lưu', JSON.stringify(injectedValues));
  const longText = await newTask(nam, { title: `Dài ${stamp}`, project: project._id, customValues: { [channel.key]: 'Email', [note.key]: 'x'.repeat(1001) } });
  ok(longText.status === 400, 'Văn bản quá 1000 ký tự → 400', `status=${longText.status}`);
}
{
  const status = await call('PUT', `/tasks/${taskId}`, { token: admin, body: { progress: 30 } });
  ok(status.status === 200, 'Sửa không gửi customValues thì không bị kiểm lại', `status=${status.status}`);
  const clear = await call('PUT', `/tasks/${taskId}`, { token: admin, body: { customValues: { [budget.key]: null, [note.key]: '' } } });
  ok(clear.status === 200, 'Gửi null / chuỗi rỗng → 200', `status=${clear.status} ${clear.message || ''}`);
  const v = (await getTask(taskId))?.customValues || {};
  ok(!(budget.key in v) && !(note.key in v), 'null / rỗng là xóa giá trị', JSON.stringify(v));
  ok(v[channel.key] === 'TikTok', 'Giá trị không gửi kèm thì giữ nguyên');
  const dropRequired = await call('PUT', `/tasks/${taskId}`, { token: admin, body: { customValues: { [channel.key]: null } } });
  ok(dropRequired.status === 400, 'Xóa giá trị của trường bắt buộc → 400', `status=${dropRequired.status}`);
}

section('Lọc theo trường chọn một');
{
  const email = await newTask(nam, { title: `Bản tin ${stamp}`, project: project._id, customValues: { [channel.key]: 'Email' } });
  const tiktok = await call('GET', `/tasks?project=${project._id}&cf_${channel.key}=TikTok`, { token: admin });
  const ids = (tiktok.data?.tasks || []).map((t) => t._id);
  ok(tiktok.status === 200 && ids.includes(taskId) && !ids.includes(email.data?.task?._id), 'Chỉ ra việc có đúng lựa chọn', `${ids.length} việc`);
  const bad = await call('GET', '/tasks?cf_khongphaikey=1', { token: admin });
  ok(bad.status === 400, 'Key lọc sai dạng → 400', `status=${bad.status}`);
}

section('Đổi định nghĩa: giữ, xóa, bỏ lựa chọn');
{
  const renamed = await putFields(pm, project._id, [
    { ...channel, name: 'Kênh truyền thông', options: ['Facebook', 'TikTok'] }, // bỏ "Email"
    budget,
    { ...release, name: 'Ngày lên sóng' },
    // bỏ "Ghi chú khách hàng"
  ]);
  ok(renamed.status === 200, 'Đổi tên, bỏ lựa chọn, xóa trường → 200', `status=${renamed.status} ${renamed.message || ''}`);
  const keys = (renamed.data?.project?.customFields || []).map((f) => f.key);
  ok(keys.join() === [channel.key, budget.key, release.key].join(), 'Key giữ nguyên khi đổi tên');
  ok((await getTask(taskId))?.customValues?.[channel.key] === 'TikTok', 'Đổi tên không mất giá trị');

  const list = await call('GET', `/tasks?project=${project._id}&limit=100`, { token: admin });
  const leftEmail = (list.data?.tasks || []).filter((t) => t.customValues?.[channel.key] === 'Email');
  ok(leftEmail.length === 0, 'Lựa chọn bị bỏ thì giá trị đó biến mất', `${leftEmail.length} việc còn "Email"`);
  const leftNote = (list.data?.tasks || []).filter((t) => t.customValues && note.key in t.customValues);
  ok(leftNote.length === 0, 'Trường bị xóa thì giá trị của nó biến mất');
}

section('Nhân bản và chuyển dự án');
{
  const dup = await call('POST', `/tasks/${taskId}/duplicate`, { token: admin, body: {} });
  const copy = await getTask(dup.data?.task?._id);
  ok(copy?.customValues?.[channel.key] === 'TikTok', 'Nhân bản trong cùng dự án giữ giá trị', `status=${dup.status}`);

  const other = await newProject('Kỹ thuật');
  const moved = await call('POST', `/tasks/${dup.data?.task?._id}/move`, { token: admin, body: { targetProjectId: other._id } });
  ok(moved.status === 200, 'Chuyển sang dự án khác → 200', `status=${moved.status} ${moved.message || ''}`);
  const after = await getTask(dup.data?.task?._id);
  ok(!after?.customValues || Object.keys(after.customValues).length === 0, 'Chuyển dự án thì bỏ giá trị của dự án cũ', JSON.stringify(after?.customValues));

  const cloned = await call('POST', `/projects/${project._id}/duplicate`, { token: admin, body: { name: `Bản sao ${stamp}`, startDate: iso(1) } });
  const cloneId = cloned.data?.project?._id;
  const cloneProject = (await call('GET', `/projects/${cloneId}`, { token: admin })).data?.project;
  ok((cloneProject?.customFields || []).map((f) => f.key).join() === [channel.key, budget.key, release.key].join(), 'Nhân bản dự án chép định nghĩa, giữ key', `status=${cloned.status}`);
  const cloneTasks = (await call('GET', `/tasks?project=${cloneId}&limit=100`, { token: admin })).data?.tasks || [];
  ok(cloneTasks.some((t) => t.customValues?.[channel.key] === 'TikTok'), 'Nhân bản dự án chép giá trị');
}

section('Dự án lưu trữ');
{
  const p = await newProject('Đóng');
  const archived = await call('POST', `/projects/${p._id}/archive`, { token: admin });
  const res = await putFields(admin, p._id, [{ name: 'X', type: 'text' }]);
  ok(archived.status === 200 && res.status === 409, 'Khai trường trên dự án lưu trữ → 409', `archive=${archived.status} put=${res.status}`);
}

process.exit(summary() ? 1 : 0);
