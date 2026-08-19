const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

// Load environment variables trước khi require bất kỳ module nào đọc process.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = require('./app');
const connectDB = require('./src/config/db');
const { setIO } = require('./src/services/socket.service');
const { getJwtSecret, assertJwtConfig } = require('./src/config/jwt');
const { logMailStatus } = require('./src/services/email.service');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

setIO(io);

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, getJwtSecret());
    socket.user = { id: decoded.id };
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user?.id;
  if (userId) {
    socket.join(`user:${userId}`);
  }

  socket.on('disconnect', () => {
    // no-op
  });
});

// Connect to database and start server
const startServer = async () => {
  try {
    // Kiểm tra cấu hình trước khi kết nối DB, để lỗi thiếu JWT_SECRET lộ ra ngay
    // thay vì chờ tới request đầu tiên rồi biến thành 401 khó chẩn đoán
    assertJwtConfig();

    await connectDB();

    server.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════╗
║  🚀 RAO Server is running!                   ║
║                                               ║
║  Port:    ${PORT}                              ║
║  Mode:    ${process.env.NODE_ENV || 'development'}                     ║
║  API:     http://localhost:${PORT}/api          ║
║  Health:  http://localhost:${PORT}/api/health    ║
╚═══════════════════════════════════════════════╝
      `);
      // In ngay trạng thái email: bật hay tắt, và nếu tắt thì vì sao. Không có
      // dòng này thì "sao tôi không nhận được mail" phải đi đọc code mới biết.
      logMailStatus();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
