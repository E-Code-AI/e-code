#!/bin/bash

# E-Code Platform Production Deployment Script
# This script deploys the application to production

set -e  # Exit on error

echo "🚀 E-Code Platform - Production Deployment"
echo "========================================"

# Configuration
DEPLOY_METHOD=${1:-pm2}  # pm2, docker, or manual
APP_DIR="/var/www/e-code"
BACKUP_DIR="/var/backups/e-code"

# Create deployment directory
echo "📁 Setting up deployment directory..."
sudo mkdir -p $APP_DIR
sudo mkdir -p $BACKUP_DIR

# Clone or update repository
if [ -d "$APP_DIR/.git" ]; then
    echo "📥 Updating repository..."
    cd $APP_DIR
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone https://github.com/your-org/e-code.git $APP_DIR
    cd $APP_DIR
fi

# Copy production environment file
if [ ! -f "$APP_DIR/.env.production" ]; then
    echo "❌ Error: .env.production not found!"
    echo "Please create .env.production with all required values"
    exit 1
fi

# Install dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# Build application
echo "🔨 Building application..."
npm run build

# Run database migrations
echo "🗄️  Running database migrations..."
NODE_ENV=production npm run db:push

# Deploy based on method
case $DEPLOY_METHOD in
    pm2)
        echo "🔧 Deploying with PM2..."
        
        # Check if ecosystem.config.js exists
        if [ ! -f "$APP_DIR/ecosystem.config.js" ]; then
            echo "⚠️  ecosystem.config.js not found. Creating default configuration..."
            cat > "$APP_DIR/ecosystem.config.js" <<'EOF'
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
EOF
            echo "✅ Created default ecosystem.config.js"
        else
            echo "✅ Using existing ecosystem.config.js"
        fi
        
        # Stop existing instances
        pm2 stop ecosystem.config.js || true
        
        # Start new instances
        pm2 start ecosystem.config.js --env production
        
        # Save PM2 configuration
        pm2 save
        
        # Setup startup script
        pm2 startup
        ;;
        
    docker)
        echo "🐳 Deploying with Docker..."
        
        # Stop existing containers
        docker-compose down || true
        
        # Build and start containers
        docker-compose up -d --build
        
        # Check health
        sleep 10
        docker-compose ps
        ;;
        
    manual)
        echo "🔧 Manual deployment..."
        
        # Create systemd service
        sudo tee /etc/systemd/system/e-code.service > /dev/null <<EOF
[Unit]
Description=E-Code Platform
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
        
        # Reload systemd and start service
        sudo systemctl daemon-reload
        sudo systemctl enable e-code
        sudo systemctl restart e-code
        ;;
        
    *)
        echo "❌ Invalid deployment method: $DEPLOY_METHOD"
        echo "Usage: ./deploy-production.sh [pm2|docker|manual]"
        exit 1
        ;;
esac

# Setup Nginx if not already configured
if [ ! -f "/etc/nginx/sites-enabled/e-code.conf" ]; then
    echo "⚙️  Setting up Nginx..."
    
    # Check if nginx.conf exists
    if [ ! -f "$APP_DIR/nginx.conf" ]; then
        echo "⚠️  nginx.conf not found. Creating default configuration..."
        cat > "$APP_DIR/nginx.conf" <<'EOF'
server {
    listen 80;
    server_name e-code.com www.e-code.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name e-code.com www.e-code.com;

    ssl_certificate /etc/letsencrypt/live/e-code.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/e-code.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    client_max_body_size 100M;
}
EOF
        echo "✅ Created default nginx.conf"
    else
        echo "✅ Using existing nginx.conf"
    fi
    
    sudo cp "$APP_DIR/nginx.conf" /etc/nginx/sites-available/e-code.conf
    sudo ln -sf /etc/nginx/sites-available/e-code.conf /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
fi

# Health check
echo "🏥 Checking deployment health..."
sleep 5
if curl -f https://localhost/api/monitoring/health -k > /dev/null 2>&1; then
    echo "✅ Health check passed!"
else
    echo "⚠️  Health check failed. Checking logs..."
    case $DEPLOY_METHOD in
        pm2)
            pm2 logs --lines 50
            ;;
        docker)
            docker-compose logs --tail 50
            ;;
        manual)
            sudo journalctl -u e-code -n 50
            ;;
    esac
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Application URL: https://e-code.com"
echo "🏥 Health check: https://e-code.com/api/monitoring/health"
echo ""
echo "📊 Monitoring commands:"
case $DEPLOY_METHOD in
    pm2)
        echo "  pm2 status        - Check application status"
        echo "  pm2 logs          - View application logs"
        echo "  pm2 monit         - Real-time monitoring"
        ;;
    docker)
        echo "  docker-compose ps      - Check container status"
        echo "  docker-compose logs    - View application logs"
        echo "  docker stats           - Real-time monitoring"
        ;;
    manual)
        echo "  systemctl status e-code      - Check service status"
        echo "  journalctl -u e-code -f      - View application logs"
        ;;
esac