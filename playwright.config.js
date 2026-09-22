/**
 * Cấu hình kiểm thử giao diện end-to-end bằng Playwright.
 *
 * Bộ này chạy trên **hệ thống thật**: server Express + MongoDB + client Vite,
 * điều khiển qua trình duyệt thật. Khác với `server/tests` (gọi thẳng REST API)
 * và `client/tests` (render component trong jsdom), ở đây mọi thứ nối với nhau
 * đúng như khi người dùng mở máy.
 *
 * Cổng và database đều riêng, khai báo ở `e2e/support/env.js`.
 *
 * `globalSetup` nạp lại dữ liệu mẫu một lần trước toàn bộ bộ test. Các bộ được
 * viết để **không phụ thuộc thứ tự**: bộ nào tạo bản ghi thì tự đặt tên riêng có
 * hậu tố ngẫu nhiên và tự dọn, nên không cần seed lại giữa các file.
 */

const { defineConfig, devices } = require('@playwright/test');
const path = require('path');
const { BASE_URL, API_URL, CLIENT_PORT, serverEnv, clientEnv } = require('./e2e/support/env');

// `E2E_CLIENT_MODE=preview` chạy bản build production thay vì dev server.
//
// Dev server tiện khi đang sửa test — không phải chờ build lại. Nhưng nó biên
// dịch module theo yêu cầu và giữ cả đồ thị module trong RAM, nên trên máy còn
// ít bộ nhớ trống, Chromium dễ bị hệ điều hành giết giữa chừng ("Target
// crashed"). Bản preview chỉ là một static server: nhẹ hơn nhiều, và đổi lại
// test đi qua đúng bundle sẽ đem đi deploy.
const PREVIEW = process.env.E2E_CLIENT_MODE === 'preview';

module.exports = defineConfig({
  testDir: path.join(__dirname, 'e2e', 'tests'),
  outputDir: path.join(__dirname, 'e2e', '.artifacts'),
  globalSetup: path.join(__dirname, 'e2e', 'support', 'global-setup.js'),

  // Giao diện gọi API thật rồi mới render; 45 giây đủ rộng cho cả lần tải chunk
  // đầu tiên của Vite (dev server biên dịch theo yêu cầu).
  timeout: 45_000,
  expect: { timeout: 10_000 },

  // Dữ liệu dùng chung một database nên chạy song song giữa các file sẽ giẫm chân
  // nhau ở các bộ có ghi. Giữ 1 worker để kết quả đọc được và lặp lại được.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // Chạy lại **một** lần khi hỏng. Không phải để giấu test chập chờn — báo cáo
  // vẫn đánh dấu "flaky" cho bài nào chỉ đạt ở lượt thứ hai — mà để một lần
  // Chromium bị hệ điều hành giết vì hết RAM không làm đỏ cả lượt chạy.
  retries: process.env.CI ? 2 : 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(__dirname, 'e2e', '.report'), open: 'never' }],
  ],

  use: {
    baseURL: BASE_URL,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // `/dev/shm` mặc định quá nhỏ trong container, và tắt hai dịch vụ nền
          // này bớt được vài trăm MB mỗi lần mở trình duyệt — đủ để không đụng
          // trần bộ nhớ trên máy đang chạy sẵn IDE và dev server.
          args: ['--disable-dev-shm-usage', '--disable-extensions', '--disable-background-networking'],
        },
      },
    },
  ],

  webServer: [
    {
      command: 'node server.js',
      cwd: path.join(__dirname, 'server'),
      env: serverEnv,
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // `--strictPort` để Vite báo lỗi thay vì lặng lẽ nhảy sang cổng khác —
      // nhảy cổng thì baseURL trỏ vào chỗ trống và lỗi hiện ra dưới dạng timeout.
      command: PREVIEW
        ? `npx vite build && npx vite preview --port ${CLIENT_PORT} --strictPort`
        : `npx vite --port ${CLIENT_PORT} --strictPort`,
      cwd: path.join(__dirname, 'client'),
      env: clientEnv,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      // Chế độ preview phải build trước khi phục vụ được request đầu tiên.
      timeout: PREVIEW ? 300_000 : 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
