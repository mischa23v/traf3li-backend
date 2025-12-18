#!/bin/bash
# ============================================
# TRAF3LI BACKEND - ORACLE CLOUD SETUP
# ============================================
# Run this on a fresh Oracle Cloud Ubuntu VM
# Usage: chmod +x scripts/setup-oracle.sh && ./scripts/setup-oracle.sh

set -e

echo "🚀 Setting up Oracle Cloud VM for Traf3li Backend..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Git
echo "📦 Installing Git..."
sudo apt install -y git

# Install Nginx (reverse proxy)
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Open firewall ports
echo "🔥 Configuring firewall..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8080 -j ACCEPT
sudo netfilter-persistent save

# Create app directory
echo "📁 Creating app directory..."
mkdir -p ~/traf3li-backend
cd ~/traf3li-backend

# Clone repository (user will need to configure git credentials)
echo "📥 Clone your repository..."
echo "Run: git clone https://github.com/mischa23v/traf3li-backend.git ."

# Create .env template
echo "📝 Creating .env template..."
cat > .env.example << 'EOF'
# Server
NODE_ENV=production
PORT=8080

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/traf3li

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret

# Redis (optional - for rate limiting)
REDIS_URL=redis://localhost:6379

# Email (Resend)
RESEND_API_KEY=your-resend-api-key

# Add other env vars as needed
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Clone your repo: git clone https://github.com/mischa23v/traf3li-backend.git ."
echo "2. Copy .env.example to .env and configure"
echo "3. Install dependencies: npm ci --production"
echo "4. Start with PM2: pm2 start src/server.js --name traf3li-backend"
echo "5. Setup PM2 startup: pm2 startup && pm2 save"
echo "6. Configure Nginx (see nginx-config.txt)"
echo ""
