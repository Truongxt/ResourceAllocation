const http = require('http');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const app = require('./app');
const connectDB = require('./src/config/db');
const { setIO } = require('./src/services/socket.service');

// Load environment variables
dotenv.config({ path: '../.env' });

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

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
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
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
