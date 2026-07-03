#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# FacilityPro - Initial VPS Setup Script
# Company: SMART MAINTENANCE SERVICES SDN BHD
#
# Run this ONCE on a fresh Hostinger VPS (Ubuntu 22.04+).
#   sudo bash setup-server.sh
#
# What it does:
#   1. Updates system packages
#   2. Installs Docker & Docker Compose
#   3. Installs Nginx (reverse proxy)
#   4. Installs Certbot (Let's Encrypt SSL)
#   5. Installs common CLI tools
#   6. Configures UFW firewall
#   7. Creates the application directory structure
# =============================================================================

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Colour

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ── Constants ────────────────────────────────────────────────────────────────
APP_DIR="/opt/facilitypro"
APP_USER="${SUDO_USER:-$(whoami)}"

# ── Preflight Checks ─────────────────────────────────────────────────────────
if [[ "$(id -u)" -ne 0 ]]; then
    error "This script must be run as root (use sudo)."
    exit 1
fi

info "Starting VPS setup for FacilityPro…"
echo ""

# ── Step 1: Update System Packages ───────────────────────────────────────────
info "Updating system packages…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
success "System packages updated."

# ── Step 2: Install Docker ───────────────────────────────────────────────────
info "Installing Docker…"
if command -v docker &>/dev/null; then
    success "Docker is already installed: $(docker --version)"
else
    curl -fsSL https://get.docker.io -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh
    rm -f /tmp/get-docker.sh
    systemctl enable docker
    systemctl start docker
    success "Docker installed: $(docker --version)"
fi

# ── Step 3: Install Docker Compose Plugin ────────────────────────────────────
info "Checking Docker Compose…"
if docker compose version &>/dev/null; then
    success "Docker Compose is already installed: $(docker compose version --short)"
else
    apt-get install -y docker-compose-plugin
    success "Docker Compose installed: $(docker compose version --short)"
fi

# ── Step 4: Install Nginx ────────────────────────────────────────────────────
info "Installing Nginx…"
if command -v nginx &>/dev/null; then
    success "Nginx is already installed: $(nginx -v 2>&1)"
else
    apt-get install -y nginx
    systemctl enable nginx
    success "Nginx installed."
fi

# ── Step 5: Install Certbot ──────────────────────────────────────────────────
info "Installing Certbot (Let's Encrypt)…"
if command -v certbot &>/dev/null; then
    success "Certbot is already installed: $(certbot --version)"
else
    apt-get install -y certbot python3-certbot-nginx
    success "Certbot installed."
fi

# ── Step 6: Install Common Tools ─────────────────────────────────────────────
info "Installing common tools…"
apt-get install -y curl git vim ufw fail2ban
success "Common tools installed."

# ── Step 7: Configure UFW Firewall ──────────────────────────────────────────
info "Configuring UFW firewall…"
ufw --force reset
ufw allow OpenSSH     comment="SSH"
ufw allow 'Nginx Full' comment="HTTP & HTTPS"
ufw --force enable
success "Firewall configured. Allowed: SSH (22), HTTP (80), HTTPS (443)"
echo -e "  ${CYAN}Active rules:${NC}"
ufw status numbered

# ── Step 8: Create Application Directory Structure ───────────────────────────
info "Creating application directories at ${APP_DIR}…"
mkdir -p "${APP_DIR}"/{app,db,storage,logs,ssl}
chmod -R 755 "${APP_DIR}"
success "Directory structure created:"
echo -e "  ${CYAN}${APP_DIR}/app${NC}     → application files"
echo -e "  ${CYAN}${APP_DIR}/db${NC}      → SQLite database"
echo -e "  ${CYAN}${APP_DIR}/storage${NC}  → uploaded documents"
echo -e "  ${CYAN}${APP_DIR}/logs${NC}     → application logs"
echo -e "  ${CYAN}${APP_DIR}/ssl${NC}     → SSL certificates"

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓  VPS setup complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo ""
echo -e "  1. Copy your project to the server:"
echo -e "     ${YELLOW}scp -r ./deploy/ root@<your-vps-ip>:/opt/facilitypro/app/${NC}"
echo ""
echo -e "  2. Configure environment:"
echo -e "     ${YELLOW}cd /opt/facilitypro/app${NC}"
echo -e "     ${YELLOW}cp .env.example .env${NC}"
echo -e "     ${YELLOW}nano .env   # Update JWT_SECRET, APP_URL, etc.${NC}"
echo ""
echo -e "  3. Deploy the application:"
echo -e "     ${YELLOW}bash /opt/facilitypro/app/deploy.sh --domain your-domain.com${NC}"
echo ""
echo -e "  4. Set up SSL (after DNS points to this VPS):"
echo -e "     ${YELLOW}bash /opt/facilitypro/app/ssl-setup.sh your-domain.com${NC}"
echo ""
echo -e "  5. (Optional) Set up automated backups with cron:"
echo -e "     ${YELLOW}crontab -e${NC}"
echo -e "     ${YELLOW}# Add: 0 2 * * * /opt/facilitypro/app/backup.sh${NC}"
echo ""