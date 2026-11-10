import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../src/config/jwt.js';
import { API, WS } from './helpers.mjs';

// Run only the pure checks with: node --test --test-name-pattern=verifyAccessToken tests/token-boundary.test.mjs
// The integration test uses the runner's live server, TEST_PORT and isolated MONGODB_URI.
test('verifyAccessToken requires a signed, typed access token', async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  const secret = randomBytes(32).toString('hex');
  process.env.JWT_SECRET = secret;
  const id = '0123456789abcdef01234567';
  const payload = { id, purpose: 'access' };
  const sign = (claims, options = {}) => jwt.sign(claims, secret, {
    algorithm: 'HS256', expiresIn: '1m', ...options,
  });

  try {
    await t.test('accepts HS256 access tokens and returns validated claims', () => {
      const decoded = verifyAccessToken(sign(payload));
      assert.equal(decoded.id, id);
      assert.equal(decoded.purpose, 'access');
      assert.ok(decoded.exp > decoded.iat);
    });

    for (const [label, claims] of [
      ['legacy token without purpose', { id }],
      ['2FA challenge', { id, purpose: '2fa_login' }],
      ['unknown purpose', { id, purpose: 'refresh' }],
      ['null purpose', { id, purpose: null }],
      ['non-string purpose', { id, purpose: ['access'] }],
      ['missing ID', { purpose: 'access' }],
      ['null ID', { ...payload, id: null }],
      ['empty ID', { ...payload, id: '' }],
      ['whitespace ID', { ...payload, id: ' ' }],
      ['malformed ObjectId', { ...payload, id: 'not-an-object-id' }],
      ['non-hex ObjectId', { ...payload, id: 'z'.repeat(24) }],
      ['numeric ID', { ...payload, id: 123 }],
      ['array ID', { ...payload, id: [id] }],
      ['object ID', { ...payload, id: { $ne: null } }],
    ]) {
      await t.test(`rejects ${label}`, () => {
        assert.throws(() => verifyAccessToken(sign(claims)), jwt.JsonWebTokenError);
      });
    }

    for (const raw of ['plain-text', 'null', '[]']) {
      await t.test(`rejects signed non-object payload ${raw}`, () => {
        const token = jwt.sign(raw, secret, { algorithm: 'HS256' });
        assert.throws(() => verifyAccessToken(token), jwt.JsonWebTokenError);
      });
    }

    await t.test('rejects expired tokens', () => {
      assert.throws(() => verifyAccessToken(sign(payload, { expiresIn: -1 })), jwt.TokenExpiredError);
    });
    await t.test('rejects bad signatures', () => {
      const token = jwt.sign(payload, randomBytes(32).toString('hex'), { algorithm: 'HS256' });
      assert.throws(() => verifyAccessToken(token), jwt.JsonWebTokenError);
    });
    for (const algorithm of ['HS384', 'HS512', 'none']) {
      await t.test(`rejects algorithm ${algorithm}`, () => {
        assert.throws(() => verifyAccessToken(sign(payload, { algorithm })), jwt.JsonWebTokenError);
      });
    }
    await t.test('rejects missing and malformed tokens', () => {
      for (const token of [undefined, null, '', 'not-a-jwt']) {
        assert.throws(() => verifyAccessToken(token), jwt.JsonWebTokenError);
      }
    });
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

const request = async (method, path, { token, cookie, body } = {}) => {
  const response = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(5000),
  });
  const json = await response.json();
  const refreshCookie = (response.headers.get('set-cookie') || '').match(/(?:^|,\s*)rao_refresh=[^;]+/)?.[0]
    .replace(/^,\s*/, '');
  return { status: response.status, json, cookie: refreshCookie };
};

const socketHandshake = async (token, useHeader = false) => {
  const { io } = await import('socket.io-client');
  const socket = io(WS, {
    autoConnect: false,
    transports: ['websocket'],
    reconnection: false,
    timeout: 5000,
    forceNew: true,
    ...(useHeader ? { extraHeaders: { Authorization: `Bearer ${token}` } } : { auth: { token } }),
  });
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket handshake timed out')), 6000);
      socket.once('connect', () => { clearTimeout(timer); resolve('connected'); });
      socket.once('connect_error', (error) => { clearTimeout(timer); resolve(error.message); });
      socket.connect();
    });
  } finally {
    socket.removeAllListeners();
    socket.close();
  }
};

test('token boundary: real 2FA challenge cannot authorize REST or Socket.IO', { timeout: 60000 }, async () => {
  const uri = process.env.MONGODB_URI;
  assert.ok(uri && new URL(uri).pathname.endsWith('_test'), 'An isolated _test database is required');
  assert.equal(process.env.NODE_ENV, 'test', 'Use the test server environment');
  assert.ok(process.env.TEST_PORT, 'TEST_PORT must point to the test server, not the development server');

  const { default: mongoose } = await import('mongoose');
  const { default: User } = await import('../src/models/User.js');
  const { default: RefreshToken } = await import('../src/models/RefreshToken.js');
  const { generateSync } = await import('otplib');
  const id = new mongoose.Types.ObjectId();
  const email = `token-boundary-${randomUUID()}@example.test`;
  const password = randomBytes(24).toString('hex');
  const newPassword = randomBytes(24).toString('hex');
  const login = () => request('POST', '/auth/login', { body: { email, password } });
  const assertAccess = (response) => {
    assert.equal(response.status, 200);
    assert.equal(response.json.success, true);
    assert.equal(typeof response.json.data?.token, 'string', 'A full login must issue an access token');
    const decoded = jwt.decode(response.json.data.token);
    assert.equal(decoded?.purpose, 'access', 'All session issuers must use typed access tokens');
    assert.equal(decoded?.id, String(id));
    return response.json.data.token;
  };

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
    await User.create({
      _id: id, name: 'Token boundary fixture', email, password,
      companyName: `Token boundary ${id}`, role: 'member', isActive: true,
    });

    const ordinary = await login();
    const ordinaryToken = assertAccess(ordinary);
    assert.ok(ordinary.cookie, 'Normal login must issue a refresh cookie');
    const me = await request('GET', '/auth/me', { token: ordinaryToken });
    assert.equal(me.status, 200);
    assert.equal(me.json.data?.user?._id, String(id), 'The server and fixture must use the same test DB');
    assert.equal(await socketHandshake(ordinaryToken), 'connected');

    const refreshed = await request('POST', '/auth/refresh', { cookie: ordinary.cookie });
    const refreshedToken = assertAccess(refreshed);
    assert.ok(refreshed.cookie && refreshed.cookie !== ordinary.cookie, 'Refresh must rotate its cookie');
    assert.equal((await request('GET', '/auth/me', { token: refreshedToken })).status, 200);
    assert.equal(await socketHandshake(refreshedToken), 'connected');

    const setup = await request('POST', '/auth/2fa/setup', { token: refreshedToken });
    assert.equal(setup.status, 200);
    const secret = setup.json.data?.secret;
    assert.equal(typeof secret, 'string', 'Setup must issue a TOTP secret');
    const enabled = await request('POST', '/auth/2fa/enable', {
      token: refreshedToken, body: { code: generateSync({ secret }) },
    });
    assert.equal(enabled.status, 200);
    assert.equal(enabled.json.data?.twoFactorEnabled, true);

    const challenge = await login();
    assert.equal(challenge.status, 200);
    assert.equal(challenge.json.requires2FA, true);
    assert.equal(typeof challenge.json.tempToken, 'string');
    assert.equal(jwt.decode(challenge.json.tempToken)?.purpose, '2fa_login');
    assert.ok(!challenge.json.data?.token, 'Password alone must not issue access');
    assert.ok(!challenge.cookie, 'Password alone must not issue a refresh session');
    const tempToken = challenge.json.tempToken;

    assert.equal((await request('GET', '/auth/me', { token: tempToken })).status, 401,
      'A challenge must not read the profile');
    assert.equal((await request('PUT', '/auth/password', {
      token: tempToken, body: { currentPassword: password, newPassword },
    })).status, 401, 'A challenge must not change the password even with the correct current password');
    assert.equal(await socketHandshake(tempToken), 'Authentication error');
    assert.equal(await socketHandshake(tempToken, true), 'Authentication error');
    const unchanged = await User.findById(id).select('+password');
    assert.equal(await unchanged.comparePassword(password), true, 'Rejected password change must not mutate credentials');

    const wrongPurpose = await request('POST', '/auth/2fa/verify', {
      body: { tempToken: refreshedToken, code: generateSync({ secret }) },
    });
    assert.equal(wrongPurpose.status, 401, 'Ordinary access cannot act as a 2FA challenge, even with valid TOTP');
    assert.ok(!wrongPurpose.json.data?.token);
    assert.ok(!wrongPurpose.cookie);

    const verified = await request('POST', '/auth/2fa/verify', {
      body: { tempToken, code: generateSync({ secret }) },
    });
    const accessToken = assertAccess(verified);
    assert.ok(verified.cookie, 'Valid TOTP must issue a refresh session');
    assert.equal((await request('GET', '/auth/me', { token: accessToken })).status, 200);
    assert.equal(await socketHandshake(accessToken), 'connected');
    assert.equal(await socketHandshake(accessToken, true), 'connected');

    const post2FARefresh = await request('POST', '/auth/refresh', { cookie: verified.cookie });
    const post2FAToken = assertAccess(post2FARefresh);
    assert.equal((await request('GET', '/auth/me', { token: post2FAToken })).status, 200);
    assert.equal(await socketHandshake(post2FAToken), 'connected');
  } finally {
    try {
      if (mongoose.connection.readyState === 1) {
        await RefreshToken.deleteMany({ user: id });
        await User.deleteOne({ _id: id });
      }
    } finally {
      await mongoose.disconnect();
    }
  }
});
