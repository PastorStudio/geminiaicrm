# Deployment Guide - CRM WhatsApp AI System

## Production Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Domain with SSL certificate
- Process manager (PM2 recommended)

### Backend Deployment

1. **Server Setup**
```bash
cd backend
npm install --production
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Configure all environment variables
```

3. **Database Setup**
```bash
npm run db:push
```

4. **Start with PM2**
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Frontend Deployment

1. **Build for Production**
```bash
cd frontend
npm install
npm run build
```

2. **Serve Static Files**
Configure your web server (Nginx/Apache) to serve the `dist` folder.

Example Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Environment Variables

**Backend (.env):**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
OPENAI_API_KEY=your_openai_key
GOOGLE_GEMINI_API_KEY=your_gemini_key
NODE_ENV=production
PORT=5000
```

### Security Considerations

1. **Database Security**
   - Use strong passwords
   - Enable SSL connections
   - Restrict database access by IP

2. **API Keys**
   - Store securely in environment variables
   - Rotate keys regularly
   - Monitor usage

3. **Server Security**
   - Keep dependencies updated
   - Use firewall rules
   - Enable SSL/TLS

### Monitoring

The system includes built-in monitoring:
- Health check endpoints
- Activity logging
- Error tracking
- Performance metrics

### Backup Strategy

1. **Database Backups**
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

2. **Session Data**
Backup WhatsApp session files regularly

### Troubleshooting

**Common Issues:**
1. WhatsApp connection drops - Check session files
2. AI responses not working - Verify API keys
3. Database connection errors - Check PostgreSQL status

**Logs Location:**
- Application logs: PM2 logs
- System logs: `/var/log/`
- WhatsApp logs: `temp/whatsapp-accounts/`