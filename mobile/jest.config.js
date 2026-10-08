/**
 * Test giao diện: dựng màn hình thật bằng jest-expo + @testing-library/react-native.
 * Các bộ `*.test.mjs` là logic thuần, chạy bằng node trần (xem script `test`), nên
 * không đưa vào đây.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup-after-env.js'],
  // Lần dựng màn đầu tiên khi cache trống mất hơn 5 giây (mặc định của jest) — đỏ oan.
  testTimeout: 20000,
};
