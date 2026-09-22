/**
 * Nạp lại dữ liệu mẫu vào database e2e trước khi chạy bộ test.
 *
 * Chạy **một lần** cho cả bộ chứ không phải trước từng file. Playwright khởi
 * động `webServer` trước `globalSetup`, nên lúc này server đã lên và đang giữ
 * kết nối tới database — nhưng chưa có bài test nào mở trình duyệt, nên xóa sạch
 * rồi nạp lại ở đây là an toàn. Seed giữa chừng thì không: nó sẽ kéo cái nền dữ
 * liệu ra khỏi chân các bài đang chạy.
 *
 * Đổi lại, mỗi bộ test phải tự lo phần dữ liệu nó tạo ra: đặt tên có hậu tố ngẫu
 * nhiên (`uniqueName()`) và xóa sau khi dùng.
 */

const { spawn } = require('child_process');
const path = require('path');
const { MONGODB_URI, serverEnv } = require('./env');

const SERVER_DIR = path.join(__dirname, '..', '..', 'server');

module.exports = async function globalSetup() {
  await new Promise((resolve, reject) => {
    // Không dùng shell: trên Windows shell tạo tiến trình bọc ngoài và mã thoát
    // của seeder không dội ngược lại được.
    const child = spawn('node', ['src/utils/seeder.js'], {
      cwd: SERVER_DIR,
      env: serverEnv,
    });

    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(
        `Không seed được database e2e (${MONGODB_URI}). MongoDB đã chạy chưa?\n` +
        out.trim().split('\n').slice(-5).join('\n')
      ));
    });
  });
};
