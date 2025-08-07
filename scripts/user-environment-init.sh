#!/bin/bash

# User Environment Initialization Script
# This script initializes the isolated user environment

echo "Starting E-Code User Environment..."

# Set up environment variables
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}
export IDE_PORT=${IDE_PORT:-8080}
export USER_ID=${USER_ID}
export USERNAME=${USERNAME}

# Create necessary directories
mkdir -p /home/user/projects
mkdir -p /home/user/.npm
mkdir -p /home/user/.cache
mkdir -p /home/user/logs

# Start health check endpoint
node -e "
const http = require('http');
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', userId: process.env.USER_ID }));
  } else if (req.url === '/ready') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ready: true }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});
server.listen(${PORT}, '0.0.0.0', () => {
  console.log('Health check server running on port ${PORT}');
});
" &

# Start IDE server (placeholder for now)
echo "IDE server would start on port ${IDE_PORT}"

# Keep the container running
tail -f /dev/null