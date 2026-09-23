/**
 * Refresh token: xoay vòng, thu hồi, và phát hiện tái sử dụng.
 *
 * Chia hai phần:
 *   - Đơn vị: `classifyToken` — chỗ chứa toàn bộ quyết định, kiểm được mọi nhánh
 *     kể cả nhánh "token đã thu hồi bị trình lại" vốn khó dựng bằng request thật.
 *   - End-to-end: gọi API thật và tự giữ cookie, vì cả tính năng này sống hay chết
 *     là ở chỗ cookie có đi đúng đường không.
 */

import { createRequire } from 'module';
import { API, ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { classifyToken, hashToken, generateTokenValue } = require('../src/services/refreshToken.service');

// ══════════════════════════════════════════════
S('Băm và sinh token');
{
  const a = generateTokenValue();
  const b = generateTokenValue();
  ok(a.length === 64, 'Token dài 64 ký tự hex — 256 bit ngẫu nhiên', `(${a.length})`);
  ok(a !== b, 'Hai lần sinh cho hai giá trị khác nhau');
  ok(hashToken(a) === hashToken(a), 'Băm ổn định');
  ok(hashToken(a) !== a, 'Bản băm khác giá trị gốc — DB không giữ token dùng được');
}

// ══════════════════════════════════════════════
S('Phân loại token khi có người trình ra');
{
  const future = new Date(Date.now() + 60_000);
  const past = new Date(Date.now() - 60_000);

  ok(classifyToken(null).status === 'unknown', 'Không có bản ghi → unknown');

  ok(classifyToken({ expiresAt: future, revokedAt: null }).status === 'valid',
    'Còn hạn, chưa thu hồi → valid');

  ok(classifyToken({ expiresAt: past, revokedAt: null }).status === 'expired',
    'Quá hạn → expired');

  // Đây là ca quan trọng nhất của cả tính năng: token đã bị thay thế trong chuỗi
  // xoay vòng mà vẫn được trình ra, nghĩa là có người đang phát lại bản cũ.
  const longAgo = new Date(Date.now() - 60_000);
  ok(classifyToken({ expiresAt: future, revokedAt: longAgo, revokedReason: 'rotated' }, new Date(), 10_000).status === 'reused',
    'Token đã xoay vòng từ lâu mà trình lại → reused (dấu hiệu bị đánh cắp)');

  // Nhưng ngay sau khi xoay vòng thì đó nhiều khả năng là hai tab của cùng một
  // người cùng làm mới, không phải tấn công. Xử như tấn công là đá người dùng ra oan.
  ok(classifyToken({ expiresAt: future, revokedAt: new Date(), revokedReason: 'rotated' }, new Date(), 10_000).status === 'grace',
    'Trình lại ngay sau khi xoay vòng → grace, coi là đua giữa các tab');

  ok(classifyToken({ expiresAt: future, revokedAt: new Date(), revokedReason: 'rotated' }, new Date(), 0).status === 'reused',
    'Đặt ân hạn về 0 thì mọi lần phát lại đều là reused');

  ok(classifyToken({ expiresAt: future, revokedAt: new Date(), revokedReason: 'logout' }).status === 'revoked',
    'Token đã đăng xuất → revoked, KHÔNG phải reused — người dùng tự bấm thì không có gì đáng ngờ');

  ok(classifyToken({ expiresAt: future, revokedAt: new Date(), revokedReason: 'password_changed' }).status === 'revoked',
    'Thu hồi do đổi mật khẩu → revoked');
}

// ══════════════════════════════════════════════
// Phần end-to-end: tự giữ cookie giữa các lời gọi.
// ══════════════════════════════════════════════

/** Trích giá trị cookie refresh từ header Set-Cookie. */
const readRefreshCookie = (res) => {
  const raw = res.headers.get('set-cookie') || '';
  const match = raw.match(/rao_refresh=([^;]*)/);
  return match ? match[1] : null;
};

const callWithCookie = async (method, path, { body, cookie, token } = {}) => {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: `rao_refresh=${cookie}` } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, cookie: readRefreshCookie(res), ...json };
};

const login = () =>
  callWithCookie('POST', '/auth/login', {
    body: { email: 'admin@rao.com', password: 'password123' },
  });

// ══════════════════════════════════════════════
S('Đăng nhập cấp cặp token');
{
  const res = await login();
  ok(res.status === 200, 'Đăng nhập → 200');
  ok(!!res.data?.token, 'Trả access token trong body');
  ok(!!res.cookie, 'Đặt cookie rao_refresh');
  ok(!JSON.stringify(res.data).includes(res.cookie), 'Refresh token KHÔNG nằm trong body');
}

// ══════════════════════════════════════════════
S('Cookie refresh phải httpOnly');
{
  const res = await fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@rao.com', password: 'password123' }),
  });
  const setCookie = res.headers.get('set-cookie') || '';
  ok(/httponly/i.test(setCookie),
    'Có cờ HttpOnly — JavaScript không đọc được, nên XSS không lấy được refresh token');
  ok(/path=\/api\/auth/i.test(setCookie),
    'Giới hạn Path=/api/auth — không gửi kèm mọi request khác',
    setCookie.match(/Path=[^;]*/i)?.[0]);
}

// ══════════════════════════════════════════════
S('Xoay vòng');
{
  const session = await login();

  const first = await callWithCookie('POST', '/auth/refresh', { cookie: session.cookie });
  ok(first.status === 200, 'Làm mới bằng cookie hợp lệ → 200');
  ok(!!first.data?.token, 'Trả access token mới');
  ok(!!first.cookie && first.cookie !== session.cookie,
    'Cookie refresh ĐỔI sau mỗi lần làm mới — đó là xoay vòng');

  const second = await callWithCookie('POST', '/auth/refresh', { cookie: first.cookie });
  ok(second.status === 200, 'Làm mới tiếp bằng token mới → 200');

  const noCookie = await callWithCookie('POST', '/auth/refresh');
  ok(noCookie.status === 401, 'Không có cookie → 401');

  const garbage = await callWithCookie('POST', '/auth/refresh', { cookie: 'khong-phai-token' });
  ok(garbage.status === 401, 'Cookie rác → 401');
}

// ══════════════════════════════════════════════
S('Đua giữa nhiều tab được tha (trong ân hạn)');
{
  // Cookie dùng chung cho mọi tab. Hai tab cùng hết hạn access token sẽ cùng gửi
  // đúng một cookie đi làm mới. Xử cái thứ hai như tấn công là đá người dùng ra oan.
  const session = await login();

  const [first, second] = await Promise.all([
    callWithCookie('POST', '/auth/refresh', { cookie: session.cookie }),
    callWithCookie('POST', '/auth/refresh', { cookie: session.cookie }),
  ]);

  ok(first.status === 200 && second.status === 200,
    'Hai tab cùng làm mới bằng một cookie → cả hai đều qua',
    `(${first.status}, ${second.status})`);
  ok(first.cookie !== second.cookie, 'Mỗi tab nhận một token riêng');

  const stillAlive = await callWithCookie('POST', '/auth/refresh', { cookie: second.cookie });
  ok(stillAlive.status === 200, 'Phiên không bị thu hồi vì cú đua đó');
}

// ══════════════════════════════════════════════
S('Phát hiện tái sử dụng — cả chuỗi bị thu hồi');
{
  const session = await login();
  const rotated = await callWithCookie('POST', '/auth/refresh', { cookie: session.cookie });
  ok(rotated.status === 200, 'Lần làm mới đầu thành công');

  // Chờ hết ân hạn (bộ chạy đặt REFRESH_GRACE_SECONDS=1) rồi mới phát lại —
  // lúc này không còn giải thích được bằng cú đua giữa các tab nữa.
  await new Promise((resolve) => setTimeout(resolve, 1300));

  const replay = await callWithCookie('POST', '/auth/refresh', { cookie: session.cookie });
  ok(replay.status === 401, 'Trình lại token đã xoay vòng, sau ân hạn → 401');
  ok(replay.reason === 'reused', 'Server nhận diện đúng là tái sử dụng', `(${replay.reason})`);

  // Và đây mới là điểm mấu chốt: token *mới* — đang nằm trong tay chủ thật —
  // cũng phải chết theo, vì lúc này không phân biệt được ai là chủ.
  const victim = await callWithCookie('POST', '/auth/refresh', { cookie: rotated.cookie });
  ok(victim.status === 401,
    'Token hợp lệ của cùng chuỗi cũng bị thu hồi — cả hai bên phải đăng nhập lại');
}

// ══════════════════════════════════════════════
S('Đăng xuất');
{
  const session = await login();
  const out = await callWithCookie('POST', '/auth/logout', { cookie: session.cookie });
  ok(out.status === 200, 'Đăng xuất → 200');

  const after = await callWithCookie('POST', '/auth/refresh', { cookie: session.cookie });
  ok(after.status === 401, 'Cookie sau khi đăng xuất không làm mới được nữa');
  ok(after.reason === 'revoked',
    'Phân loại là revoked chứ không phải reused — người dùng tự bấm, không phải bị tấn công',
    `(${after.reason})`);

  // Đăng xuất mọi thiết bị: dựng hai phiên rồi thu hồi cả hai.
  const a = await login();
  const b = await login();
  const all = await callWithCookie('POST', '/auth/logout-all', {
    cookie: b.cookie,
    token: b.data.token,
  });
  ok(all.status === 200, 'Đăng xuất mọi thiết bị → 200');

  const deadA = await callWithCookie('POST', '/auth/refresh', { cookie: a.cookie });
  const deadB = await callWithCookie('POST', '/auth/refresh', { cookie: b.cookie });
  ok(deadA.status === 401 && deadB.status === 401,
    'Cả phiên khác lẫn phiên hiện tại đều bị thu hồi', `(${deadA.status}, ${deadB.status})`);
}

// ══════════════════════════════════════════════
// Client di động: refresh token đi trong body thay vì cookie.
//
// Phần quan trọng nhất của nhóm test này không phải "mobile chạy được" mà là
// "web không bị kéo theo": đường body chỉ mở cho ai tự khai báo header.
// ══════════════════════════════════════════════

const callMobile = async (method, path, { body, token } = {}) => {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Type': 'mobile',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
};

const loginMobile = () =>
  callMobile('POST', '/auth/login', {
    body: { email: 'admin@rao.com', password: 'password123' },
  });

S('Client di động nhận refresh token trong body');
{
  const res = await loginMobile();
  ok(res.status === 200, 'Đăng nhập → 200');
  ok(!!res.data?.token, 'Có access token');
  ok(!!res.data?.refreshToken, 'Có refresh token trong body — vì đã khai báo X-Client-Type');

  // Đây là ca giữ cho bản vá không lan sang web.
  const web = await login();
  ok(!web.data?.refreshToken,
    'Cùng endpoint, không khai báo header → KHÔNG có refresh token trong body');
}

// ══════════════════════════════════════════════
S('Xoay vòng qua body');
{
  const session = await loginMobile();

  const first = await callMobile('POST', '/auth/refresh', {
    body: { refreshToken: session.data.refreshToken },
  });
  ok(first.status === 200, 'Làm mới bằng token trong body → 200');
  ok(!!first.data?.token, 'Trả access token mới');
  ok(
    !!first.data?.refreshToken && first.data.refreshToken !== session.data.refreshToken,
    'Refresh token ĐỔI — client phải lưu giá trị mới, không thì lần sau tự đá mình ra'
  );

  const second = await callMobile('POST', '/auth/refresh', {
    body: { refreshToken: first.data.refreshToken },
  });
  ok(second.status === 200, 'Dùng tiếp token mới → 200');

  // Không khai báo header thì body bị bỏ qua hoàn toàn: đường này là opt-in,
  // không phải "cứ gửi body là được".
  const notOptedIn = await fetch(API + '/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: second.data.refreshToken }),
  });
  ok(notOptedIn.status === 401,
    'Gửi refresh token trong body mà không khai báo header → 401');
}

// ══════════════════════════════════════════════
S('Đăng xuất và phát hiện tái sử dụng vẫn đúng trên đường body');
{
  const session = await loginMobile();
  const out = await callMobile('POST', '/auth/logout', {
    body: { refreshToken: session.data.refreshToken },
  });
  ok(out.status === 200, 'Đăng xuất → 200');

  // Trước bản vá, mobile gọi logout mà server không nhận được token nào nên
  // không thu hồi gì — phiên sống tiếp 7 ngày dù người dùng đã bấm đăng xuất.
  const after = await callMobile('POST', '/auth/refresh', {
    body: { refreshToken: session.data.refreshToken },
  });
  ok(after.status === 401, 'Token sau khi đăng xuất không làm mới được nữa');
  ok(after.reason === 'revoked', 'Phân loại là revoked', `(${after.reason})`);

  const live = await loginMobile();
  const rotated = await callMobile('POST', '/auth/refresh', {
    body: { refreshToken: live.data.refreshToken },
  });
  ok(rotated.status === 200, 'Xoay vòng một lần');

  await new Promise((resolve) => setTimeout(resolve, 1300));

  const replay = await callMobile('POST', '/auth/refresh', {
    body: { refreshToken: live.data.refreshToken },
  });
  ok(replay.status === 401 && replay.reason === 'reused',
    'Phát lại token cũ sau ân hạn → reused, y như đường cookie', `(${replay.reason})`);
}

// ══════════════════════════════════════════════
S('Đổi mật khẩu đuổi mọi phiên cũ');
{
  // Đây là lỗ thật trước khi có refresh token: đổi mật khẩu vì nghi bị lộ tài khoản,
  // nhưng token kẻ tấn công đang giữ vẫn sống tới 7 ngày.
  const old = await login();
  const current = await login();

  const changed = await callWithCookie('PUT', '/auth/password', {
    token: current.data.token,
    cookie: current.cookie,
    body: { currentPassword: 'password123', newPassword: 'password123' },
  });
  ok(changed.status === 200, 'Đổi mật khẩu → 200');

  const oldDead = await callWithCookie('POST', '/auth/refresh', { cookie: old.cookie });
  ok(oldDead.status === 401, 'Phiên cũ bị đuổi sau khi đổi mật khẩu');

  ok(!!changed.cookie && changed.cookie !== current.cookie,
    'Thiết bị vừa đổi mật khẩu được cấp phiên mới, không bị đá ra cùng');

  // Client di động cũng phải nhận được phiên mới, nếu không thì đổi mật khẩu
  // xong là tự đăng xuất chính mình sau 15 phút.
  const mobile = await loginMobile();
  const mobileChanged = await callMobile('PUT', '/auth/password', {
    token: mobile.data.token,
    body: { currentPassword: 'password123', newPassword: 'password123' },
  });
  ok(mobileChanged.status === 200, 'Mobile đổi mật khẩu → 200 (route là /auth/password)');
  ok(!!mobileChanged.data?.refreshToken,
    'Trả refresh token mới trong body để app lưu lại');
  ok(mobileChanged.data.refreshToken !== mobile.data.refreshToken,
    'Và đó là giá trị khác token cũ vừa bị thu hồi');
}

process.exit(summary() === 0 ? 0 : 1);
