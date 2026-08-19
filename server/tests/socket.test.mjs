// Kiểm thử Socket.IO: xác thực JWT, room theo user, và nhận notification real-time
import { io } from 'socket.io-client';
import { API, WS, call, ok, section, summary } from './helpers.mjs';

const login = async (email) => {
  const r = await call('POST', '/auth/login', { body: { email, password: 'password123' } });
  return { token: r.data.token, user: r.data.user };
};

const admin = await login('admin@rao.com');
const member = await login('nam.tran@rao.com');

section('Socket.IO realtime');

// 1. Kết nối không token phải bị từ chối
await new Promise((resolve) => {
  const s = io(WS, { transports: ['websocket'], reconnection: false });
  const t = setTimeout(() => { ok(false, 'Kết nối KHÔNG token bị từ chối', '(timeout)'); s.close(); resolve(); }, 5000);
  s.on('connect', () => { clearTimeout(t); ok(false, 'Kết nối KHÔNG token bị từ chối', '(lại kết nối được!)'); s.close(); resolve(); });
  s.on('connect_error', (e) => { clearTimeout(t); ok(e.message === 'Authentication error', 'Kết nối KHÔNG token bị từ chối', `(${e.message})`); s.close(); resolve(); });
});

// 2. Token rác phải bị từ chối
await new Promise((resolve) => {
  const s = io(WS, { transports: ['websocket'], reconnection: false, auth: { token: 'rac.rac.rac' } });
  const t = setTimeout(() => { ok(false, 'Token rác bị từ chối', '(timeout)'); s.close(); resolve(); }, 5000);
  s.on('connect', () => { clearTimeout(t); ok(false, 'Token rác bị từ chối', '(lại kết nối được!)'); s.close(); resolve(); });
  s.on('connect_error', () => { clearTimeout(t); ok(true, 'Token rác bị từ chối'); s.close(); resolve(); });
});

// 3. Token hợp lệ kết nối được + nhận notification khi được gán task
const sockMember = io(WS, { transports: ['websocket'], reconnection: false, auth: { token: member.token } });
const sockAdmin = io(WS, { transports: ['websocket'], reconnection: false, auth: { token: admin.token } });

await new Promise((resolve) => {
  let n = 0;
  const done = () => { if (++n === 2) resolve(); };
  sockMember.on('connect', () => { ok(true, 'Member kết nối bằng token hợp lệ'); done(); });
  sockAdmin.on('connect', () => { ok(true, 'Admin kết nối bằng token hợp lệ'); done(); });
  setTimeout(resolve, 6000);
});

const received = { member: [], admin: [] };
sockMember.on('notification:new', (p) => received.member.push(p));
sockAdmin.on('notification:new', (p) => received.admin.push(p));

// Admin tạo task gán cho member → member phải nhận notification, admin thì không
const proj = await fetch(`${API}/projects`, { headers: { Authorization: `Bearer ${admin.token}` } })
  .then((r) => r.json()).then((d) => d.data.projects[0]._id);

const task = await fetch(`${API}/tasks`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({ title: 'ZZ socket test', project: proj, assignee: member.user._id }),
}).then((r) => r.json());

await new Promise((r) => setTimeout(r, 2500));

ok(received.member.length === 1, 'Member nhận notification:new khi được gán task', `(${received.member.length} sự kiện)`);
ok(received.member[0]?.type === 'task_assigned', 'type = task_assigned', `(${received.member[0]?.type})`);
ok(received.member[0]?.title?.length > 0 && received.member[0]?.message?.includes('ZZ socket test'),
  'payload có title + message đúng nội dung');
ok(received.member[0]?.actor?.name, 'payload đã populate actor', `(${received.member[0]?.actor?.name})`);
ok(received.admin.length === 0, 'Admin KHÔNG nhận notification của người khác (room tách đúng)');

// Notification cũng phải được lưu vào DB
const stored = await fetch(`${API}/notifications?unread=true`, { headers: { Authorization: `Bearer ${member.token}` } })
  .then((r) => r.json());
ok(stored.data.notifications.some((n) => n.message.includes('ZZ socket test')), 'Notification được lưu vào DB');
ok(stored.unreadCount >= 1, 'unreadCount phản ánh đúng', `(${stored.unreadCount})`);

// Đánh dấu đã đọc → phải bắn sự kiện notification:read
const readEvents = [];
sockMember.on('notification:read', (p) => readEvents.push(p));
const nid = stored.data.notifications.find((n) => n.message.includes('ZZ socket test'))._id;
await fetch(`${API}/notifications/${nid}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${member.token}` } });
await new Promise((r) => setTimeout(r, 1500));
ok(readEvents.length === 1 && readEvents[0].id === nid, 'Nhận sự kiện notification:read khi đánh dấu đã đọc');

// Dọn
await fetch(`${API}/tasks/${task.data.task._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${admin.token}` } });
sockMember.close();
sockAdmin.close();

process.exit(summary() ? 1 : 0);
