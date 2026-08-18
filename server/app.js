const express = require('express');
const cors = require('cors');
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

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
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
