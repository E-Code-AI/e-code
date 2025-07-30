module.exports = {
  apps: [{
    name: 'e-code-platform',
    script: './dist/server/index.js',
    instances: process.env.PM2_INSTANCES || 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    
    // Advanced PM2 features
    min_uptime: '10s',
    listen_timeout: 3000,
    kill_timeout: 5000,
    
    // Auto-restart configuration
    autorestart: true,
    max_restarts: 10,
    restart_delay: 4000,
    
    // Resource monitoring
    monitoring: true,
    
    // Graceful shutdown
    wait_ready: true,
    shutdown_with_message: true,
    
    // Environment specific
    instance_var: 'INSTANCE_ID',
    
    // Error handling
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    
    // Node.js flags
    node_args: '--max-old-space-size=2048'
  }]
};