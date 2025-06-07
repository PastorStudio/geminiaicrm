# Production Deployment Guide - 24/7 Autonomous Operation

## Overview
This guide helps you deploy the CRM WhatsApp AI system to production environments where it will run continuously, independent of development environments.

## Deployment Options for 24/7 Operation

### Option 1: VPS/Cloud Server (Recommended)
Deploy to a Virtual Private Server for full control and 24/7 uptime.

**Providers:**
- DigitalOcean Droplets ($5-20/month)
- AWS EC2 instances
- Google Cloud Compute Engine
- Vultr VPS
- Linode

**Setup Steps:**
```bash
# 1. Create Ubuntu 22.04 server
# 2. Install Node.js and PostgreSQL
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql postgresql-contrib

# 3. Clone your repository
git clone https://github.com/your-username/crm-whatsapp-ai-system.git
cd crm-whatsapp-ai-system

# 4. Setup backend
cd backend
npm install --production
cp .env.example .env
# Configure environment variables

# 5. Setup database
sudo -u postgres createdb crm_whatsapp_ai
npm run db:push

# 6. Install PM2 for process management
npm install -g pm2

# 7. Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 2: Replit Deployments (Always-On)
Use Replit's deployment feature for managed hosting.

**Steps:**
1. In your Replit project, click "Deploy"
2. Configure as "Autoscale Deployment"
3. Set environment variables in deployment settings
4. Deploy - your app will run 24/7 on Replit's infrastructure

### Option 3: Railway.app (Simple Deployment)
Railway offers easy deployment with PostgreSQL included.

**Steps:**
1. Connect your GitHub repository to Railway
2. Add PostgreSQL service
3. Set environment variables
4. Deploy - automatic scaling and 24/7 operation

### Option 4: Heroku (With Scheduler)
Deploy to Heroku with PostgreSQL addon.

**Steps:**
```bash
# Install Heroku CLI and deploy
heroku create your-app-name
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

## PM2 Configuration for Production

Create `ecosystem.config.js` in the backend folder:

```javascript
module.exports = {
  apps: [{
    name: 'crm-whatsapp-ai',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

## Environment Variables for Production

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/crm_whatsapp_ai

# AI Services
OPENAI_API_KEY=your_openai_key
GOOGLE_GEMINI_API_KEY=your_gemini_key

# Production Settings
NODE_ENV=production
PORT=5000

# WhatsApp Session Storage
WHATSAPP_SESSION_PATH=/opt/whatsapp-sessions
WHATSAPP_TEMP_PATH=/opt/whatsapp-temp
```

## System Service Configuration (Linux)

Create a systemd service for automatic startup:

```ini
# /etc/systemd/system/crm-whatsapp.service
[Unit]
Description=CRM WhatsApp AI System
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/crm-whatsapp-ai-system/backend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable crm-whatsapp.service
sudo systemctl start crm-whatsapp.service
```

## Database Backup Strategy

Setup automated backups:

```bash
# Create backup script
#!/bin/bash
# /opt/backup-db.sh
BACKUP_DIR="/opt/backups"
DB_NAME="crm_whatsapp_ai"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
pg_dump $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

# Add to crontab for daily backups
# 0 2 * * * /opt/backup-db.sh
```

## Monitoring and Alerts

### Health Check Endpoint
The system includes `/api/health` endpoint for monitoring.

### Setup Monitoring
```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-server-monit
```

### Alert Configuration
Set up alerts for:
- Server downtime
- High memory usage
- Database connection issues
- WhatsApp session failures

## Security Considerations

1. **Firewall Configuration:**
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 5000  # App port
sudo ufw enable
```

2. **SSL Certificate:**
```bash
# Install Let's Encrypt
sudo apt install certbot nginx
sudo certbot --nginx -d your-domain.com
```

3. **Database Security:**
- Use strong passwords
- Enable SSL connections
- Restrict access by IP

## Cost Estimates (Monthly)

- **VPS (DigitalOcean):** $5-20
- **Replit Deployments:** $7-25
- **Railway.app:** $5-20
- **Heroku:** $7-25 (with PostgreSQL)

## Maintenance Tasks

1. **Regular Updates:**
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Node.js dependencies
npm update
```

2. **Log Rotation:**
```bash
# PM2 handles log rotation automatically
pm2 flush  # Clear old logs
```

3. **Database Maintenance:**
```bash
# Vacuum PostgreSQL database
psql -d crm_whatsapp_ai -c "VACUUM ANALYZE;"
```

## Troubleshooting

**Common Issues:**
1. **Port conflicts:** Change PORT in environment variables
2. **Memory issues:** Increase server RAM or add swap
3. **Database connections:** Check PostgreSQL max_connections
4. **WhatsApp sessions:** Clear temp folder and restart

**Monitoring Commands:**
```bash
pm2 status           # Check process status
pm2 logs             # View application logs
pm2 monit            # Real-time monitoring
systemctl status crm-whatsapp  # Service status
```

With any of these deployment options, your CRM WhatsApp AI system will run continuously 24/7, independent of your development environment.