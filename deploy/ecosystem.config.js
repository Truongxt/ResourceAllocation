module.exports = {
  apps: [
    {
      name: 'rao-server',
      script: 'server.js',
      cwd: './server',
      instances: 'max', // Chạy chế độ Cluster tận dụng toàn bộ CPU core của VPS
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
