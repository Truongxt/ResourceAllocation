// Đính kèm tệp thật trên công việc.
//
// Trước đây `resultReport.attachments` chỉ là một trường trong DB: không có đường tải lên,
// giao diện cũng không dùng. Bộ này khóa: tải lên → danh sách → tải về đúng byte và đúng tên
// có dấu; giới hạn kiểu và cỡ tệp; quyền theo đúng bình luận; dự án lưu trữ chỉ đọc; xóa
// việc / dự án không để lại tệp mồ côi trên đĩa.
import { existsSync, readdirSync } from 'fs';
import { API, call, login, ok, section, summary } from './helpers.mjs';

const UPLOAD_DIR = process.env.UPLOAD_DIR;
const filesOnDisk = () => (existsSync(UPLOAD_DIR) ? readdirSync(UPLOAD_DIR) : []);

const admin = await login('admin@rao.com');
const pm = await login('pm@rao.com');
const nam = await login('nam.tran@rao.com');
const hoa = await login('hoa.le@rao.com');

const iso = (offsetDays) => new Date(Date.now() + offsetDays * 86400000).toISOString();
const stamp = Date.now();

const upload = async (token, taskId, { name = 'bao-cao.pdf', bytes = Buffer.from('%PDF-1.4 nội dung thử'), type = 'application/pdf' } = {}) => {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type }), name);
  const res = await fetch(`${API}/tasks/${taskId}/attachments`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  return { status: res.status, ...(await res.json().catch(() => ({}))) };
};

const download = async (token, taskId, attachmentId) => {
  const res = await fetch(`${API}/tasks/${taskId}/attachments/${attachmentId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status, headers: res.headers, bytes: Buffer.from(await res.arrayBuffer()) };
};

const list = (token, taskId) => call('GET', `/tasks/${taskId}/attachments`, { token });

// Dự án do PM mẫu quản lý, có Nam làm thành viên, và một việc của Nam.
const pmId = (await call('GET', '/auth/me', { token: pm })).data?.user?._id;
const namId = (await call('GET', '/auth/me', { token: nam })).data?.user?._id;
const project = (await call('POST', '/projects', {
  token: admin,
  body: { name: `Đính kèm ${stamp}`, manager: pmId, startDate: iso(0), endDate: iso(30), members: [{ user: namId, role: 'developer' }] },
})).data?.project;
const task = (await call('POST', '/tasks', {
  token: admin,
  body: { title: `Việc có tệp ${stamp}`, project: project?._id, assignee: namId, estimatedHours: 4, startDate: iso(1), endDate: iso(3) },
})).data?.task;

section('Chuẩn bị');
ok(!!project?._id && !!task?._id, 'Có dự án và việc để đính kèm', `project=${project?._id} task=${task?._id}`);
ok(!!UPLOAD_DIR, 'Trình chạy đặt UPLOAD_DIR riêng cho test', String(UPLOAD_DIR));

section('Tải lên, xem, tải về');
const content = Buffer.from('%PDF-1.4\nBáo cáo tuần — nội dung thử nghiệm\n');
const name = 'Báo cáo tuần 41 (bản cuối).pdf';
const up = await upload(nam, task._id, { name, bytes: content });
const att = up.data?.attachment;
ok(up.status === 201, 'Thành viên tải tệp lên → 201', `status=${up.status} ${up.message || ''}`);
ok(att?.originalName === name, 'Giữ đúng tên gốc có dấu', att?.originalName);
ok(att?.size === content.length, 'Ghi đúng cỡ tệp', `${att?.size} / ${content.length}`);
ok(!('storageKey' in (att || {})), 'Không lộ đường lưu trên đĩa ra client');

const listed = await list(hoa, task._id);
ok(listed.status === 200 && listed.data?.attachments?.length === 1, 'Người cùng công ty xem được danh sách', `status=${listed.status}`);
ok(listed.data?.attachments?.[0]?.uploadedBy?.name, 'Danh sách kèm tên người tải lên');

const dl = await download(hoa, task._id, att._id);
ok(dl.status === 200 && dl.bytes.equals(content), 'Tải về đúng từng byte', `status=${dl.status} ${dl.bytes.length}B`);
const disposition = dl.headers.get('content-disposition') || '';
ok(/^attachment;/.test(disposition), 'Luôn tải về, không mở trên trang', disposition);
ok(decodeURIComponent(disposition.split("filename*=UTF-8''")[1] || '') === name, 'Tên tải về đúng tên gốc có dấu', disposition);
ok(dl.headers.get('x-content-type-options') === 'nosniff', 'Kèm nosniff');

section('Giới hạn kiểu và cỡ tệp');
{
  const html = await upload(nam, task._id, { name: 'trang.html', bytes: Buffer.from('<script>alert(1)</script>'), type: 'text/html' });
  ok(html.status === 400, 'Tệp .html → 400', `status=${html.status}`);
  const svg = await upload(nam, task._id, { name: 'logo.SVG', bytes: Buffer.from('<svg/>'), type: 'image/svg+xml' });
  ok(svg.status === 400, 'Tệp .svg (đuôi viết hoa) → 400', `status=${svg.status}`);
  const exe = await upload(nam, task._id, { name: 'cai-dat.pdf.exe', bytes: Buffer.from('MZ') });
  ok(exe.status === 400, 'Đuôi kép giấu .exe → 400', `status=${exe.status}`);
  const big = await upload(nam, task._id, { name: 'lon.zip', bytes: Buffer.alloc(10 * 1024 * 1024 + 1), type: 'application/zip' });
  ok(big.status === 413, 'Quá 10 MB → 413', `status=${big.status} ${big.message || ''}`);
  const none = await fetch(`${API}/tasks/${task._id}/attachments`, { method: 'POST', headers: { Authorization: `Bearer ${nam}` }, body: new FormData() });
  ok(none.status === 400, 'Không có tệp → 400', `status=${none.status}`);
  ok((await list(admin, task._id)).data?.attachments?.length === 1, 'Các lần bị từ chối không để lại bản ghi');
}

section('Phân lập công ty');
{
  const reg = await call('POST', '/auth/register', {
    body: { name: 'Chủ B', email: `attach.${stamp}@b.com`, password: 'password123', companyName: `Công ty B đính kèm ${stamp}` },
  });
  const b = reg.data?.token;
  ok((await list(b, task._id)).status === 403, 'Công ty khác không xem được danh sách');
  ok((await download(b, task._id, att._id)).status === 403, 'Công ty khác không tải về được');
  ok((await upload(b, task._id)).status === 403, 'Công ty khác không tải lên được');
  const del = await call('DELETE', `/tasks/${task._id}/attachments/${att._id}`, { token: b });
  ok(del.status === 403, 'Công ty khác không xóa được', `status=${del.status}`);
}

section('Tệp phải thuộc đúng công việc');
{
  const other = (await call('POST', '/tasks', {
    token: admin, body: { title: `Việc khác ${stamp}`, project: project._id, estimatedHours: 2 },
  })).data?.task;
  ok((await download(admin, other._id, att._id)).status === 404, 'Tải tệp qua id của việc khác → 404');
  const del = await call('DELETE', `/tasks/${other._id}/attachments/${att._id}`, { token: admin });
  ok(del.status === 404, 'Xóa tệp qua id của việc khác → 404', `status=${del.status}`);
}

section('Quyền xóa');
{
  const byHoa = await call('DELETE', `/tasks/${task._id}/attachments/${att._id}`, { token: hoa });
  ok(byHoa.status === 403, 'Người khác (không phải người tải, không quản lý dự án) không xóa được', `status=${byHoa.status}`);

  const second = (await upload(nam, task._id, { name: 'anh.png', bytes: Buffer.from('PNG'), type: 'image/png' })).data?.attachment;
  const keysBefore = filesOnDisk().length;
  const byPm = await call('DELETE', `/tasks/${task._id}/attachments/${second._id}`, { token: pm });
  ok(byPm.status === 200, 'Quản lý dự án xóa được tệp của người khác', `status=${byPm.status} ${byPm.message || ''}`);
  ok(filesOnDisk().length === keysBefore - 1, 'Xóa thì tệp trên đĩa cũng mất', `${keysBefore} → ${filesOnDisk().length}`);

  const third = (await upload(nam, task._id, { name: 'ghi-chu.txt', bytes: Buffer.from('x'), type: 'text/plain' })).data?.attachment;
  const byOwner = await call('DELETE', `/tasks/${task._id}/attachments/${third._id}`, { token: nam });
  ok(byOwner.status === 200, 'Người tải lên xóa được tệp của mình', `status=${byOwner.status}`);
}

section('Tối đa 20 tệp mỗi việc');
{
  const t = (await call('POST', '/tasks', { token: admin, body: { title: `Nhiều tệp ${stamp}`, project: project._id, estimatedHours: 2 } })).data?.task;
  let lastOk = 0;
  for (let i = 0; i < 20; i++) {
    if ((await upload(admin, t._id, { name: `tep-${i}.txt`, bytes: Buffer.from(String(i)), type: 'text/plain' })).status === 201) lastOk++;
  }
  const over = await upload(admin, t._id, { name: 'tep-21.txt', bytes: Buffer.from('21'), type: 'text/plain' });
  ok(lastOk === 20 && over.status === 400, 'Tệp thứ 21 → 400', `đã tải ${lastOk}, lần 21: ${over.status}`);

  section('Xóa việc thì xóa cả tệp');
  const before = filesOnDisk().length;
  const del = await call('DELETE', `/tasks/${t._id}`, { token: admin });
  ok(del.status === 200, 'Xóa việc → 200', `status=${del.status}`);
  ok(filesOnDisk().length === before - 20, 'Không còn tệp mồ côi trên đĩa', `${before} → ${filesOnDisk().length}`);
  ok((await list(admin, t._id)).status === 404, 'Danh sách tệp của việc đã xóa → 404');
}

// Từ 11/2026 nhân bản mặc định chép cả tệp (ô "Giữ tệp đính kèm" trong DuplicateTaskModal).
// Bản đầu của tính năng tạo bản ghi mới mà thiếu `storageKey` (trường `select: false`), nên
// việc nào có tệp là nhân bản trả 400 — sau khi bản sao đã được tạo. Bộ này khóa cả lỗi đó
// lẫn cái bẫy kế tiếp: hai bản ghi dùng chung một tệp trên đĩa, xóa bên này là mất bên kia.
section('Nhân bản việc: chép tệp thành bản riêng');
{
  const source = (await call('POST', '/tasks', { token: admin, body: { title: `Việc gốc có tệp ${stamp}`, project: project._id, estimatedHours: 2 } })).data?.task;
  const bytes = Buffer.from('%PDF-1.4\nnội dung của bản gốc\n');
  const original = (await upload(admin, source._id, { name: 'hop-dong.pdf', bytes })).data?.attachment;
  const diskBefore = filesOnDisk().length;

  const dup = await call('POST', `/tasks/${source._id}/duplicate`, { token: admin, body: {} });
  const copyId = dup.data?.task?._id;
  ok(dup.status === 201 && !!copyId, 'Nhân bản việc có tệp → 201', `status=${dup.status} ${dup.message || ''}`);

  const copied = (await list(admin, copyId)).data?.attachments || [];
  ok(copied.length === 1 && copied[0].originalName === 'hop-dong.pdf', 'Bản sao có tệp, giữ đúng tên', `${copied.length} tệp`);
  ok(filesOnDisk().length === diskBefore + 1, 'Nội dung được chép thành tệp riêng trên đĩa', `${diskBefore} → ${filesOnDisk().length}`);
  ok(!('storageKey' in (copied[0] || {})), 'Không lộ đường lưu trên đĩa ra client');

  const fromCopy = await download(admin, copyId, copied[0]?._id);
  ok(fromCopy.status === 200 && fromCopy.bytes.equals(bytes), 'Tải về từ bản sao đúng từng byte', `status=${fromCopy.status}`);

  const delCopy = await call('DELETE', `/tasks/${copyId}/attachments/${copied[0]?._id}`, { token: admin });
  const fromOriginal = await download(admin, source._id, original._id);
  ok(delCopy.status === 200 && fromOriginal.status === 200 && fromOriginal.bytes.equals(bytes),
    'Xóa tệp ở bản sao không làm mất tệp của bản gốc', `xóa=${delCopy.status} tải gốc=${fromOriginal.status}`);

  const bare = await call('POST', `/tasks/${source._id}/duplicate`, { token: admin, body: { keepAttachments: false } });
  ok(bare.status === 201 && (await list(admin, bare.data?.task?._id)).data?.attachments?.length === 0,
    'keepAttachments=false thì bản sao không có tệp', `status=${bare.status}`);

  const plain = await call('POST', `/tasks/${task._id}/duplicate`, { token: admin, body: { keepAttachments: false } });
  ok(plain.status === 201, 'Việc ở đầu bộ test vẫn nhân bản được', `status=${plain.status}`);
}

section('Dự án lưu trữ: chỉ đọc');
{
  const p = (await call('POST', '/projects', { token: admin, body: { name: `Lưu trữ ${stamp}`, startDate: iso(0), endDate: iso(10) } })).data?.project;
  const t = (await call('POST', '/tasks', { token: admin, body: { title: `Việc sẽ đóng ${stamp}`, project: p._id, estimatedHours: 2 } })).data?.task;
  const a = (await upload(admin, t._id, { name: 'bien-ban.docx', bytes: Buffer.from('docx'), type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })).data?.attachment;
  await call('PATCH', `/tasks/${t._id}/status`, { token: admin, body: { status: 'done' } });
  const archived = await call('POST', `/projects/${p._id}/archive`, { token: admin });
  ok(archived.status === 200, 'Lưu trữ dự án', `status=${archived.status} ${archived.message || ''}`);
  ok((await upload(admin, t._id)).status === 409, 'Tải lên → 409');
  ok((await call('DELETE', `/tasks/${t._id}/attachments/${a._id}`, { token: admin })).status === 409, 'Xóa → 409');
  ok((await download(admin, t._id, a._id)).status === 200, 'Vẫn tải về được');

  section('Xóa dự án (force) thì xóa cả tệp');
  await call('POST', `/projects/${p._id}/unarchive`, { token: admin });
  const before = filesOnDisk().length;
  const del = await call('DELETE', `/projects/${p._id}?force=true`, { token: admin });
  ok(del.status === 200, 'Xóa dự án kèm việc → 200', `status=${del.status} ${del.message || ''}`);
  ok(filesOnDisk().length === before - 1, 'Tệp của việc trong dự án cũng mất', `${before} → ${filesOnDisk().length}`);
}

process.exit(summary() ? 1 : 0);
