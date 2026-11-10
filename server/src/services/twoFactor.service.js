const crypto = require('crypto');
const { generateSecret, generateURI, verifySync } = require('otplib');
const qrcode = require('qrcode');

const ISSUER_NAME = 'Resource Allocation Optimization';

/**
 * Sinh secret Base32 mới và mã QR (Data URL) để người dùng quét bằng ứng dụng Authenticator.
 *
 * @param {string} userEmail
 * @returns {Promise<{ secret: string, otpauthUri: string, qrCodeDataUrl: string }>}
 */
async function generate2FASecret(userEmail) {
  const secret = generateSecret();
  const otpauthUri = generateURI({
    issuer: ISSUER_NAME,
    label: userEmail || 'user@rao.local',
    secret,
  });

  const qrCodeDataUrl = await qrcode.toDataURL(otpauthUri, {
    width: 250,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  return {
    secret,
    otpauthUri,
    qrCodeDataUrl,
  };
}

/**
 * Xác minh mã 6 chữ số TOTP từ ứng dụng.
 *
 * @param {string} token
 * @param {string} secret
 * @returns {boolean}
 */
function verifyTOTP(token, secret) {
  if (!token || !secret) return false;
  const cleanToken = String(token).replace(/[\s-]/g, '').trim();
  if (!/^\d{6}$/.test(cleanToken)) return false;

  try {
    const result = verifySync({ token: cleanToken, secret });
    return Boolean(result && result.valid);
  } catch (err) {
    return false;
  }
}

/**
 * Chuẩn hóa và băm mã dự phòng bằng SHA-256 để lưu an toàn trong cơ sở dữ liệu.
 *
 * @param {string} code
 * @returns {string}
 */
function hashBackupCode(code) {
  const normalized = String(code).replace(/[\s-]/g, '').toUpperCase().trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Sinh bộ 10 mã dự phòng (backup codes), mỗi mã 8 ký tự hex (XXXX-XXXX).
 * Trả về danh sách mã thô (plainCodes) để người dùng lưu và danh sách đã băm (storedCodes) để lưu DB.
 *
 * @param {number} count
 * @returns {{ plainCodes: string[], storedCodes: Array<{ codeHash: string, used: boolean }> }}
 */
function generateBackupCodes(count = 10) {
  const plainCodes = [];
  const storedCodes = [];

  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    const hash = hashBackupCode(formatted);

    plainCodes.push(formatted);
    storedCodes.push({
      codeHash: hash,
      used: false,
    });
  }

  return { plainCodes, storedCodes };
}

/**
 * Kiểm tra và sử dụng một mã dự phòng.
 *
 * @param {string} inputCode
 * @param {Array<{ codeHash: string, used: boolean, usedAt?: Date }>} userBackupCodes
 * @returns {{ valid: boolean, matchedIndex?: number, remainingCount?: number }}
 */
function consumeBackupCode(inputCode, userBackupCodes) {
  if (!inputCode || !Array.isArray(userBackupCodes) || userBackupCodes.length === 0) {
    return { valid: false };
  }

  const inputHash = hashBackupCode(inputCode);
  const foundIndex = userBackupCodes.findIndex(
    (item) => !item.used && item.codeHash === inputHash
  );

  if (foundIndex === -1) {
    return { valid: false };
  }

  userBackupCodes[foundIndex].used = true;
  userBackupCodes[foundIndex].usedAt = new Date();

  const remainingCount = userBackupCodes.filter((c) => !c.used).length;

  return {
    valid: true,
    matchedIndex: foundIndex,
    remainingCount,
  };
}

module.exports = {
  ISSUER_NAME,
  generate2FASecret,
  verifyTOTP,
  hashBackupCode,
  generateBackupCodes,
  consumeBackupCode,
};

