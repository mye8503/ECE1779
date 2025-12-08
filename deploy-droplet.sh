#!/bin/bash

# Stock Trading Game - DigitalOcean Droplet Setup Script
# Cost: $6/month
# Run this script on a fresh Ubuntu 24.04 droplet

set -e

echo "========================================="
echo "Stock Trading Game Deployment"
echo "========================================="
echo ""

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo "Docker already installed"
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    apt install docker-compose -y
else
    echo "Docker Compose already installed"
fi

# Install Git
echo "📚 Installing Git..."
apt install git -y

# Configure firewall
echo "🔥 Configuring firewall..."
ufw --force enable
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

# Create app directory
echo "📁 Setting up application directory..."
cd /opt

# Clone repository
echo "📥 Cloning repository..."
if [ -d "ECE1779" ]; then
    echo "Repository already exists, pulling latest changes..."
    cd ECE1779
    git pull
else
    git clone https://github.com/mye8503/ECE1779.git
    cd ECE1779
fi

# Checkout working branch
git checkout working-database

# Create .env file
echo "🔐 Creating environment file..."
cat > .env << 'EOF'
# Production Environment Variables
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
EOF

# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)

cat > .env << EOF
# Production Environment Variables
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
EOF

echo "✅ Environment file created with secure passwords"

# Build and start containers
echo "🚀 Building and starting Docker containers..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""
echo "Your application is now running!"
echo ""
echo "🌐 Access your app at: http://$(curl -s ifconfig.me)"
echo ""
echo "📝 Next steps:"
echo "1. Visit your app in a browser"
echo "2. (Optional) Set up SSL with: sudo certbot --nginx"
echo "3. (Optional) Configure a custom domain"
echo ""
echo "📊 View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "🔄 Restart: docker-compose -f docker-compose.prod.yml restart"
echo "🛑 Stop: docker-compose -f docker-compose.prod.yml down"
echo ""
echo "📁 Installation directory: /opt/ECE1779"
echo "🔐 Credentials saved in: /opt/ECE1779/.env"
echo ""
echo "========================================="
