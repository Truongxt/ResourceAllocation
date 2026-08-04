const dotenv = require('dotenv');
const app = require('./app');
const connectDB = require('./src/config/db');

// Load environment variables
dotenv.config({ path: '../.env' });

const PORT = process.env.PORT || 5000;

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
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
