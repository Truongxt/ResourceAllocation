import assert from 'node:assert/strict';
import test from 'node:test';
import { generateSync } from 'otplib';
import {
  generate2FASecret,
  verifyTOTP,
  hashBackupCode,
  generateBackupCodes,
  consumeBackupCode,
} from '../src/services/twoFactor.service.js';

test('twoFactor.service — Sinh secret và mã QR', async () => {
  const result = await generate2FASecret('user@example.com');
  assert.ok(result.secret, 'Phải có secret Base32');
  assert.strictEqual(result.secret.length, 32, 'Secret Base32 dài 32 ký tự');
  assert.ok(result.otpauthUri.startsWith('otpauth://totp/'), 'Phải tạo URI otpauth');
  assert.ok(result.qrCodeDataUrl.startsWith('data:image/png;base64,'), 'Phải tạo QR data URL PNG');
});

test('twoFactor.service — Xác minh TOTP hợp lệ và không hợp lệ', async () => {
  const { secret } = await generate2FASecret('user@example.com');
  const validToken = generateSync({ secret });

  assert.strictEqual(verifyTOTP(validToken, secret), true, 'Token hợp lệ phải pass');
  assert.strictEqual(verifyTOTP('123456', secret), false, 'Token ngẫu nhiên phải fail');
  assert.strictEqual(verifyTOTP('', secret), false, 'Token rỗng phải fail');
  assert.strictEqual(verifyTOTP('abc', secret), false, 'Token không phải 6 số phải fail');
});

test('twoFactor.service — Sinh và sử dụng mã dự phòng (backup codes)', () => {
  const { plainCodes, storedCodes } = generateBackupCodes(10);
  assert.strictEqual(plainCodes.length, 10, 'Phải sinh đúng 10 mã dự phòng');
  assert.strictEqual(storedCodes.length, 10, 'Phải có 10 bản ghi đã băm');

  // Kiểm tra định dạng XXXX-XXXX
  for (const code of plainCodes) {
    assert.match(code, /^[A-F0-9]{4}-[A-F0-9]{4}$/, 'Định dạng mã dự phòng phải là 4 hex - 4 hex');
  }

  // Dùng mã đầu tiên
  const firstCode = plainCodes[0];
  const useResult = consumeBackupCode(firstCode, storedCodes);
  assert.strictEqual(useResult.valid, true, 'Mã đầu tiên phải dùng được');
  assert.strictEqual(useResult.remainingCount, 9, 'Còn lại 9 mã');
  assert.strictEqual(storedCodes[0].used, true, 'Bản ghi đầu tiên phải đánh dấu used');

  // Thử dùng lại mã đầu tiên (không được phép dùng 2 lần)
  const reuseResult = consumeBackupCode(firstCode, storedCodes);
  assert.strictEqual(reuseResult.valid, false, 'Không được dùng lại mã đã sử dụng');

  // Thử mã sai
  const invalidResult = consumeBackupCode('0000-0000', storedCodes);
  assert.strictEqual(invalidResult.valid, false, 'Mã không tồn tại phải fail');
});

