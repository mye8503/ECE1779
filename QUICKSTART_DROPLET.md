# Deploy to DigitalOcean Droplet - Quick Start

**Total Cost: $6/month** 🎉

This is the simplest and cheapest way to deploy your stock trading game.

## What You'll Get

- ✅ Full application (PostgreSQL, Redis, Backend, Frontend)
- ✅ Nginx reverse proxy
- ✅ Automatic restart on crash
- ✅ Easy updates via git pull
- ✅ All for $6/month!

## Prerequisites

- DigitalOcean account
- 10 minutes of time

## Step 1: Create Droplet (2 minutes)

1. Go to https://cloud.digitalocean.com/droplets
2. Click **"Create Droplet"**
3. Choose these settings:
   - **Image**: Ubuntu 24.04 LTS
   - **Plan**: Basic
   - **CPU options**: Regular Intel
   - **Size**: $6/month (1GB RAM, 25GB SSD)
   - **Datacenter**: Choose closest to you
   - **Authentication**: 
     - **Recommended**: Add your SSH key
     - **Easy**: Use password (sent via email)
4. Click **"Create Droplet"**
5. Wait ~1 minute for it to start

## Step 2: Connect to Droplet (1 minute)

### Windows (PowerShell):
```powershell
ssh root@your_droplet_ip
```

### If using password:
- Check your email for the root password
- Paste it when prompted (right-click to paste in PowerShell)
- You'll be asked to change it on first login

## Step 3: Deploy Application (5 minutes)

Copy and paste this ONE command:

```bash
curl -sSL https://raw.githubusercontent.com/mye8503/ECE1779/working-database/deploy-droplet.sh | bash
```

**That's it!** The script will:
- Install Docker & Docker Compose
- Clone your repository
- Build all containers
- Start the application
- Configure firewall
- Generate secure passwords

## Step 4: Access Your App (1 minute)

The script will show you the URL at the end:

```
🌐 Access your app at: http://YOUR_IP_ADDRESS
```

Open that URL in your browser!

## What Just Happened?

Your droplet now has:
```
┌─────────────────────────────────┐
│     Nginx (Port 80)             │  ← You access this
├─────────────────────────────────┤
│  Frontend  │  Backend API       │
├────────────┼────────────────────┤
│  PostgreSQL    │    Redis       │
└────────────────┴────────────────┘
```

## Common Tasks

### View Logs
```bash
cd /opt/ECE1779
docker-compose -f docker-compose.prod.yml logs -f
```

### Restart Application
```bash
cd /opt/ECE1779
docker-compose -f docker-compose.prod.yml restart
```

### Update to Latest Code
```bash
cd /opt/ECE1779
git pull origin working-database
docker-compose -f docker-compose.prod.yml up -d --build
```

### Stop Application
```bash
cd /opt/ECE1779
docker-compose -f docker-compose.prod.yml down
```

### Start Application
```bash
cd /opt/ECE1779
docker-compose -f docker-compose.prod.yml up -d
```

### Check What's Running
```bash
docker ps
```

## Optional: Add SSL/HTTPS (Free!)

Install Let's Encrypt for free HTTPS:

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace yourdomain.com)
certbot --nginx -d yourdomain.com

# Auto-renewal is automatic!
```

## Optional: Custom Domain

1. **Buy a domain** (Namecheap, Google Domains, etc.)
2. **Add DNS A record**:
   - Name: `@` or `yourdomain.com`
   - Value: Your droplet IP
   - TTL: 300
3. **Wait 5-10 minutes** for DNS to propagate
4. **Add SSL** (see above)

## Troubleshooting

### Can't connect to droplet?
```bash
# Check if droplet is running in DigitalOcean console
# Verify you're using correct IP address
# Check firewall allows SSH (port 22)
```

### Application not loading?
```bash
# Check if containers are running
docker ps

# Check logs
cd /opt/ECE1779
docker-compose -f docker-compose.prod.yml logs

# Restart everything
docker-compose -f docker-compose.prod.yml restart
```

### Out of disk space?
```bash
# Clean up Docker
docker system prune -a -f

# Check disk usage
df -h
```

### Database not working?
```bash
# Restart database
docker-compose -f docker-compose.prod.yml restart db

# Check database logs
docker-compose -f docker-compose.prod.yml logs db
```

## Manual Deployment (Alternative)

If you prefer to do it step-by-step instead of using the script:

```bash
# 1. Update system
apt update && apt upgrade -y

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Install Docker Compose
apt install docker-compose -y

# 4. Install Git
apt install git -y

# 5. Configure firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# 6. Clone repository
cd /opt
git clone https://github.com/mye8503/ECE1779.git
cd ECE1779
git checkout working-database

# 7. Create .env file
cat > .env << EOF
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
EOF

# 8. Deploy
docker-compose -f docker-compose.prod.yml up -d --build
```

## Monitoring

### Check Resource Usage
```bash
# Install htop
apt install htop -y

# Run htop
htop
```

### Check Docker Stats
```bash
docker stats
```

### Check Disk Space
```bash
df -h
```

## Backup Your Database

Create a backup script:

```bash
# Create backup directory
mkdir -p /root/backups

# Create backup script
cat > /root/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec ece1779-db-1 pg_dump -U game_user stock_game > /root/backups/db_$DATE.sql
find /root/backups -name "db_*.sql" -mtime +7 -delete
EOF

# Make executable
chmod +x /root/backup.sh

# Schedule daily backups at 2 AM
crontab -e
# Add this line:
# 0 2 * * * /root/backup.sh
```

## Restore from Backup

```bash
# List backups
ls -lh /root/backups/

# Restore a backup
docker exec -i ece1779-db-1 psql -U game_user stock_game < /root/backups/db_YYYYMMDD_HHMMSS.sql
```

## Performance Tips

### For Better Performance ($12/month):
- Resize droplet to 2GB RAM
- Go to Droplet → More → Resize
- Choose $12/month plan

### For High Traffic:
- Add a $12/month load balancer
- Create multiple droplets
- Distribute traffic

## Cost Breakdown

**$6/month Droplet includes:**
- 1 vCPU
- 1GB RAM
- 25GB SSD storage
- 1TB bandwidth
- Unlimited databases (PostgreSQL, Redis)
- Unlimited apps

**Optional add-ons:**
- Automated backups: +$1.20/month (20% of droplet cost)
- Load balancer: +$12/month
- Monitoring: Free (basic), $10/month (advanced)

## When to Upgrade?

**Stay on $6 droplet if:**
- < 50 concurrent users
- < 1000 daily active users
- Learning/testing/course project

**Upgrade to $12 droplet (2GB) if:**
- 50-100 concurrent users
- 1000-5000 daily active users
- Running in production

**Migrate to App Platform if:**
- Need auto-scaling
- Want zero DevOps
- > 100 concurrent users

## Security Checklist

- ✅ Firewall enabled (only ports 22, 80, 443 open)
- ✅ Secure passwords in `.env` (auto-generated)
- ✅ SSH key authentication (recommended)
- ✅ Regular updates (`apt update && apt upgrade`)
- ✅ SSL certificate (use Certbot)
- ⚠️ Don't commit `.env` to git (already in .gitignore)

## Support

**If something breaks:**
1. Check logs: `docker-compose -f docker-compose.prod.yml logs`
2. Restart: `docker-compose -f docker-compose.prod.yml restart`
3. Check DigitalOcean status: https://status.digitalocean.com
4. Search DigitalOcean community: https://www.digitalocean.com/community

**For DigitalOcean help:**
- Community tutorials: https://www.digitalocean.com/community/tutorials
- Support tickets: Available on paid accounts

## Summary

**You did it!** 🎉

- ✅ Deployed for $6/month
- ✅ Professional setup with Docker
- ✅ Auto-restart on crash
- ✅ Easy to update
- ✅ Can scale when needed

**Your app is live at:** `http://YOUR_DROPLET_IP`

Enjoy!
