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
 * Khoảng ân hạn sau khi một token bị xoay vòng.
 *
 * Cookie dùng chung cho mọi tab của trình duyệt. Hai tab cùng hết hạn access token
 * sẽ cùng gọi làm mới với **cùng một cookie cũ** — cái tới sau trình ra token vừa
 * bị xoay vòng, và nếu xử theo đúng luật thì đó là "tái sử dụng", thu hồi cả chuỗi,
 * người dùng bị đá ra dù không ai tấn công gì.
 *
 * Trong vài giây đầu, coi đó là đua chứ không phải tấn công.
 *
 * Đánh đổi: kẻ tấn công phát lại token trong đúng cửa sổ này cũng lọt. Đổi lại,
 * người dùng bình thường mở nhiều tab không bị đăng xuất oan. Cửa sổ càng hẹp
 * càng an toàn nhưng càng dễ bắt oan; 10 giây là chỗ dung hòa, chỉnh được bằng
 * REFRESH_GRACE_SECONDS.
 */
const getGraceMs = () => {
  const seconds = Number(process.env.REFRESH_GRACE_SECONDS ?? 10);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : 10_000;
};

/**
 * Phân loại một bản ghi token khi có người trình nó ra.
 *
 * Hàm thuần: nhận bản ghi (hoặc null), thời điểm hiện tại và khoảng ân hạn,
 * trả về quyết định.
 *
 * @returns {{status: 'valid'|'unknown'|'expired'|'reused'|'revoked'|'grace'}}
 */
function classifyToken(record, now = new Date(), graceMs = getGraceMs()) {
  if (!record) return { status: 'unknown' };

  if (record.revokedAt) {
    // Token đã bị thay thế trong chuỗi xoay vòng mà vẫn được trình ra: chủ thật
    // đã đổi sang token mới, nên kẻ đang cầm bản cũ này là người phát lại.
    if (record.revokedReason === 'rotated') {
      const since = now - new Date(record.revokedAt);
      // So sánh `<` chứ không phải `<=`: đặt ân hạn về 0 phải nghĩa là KHÔNG tha
      // lần nào. Với `<=` thì hai mốc thời gian trùng nhau vẫn lọt, và cấu hình
      // "tắt ân hạn" không tắt được gì.
      if (since < graceMs) return { status: 'grace' };
      return { status: 'reused' };
    }
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

  if (status !== 'valid' && status !== 'grace') return { ok: false, status };

  const next = await issueRefreshToken(record.user, {
    userAgent,
    ipAddress,
    family: record.family, // vẫn cùng một chuỗi
  });

  // Trong khoảng ân hạn thì bản ghi cũ đã bị đánh dấu rồi; đánh dấu lại sẽ đẩy
  // `revokedAt` về hiện tại và làm cửa sổ ân hạn trượt đi mãi, khiến một token
  // cũ sống vô hạn miễn là cứ 10 giây lại dùng một lần.
  if (status === 'valid') {
    record.revokedAt = new Date();
    record.revokedReason = 'rotated';
    record.replacedBy = next.record.tokenHash;
    await record.save();
  }

  return {
    ok: true,
    status,
    userId: record.user,
    value: next.value,
    expiresAt: next.expiresAt,
  };
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
