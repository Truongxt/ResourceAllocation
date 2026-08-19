const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const projectRoutes = require('./src/routes/project.routes');
const taskRoutes = require('./src/routes/task.routes');
const resourceRoutes = require('./src/routes/resource.routes');
const departmentRoutes = require('./src/routes/department.routes');
const optimizationRoutes = require('./src/routes/optimization.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const activityLogRoutes = require('./src/routes/activityLog.routes');

// Import middleware
const { errorHandler, notFound } = require('./src/middleware/error');
const { apiLimiter } = require('./src/middleware/rateLimit');
const { sanitizeRequest } = require('./src/middleware/sanitize');

const app = express();

// API thuần JSON, không phục vụ HTML, nên tắt CSP mặc định của helmet cho gọn;
// phần còn lại (nosniff, frameguard, HSTS…) giữ nguyên.
app.use(helmet({ contentSecurityPolicy: false }));

// CORS: chỉ cho origin của client. Trước đây `cors()` mở cho mọi origin.
// Cho phép request không kèm Origin (curl, health check của hạ tầng) đi qua.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin không được phép: ${origin}`));
    },
    credentials: true,
  })
);

app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Đặt ngay sau bước parse và trước mọi route: từ đây trở đi không controller nào
// còn nhìn thấy toán tử Mongo trong dữ liệu người dùng gửi lên.
app.use(sanitizeRequest);

// API Routes
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Resource Allocation Optimization API is running',
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
