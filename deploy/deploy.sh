#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# MOHD.HMS ENTERPRISE - Main Deployment Script
# Company: SMART MAINTENANCE SERVICES SDN BHD
#
# Usage:
#   bash deploy.sh [OPTIONS]
#
# Options:
#   --skip-build       Skip the Next.js build (use existing .next)
#   --with-whatsapp    Enable WhatsApp service (requires Chrome + Xvfb)
#   --domain DOMAIN    Set the domain (updates APP_URL and nginx config)
#   --help             Show this help message
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
fatal()   { error "$*"; exit 1; }

# ── Defaults ─────────────────────────────────────────────────────────────────
SKIP_BUILD=false
WITH_WHATSAPP=false
DOMAIN=""

# ── Parse Arguments ──────────────────────────────────────────────────────────
show_help() {
    sed -n '2,/^$/{ s/^# //; s/^#//; p }' "$0"
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-build)    SKIP_BUILD=true; shift ;;
        --with-whatsapp) WITH_WHATSAPP=true; shift ;;
        --domain)        DOMAIN="$2"; shift 2 ;;
        --help|-h)       show_help ;;
        *)               fatal "Unknown option: $1" ;;
    esac
done

# ── Constants ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="/opt/mohd-hms"
COMPOSE_FILE="${APP_DIR}/app/deploy/vps/docker-compose.yml"
HEALTH_URL="http://localhost:3000"
MAX_WAIT=60 # seconds to wait for health check

# ── Step 1: Prerequisite Checks ─────────────────────────────────────────────
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  MOHD.HMS ENTERPRISE Deployment${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

command -v docker &>/dev/null   || fatal "Docker is not installed. Run setup-server.sh first."
docker compose version &>/dev/null || fatal "Docker Compose plugin is not installed. Run setup-server.sh first."
success "Docker & Docker Compose: OK"

# ── Step 2: Ensure Application Directory ─────────────────────────────────────
info "Ensuring application directory: ${APP_DIR}"
mkdir -p "${APP_DIR}"/{app,db,storage,logs,ssl}

# ── Step 3: Copy Project Files ──────────────────────────────────────────────
info "Copying project files to ${APP_DIR}/app…"
rsync -a --exclude='node_modules' \
        --exclude='.git' \
        --exclude='.next' \
        --exclude='db/*.db' \
        --exclude='db/*.db-journal' \
        --exclude='mini-services/whatsapp-service/storage/sessions' \
        --exclude='storage/' \
        "${PROJECT_ROOT}/" "${APP_DIR}/app/"
success "Project files copied."

# ── Step 4: Environment File ─────────────────────────────────────────────────
if [[ -f "${APP_DIR}/app/.env" ]]; then
    success "Existing .env found — keeping current configuration."
else
    if [[ -f "${APP_DIR}/app/.env.example" ]]; then
        cp "${APP_DIR}/app/.env.example" "${APP_DIR}/app/.env"
        warn "Created .env from .env.example."
        warn "IMPORTANT: Edit ${APP_DIR}/app/.env and set JWT_SECRET!"
        warn "  Run:  nano ${APP_DIR}/app/.env"
    else
        fatal ".env.example not found. Cannot create .env."
    fi
fi

# ── Step 5: Update Domain in .env ────────────────────────────────────────────
if [[ -n "${DOMAIN}" ]]; then
    if [[ -f "${APP_DIR}/app/.env" ]]; then
        sed -i "s|^APP_URL=.*|APP_URL=https://${DOMAIN}|" "${APP_DIR}/app/.env"
        success "APP_URL set to https://${DOMAIN}"
    fi
fi

# ── Step 6: Build Docker Images ─────────────────────────────────────────────
if [[ "${SKIP_BUILD}" == "true" ]]; then
    warn "Skipping build (--skip-build). Using existing images."
else
    info "Building Docker images…"
    cd "${APP_DIR}/app"

    # Build args for WhatsApp support
    BUILD_ARGS=""
    if [[ "${WITH_WHATSAPP}" == "true" ]]; then
        BUILD_ARGS="--build-arg WHATSAPP_ENABLED=true"
        if [[ -f .env ]]; then
            sed -i 's|^WHATSAPP_ENABLED=.*|WHATSAPP_ENABLED=true|' .env
        fi
        info "WhatsApp support: ENABLED"
    else
        info "WhatsApp support: DISABLED (use --with-whatsapp to enable)"
    fi

    docker compose -f deploy/vps/docker-compose.yml build ${BUILD_ARGS}
    success "Docker images built."
fi

# ── Step 7: Start Services ──────────────────────────────────────────────────
info "Starting services with Docker Compose…"
cd "${APP_DIR}/app"
docker compose -f deploy/vps/docker-compose.yml up -d
success "Services started."

# ── Step 8: Health Check ────────────────────────────────────────────────────
info "Waiting for application to become healthy (max ${MAX_WAIT}s)…"
ELAPSED=0
while [[ ${ELAPSED} -lt ${MAX_WAIT} ]]; do
    if curl -sf -o /dev/null "${HEALTH_URL}" 2>/dev/null; then
        success "Application is healthy!"
        break
    fi
    sleep 3
    ELAPSED=$((ELAPSED + 3))
    echo -ne "  ${CYAN}⏳ ${ELAPSED}s / ${MAX_WAIT}s${NC}\r"
done
echo ""

if [[ ${ELAPSED} -ge ${MAX_WAIT} ]]; then
    warn "Health check timed out after ${MAX_WAIT}s."
    warn "The application may still be starting. Check logs:"
    warn "  docker compose -f ${COMPOSE_FILE} logs -f"
fi

# ── Step 9: Print Status ────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓  Deployment complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Read APP_URL from .env if available
APP_URL=""
if [[ -f "${APP_DIR}/app/.env" ]]; then
    APP_URL=$(grep -E '^APP_URL=' "${APP_DIR}/app/.env" | cut -d'=' -f2-)
fi

if [[ -n "${APP_URL}" && "${APP_URL}" != "https://your-domain.com" ]]; then
    echo -e "  ${CYAN}Application URL:${NC}  ${APP_URL}"
else
    echo -e "  ${CYAN}Application URL:${NC}  http://<your-server-ip>:3000"
    warn "Remember to set APP_URL and run ssl-setup.sh for HTTPS."
fi

echo ""
echo -e "${CYAN}Useful commands:${NC}"
echo -e "  View logs:       ${YELLOW}cd ${APP_DIR}/app && docker compose -f deploy/vps/docker-compose.yml logs -f${NC}"
echo -e "  Restart:         ${YELLOW}cd ${APP_DIR}/app && docker compose -f deploy/vps/docker-compose.yml restart${NC}"
echo -e "  Stop:            ${YELLOW}cd ${APP_DIR}/app && docker compose -f deploy/vps/docker-compose.yml down${NC}"
echo -e "  Check status:    ${YELLOW}docker ps${NC}"
echo -e "  Backup:          ${YELLOW}bash ${APP_DIR}/app/backup.sh${NC}"
echo ""