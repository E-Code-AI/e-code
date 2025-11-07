module.exports = {
  apps: [{
    name: 'e-code-platform',
    script: 'dist/server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/e-code/error.log',
    out_file: '/var/log/e-code/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '2G',
    node_args: '--max-old-space-size=2048'
  }]
};