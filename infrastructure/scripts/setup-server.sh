#!/bin/bash
# =============================================================================
# AI Job Platform — VPS Server Setup Script
# Tested on: Ubuntu 22.04 LTS
# Run as root on a fresh Hetzner CX31 or DigitalOcean 4GB Droplet
# Usage: curl -sL <url>/setup-server.sh | bash
# =============================================================================
set -euo pipefail

APP_DIR="/opt/ai-job-platform"
DEPLOY_USER="deploy"

echo "==> [1/9] System update"
apt-get update -qq && apt-get upgrade -y -qq

echo "==> [2/9] Install dependencies"
apt-get install -y -qq \
  curl wget git ufw fail2ban \
  ca-certificates gnupg lsb-release \
  htop ncdu jq unzip

echo "==> [3/9] Install Docker"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
docker --version

echo "==> [4/9] Install Docker Compose plugin"
apt-get install -y docker-compose-plugin
docker compose version

echo "==> [5/9] Create deploy user"
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER"
  mkdir -p /home/$DEPLOY_USER/.ssh
  # Copy authorized_keys from root (CI will add its own key)
  cp /root/.ssh/authorized_keys /home/$DEPLOY_USER/.ssh/ 2>/dev/null || true
  chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
  chmod 700 /home/$DEPLOY_USER/.ssh
  chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys 2>/dev/null || true
  echo "Deploy user created: $DEPLOY_USER"
fi

echo "==> [6/9] Set up application directory"
mkdir -p "$APP_DIR"
chown $DEPLOY_USER:$DEPLOY_USER "$APP_DIR"

echo "==> [7/9] Configure firewall (UFW)"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'HTTP'
ufw allow 443/tcp  comment 'HTTPS'
ufw --force enable
ufw status verbose

echo "==> [8/9] Configure fail2ban (SSH brute-force protection)"
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port    = ssh
EOF
systemctl enable fail2ban
systemctl restart fail2ban

echo "==> [9/9] Configure swap (helps with memory pressure during builds)"
if [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Reduce swap aggressiveness
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  sysctl -p
fi

echo ""
echo "=========================================================="
echo "  Server setup complete!"
echo ""
echo "  NEXT STEPS:"
echo "  1. SSH in as $DEPLOY_USER: ssh $DEPLOY_USER@<server-ip>"
echo "  2. Clone repo:  cd $APP_DIR && git clone <repo-url> ."
echo "  3. Copy env:    cp .env.production.template .env.prod && nano .env.prod"
echo "  4. Deploy:      docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "  For GitHub Actions CI/CD, add these secrets:"
echo "  - DEPLOY_HOST: <server-ip>"
echo "  - DEPLOY_USER: $DEPLOY_USER"
echo "  - DEPLOY_SSH_KEY: <private key of deploy user>"
echo "  - REGISTRY: ghcr.io/<your-github-username>"
echo "  - REGISTRY_USERNAME: <your-github-username>"
echo "  - REGISTRY_PASSWORD: <github personal access token>"
echo "=========================================================="
