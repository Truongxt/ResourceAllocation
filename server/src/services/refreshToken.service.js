/**
 * Vòng đời refresh token: cấp, xoay vòng, thu hồi.
 *
 * Toàn bộ phần "quyết định" nằm ở `classifyToken` — hàm thuần, không đụng DB —
 * để kiểm thử được đầy đủ các nhánh, kể cả nhánh phát hiện tái sử dụng vốn rất
 * khó dựng bằng request thật.
 */

const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');
const { getRefreshTokenDays } = require('../config/jwt');

/** Sinh giá trị token: 256 bit ngẫu nhiên, dạng hex. */
function generateTokenValue() {
  return crypto.randomBytes(32).toString('hex');
}

/** Băm token trước khi lưu. Cùng lý do với mật khẩu: DB lộ thì token vẫn vô dụng. */
function hashToken(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

/**
 * Phân loại một bản ghi token khi có người trình nó ra.
 *
 * Hàm thuần: nhận bản ghi (hoặc null) và thời điểm hiện tại, trả về quyết định.
 *
 * @returns {{status: 'valid'|'unknown'|'expired'|'reused'|'revoked'}}
 */
function classifyToken(record, now = new Date()) {
  if (!record) return { status: 'unknown' };

  if (record.revokedAt) {
    // Token đã bị thay thế trong chuỗi xoay vòng mà vẫn được trình ra: chủ thật
    // đã đổi sang token mới, nên kẻ đang cầm bản cũ này là người phát lại.
    if (record.revokedReason === 'rotated') return { status: 'reused' };
    return { status: 'revoked' };
  }

  if (record.expiresAt <= now) return { status: 'expired' };

  return { status: 'valid' };
}

/** Cấp token mới cho một lần đăng nhập (mở một chuỗi mới). */
async function issueRefreshToken(userId, { userAgent, ipAddress, family } = {}) {
  const value = generateTokenValue();
  const expiresAt = new Date(Date.now() + getRefreshTokenDays() * 24 * 60 * 60 * 1000);

  const record = await RefreshToken.create({
    user: userId,
    tokenHash: hashToken(value),
    family: family || crypto.randomUUID(),
    expiresAt,
    userAgent,
    ipAddress,
  });

  // Giá trị thật chỉ trả về đúng một lần, tại đây.
  return { value, record, expiresAt };
}

/** Thu hồi toàn bộ token còn hiệu lực của một chuỗi. */
async function revokeFamily(family, reason) {
  return RefreshToken.updateMany(
    { family, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } }
  );
}

/** Thu hồi toàn bộ token còn hiệu lực của một người dùng. */
async function revokeAllForUser(userId, reason) {
  return RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } }
  );
}

/**
 * Đổi refresh token cũ lấy cặp mới.
 *
 * @returns {Promise<{ok: true, userId, value, expiresAt} | {ok: false, status: string}>}
 */
async function rotateRefreshToken(presentedValue, { userAgent, ipAddress } = {}) {
  if (!presentedValue) return { ok: false, status: 'unknown' };

  const tokenHash = hashToken(presentedValue);
  const record = await RefreshToken.findOne({ tokenHash });
  const { status } = classifyToken(record);

  if (status === 'reused') {
    // Không biết ai là chủ thật, nên đá cả hai ra và bắt đăng nhập lại.
    await revokeFamily(record.family, 'reuse_detected');
    console.warn(
      `Phát hiện tái sử dụng refresh token — đã thu hồi cả chuỗi ${record.family} của user ${record.user}`
    );
    return { ok: false, status: 'reused' };
  }

  if (status !== 'valid') return { ok: false, status };

  const next = await issueRefreshToken(record.user, {
    userAgent,
    ipAddress,
    family: record.family, // vẫn cùng một chuỗi
  });

  record.revokedAt = new Date();
  record.revokedReason = 'rotated';
  record.replacedBy = next.record.tokenHash;
  await record.save();

  return { ok: true, userId: record.user, value: next.value, expiresAt: next.expiresAt };
}

/** Thu hồi đúng token đang được trình ra (đăng xuất trên thiết bị này). */
async function revokeToken(presentedValue, reason = 'logout') {
  if (!presentedValue) return false;

  const record = await RefreshToken.findOne({ tokenHash: hashToken(presentedValue) });
  if (!record || record.revokedAt) return false;

  record.revokedAt = new Date();
  record.revokedReason = reason;
  await record.save();
  return true;
}

module.exports = {
  generateTokenValue,
  hashToken,
  classifyToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeToken,
  revokeFamily,
  revokeAllForUser,
};
