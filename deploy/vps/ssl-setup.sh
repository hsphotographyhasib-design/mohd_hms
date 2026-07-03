#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# FacilityPro - SSL Certificate Setup (Let's Encrypt / Certbot)
# Company: SMART MAINTENANCE SERVICES SDN BHD
#
# Usage:
#   sudo bash ssl-setup.sh <domain>
#
# Example:
#   sudo bash ssl-setup.sh facility.example.com
#
# Prerequisites:
#   - DNS A record pointing domain to this VPS
#   - Nginx installed (setup-server.sh)
#   - Certbot installed (setup-server.sh)
# =============================================================================

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
fatal()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Step 1: Check Domain Argument ────────────────────────────────────────────
if [[ $# -lt 1 ]]; then
    error "Usage: sudo bash ssl-setup.sh <domain>"
    echo ""
    echo -e "  Example: ${YELLOW}sudo bash ssl-setup.sh facility.example.com${NC}"
    exit 1
fi

DOMAIN="$1"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"
APP_DIR="/opt/facilitypro"

# ── Preflight Checks ─────────────────────────────────────────────────────────
if [[ "$(id -u)" -ne 0 ]]; then
    fatal "This script must be run as root (use sudo)."
fi

command -v nginx &>/dev/null  || fatal "Nginx is not installed. Run setup-server.sh first."
command -v certbot &>/dev/null || fatal "Certbot is not installed. Run setup-server.sh first."

info "Setting up SSL for: ${CYAN}${DOMAIN}${NC}"
echo ""

# Verify DNS resolves to this server
PUBLIC_IP=$(curl -sf ifconfig.me 2>/dev/null || curl -sf icanhazip.com 2>/dev/null || echo "unknown")
DNS_IP=$(dig +short "${DOMAIN}" A 2>/dev/null | tail -1 || echo "unknown")

if [[ "${DNS_IP}" == "unknown" ]]; then
    warn "Could not verify DNS. Make sure ${DOMAIN} points to this server (${PUBLIC_IP})."
elif [[ "${DNS_IP}" != "${PUBLIC_IP}" ]]; then
    error "DNS mismatch! ${DOMAIN} resolves to ${DNS_IP}, but this server is ${PUBLIC_IP}."
    fatal "Update your DNS A record before requesting a certificate."
else
    success "DNS verified: ${DOMAIN} → ${PUBLIC_IP}"
fi

# ── Step 2: Create Nginx Config for ACME Challenge ──────────────────────────
info "Creating temporary Nginx config for certificate validation…"

# Stop nginx temporarily if it's running to avoid port conflicts
if systemctl is-active --quiet nginx; then
    info "Stopping Nginx temporarily…"
    systemctl stop nginx
fi

# Create a minimal server block for certbot validation
cat > "${NGINX_CONF}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all HTTP to HTTPS (will be effective after cert is obtained)
    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF

ln -sf "${NGINX_CONF}" "${NGINX_ENABLED}"
nginx -t 2>/dev/null || warn "Nginx config test skipped."
systemctl start nginx
success "Temporary Nginx config created."

# ── Step 3: Obtain SSL Certificate ──────────────────────────────────────────
info "Requesting SSL certificate from Let's Encrypt…"
mkdir -p /var/www/html

certbot certonly \
    --webroot \
    --webroot-path=/var/www/html \
    --domain "${DOMAIN}" \
    --email "admin@${DOMAIN}" \
    --agree-tos \
    --non-interactive \
    --redirect

if [[ $? -ne 0 ]]; then
    error "Certbot failed to obtain a certificate."
    warn "Common causes:"
    warn "  - DNS not yet propagated (wait a few minutes and retry)"
    warn "  - Port 80 is blocked by firewall"
    warn "  - Domain is not correctly pointing to this server"
    exit 1
fi
success "SSL certificate obtained for ${DOMAIN}!"

# ── Step 4: Create Full Nginx Config with SSL ───────────────────────────────
info "Writing production Nginx configuration…"

cat > "${NGINX_CONF}" <<EOF
# FacilityPro - Nginx Configuration for ${DOMAIN}
# Company: SMART MAINTENANCE SERVICES SDN BHD

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    # SSL certificates
    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    # SSL hardening
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # Security headers
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    # File upload size limit (matches MAX_FILE_SIZE)
    client_max_body_size 50M;

    # Proxy to Next.js app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://127.0.0.1:3000;
        access_log off;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

nginx -t
if [[ $? -ne 0 ]]; then
    error "Nginx configuration test failed!"
    exit 1
fi
success "Nginx configuration written and validated."

# ── Step 5: Set Up Automatic Certificate Renewal ───────────────────────────
info "Setting up automatic certificate renewal…"

# Certbot ships with a systemd timer — make sure it's enabled
systemctl enable certbot.timer
systemctl start certbot.timer

# Also add a cron job as a belt-and-suspenders approach
CRON_JOB="0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'"
if ! crontab -l 2>/dev/null | grep -qF "certbot renew"; then
    (crontab -l 2>/dev/null; echo "${CRON_JOB}") | crontab -
    success "Certbot renewal cron added (runs daily at 3 AM)."
else
    success "Certbot renewal cron already exists."
fi

# Test the renewal process (dry run)
info "Testing certificate renewal (dry run)…"
certbot renew --dry-run 2>&1 | tail -3
success "Renewal test passed."

# ── Step 6: Restart Nginx ──────────────────────────────────────────────────
info "Restarting Nginx…"
systemctl reload nginx
success "Nginx reloaded with SSL configuration."

# ── Step 7: Verify SSL ─────────────────────────────────────────────────────
info "Verifying SSL certificate…"
echo ""
if command -v openssl &>/dev/null; then
    echo -e "  ${CYAN}Certificate details:${NC}"
    echo | openssl s_client -servername "${DOMAIN}" -connect "${DOMAIN}:443" 2>/dev/null \
        | openssl x509 -noout -subject -issuer -dates 2>/dev/null \
        | while read -r line; do
            echo -e "    ${line}"
          done
    echo ""
fi

# ── Done ─────────────────────────────────────────────────────────────────────
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓  SSL setup complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Your application is now available at:${NC}"
echo -e "    ${GREEN}https://${DOMAIN}${NC}"
echo ""
echo -e "${CYAN}Certificate files:${NC}"
echo -e "  Certificate: ${YELLOW}/etc/letsencrypt/live/${DOMAIN}/fullchain.pem${NC}"
echo -e "  Private key: ${YELLOW}/etc/letsencrypt/live/${DOMAIN}/privkey.pem${NC}"
echo ""
echo -e "${CYAN}Useful commands:${NC}"
echo -e "  Check cert expiry:  ${YELLOW}openssl x509 -in /etc/letsencrypt/live/${DOMAIN}/fullchain.pem -noout -dates${NC}"
echo -e "  Force renewal:      ${YELLOW}certbot renew --force-renewal${NC}"
echo -e "  Nginx config:       ${YELLOW}nano /etc/nginx/sites-available/${DOMAIN}${NC}"
echo ""