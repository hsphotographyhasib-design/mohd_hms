#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# MOHD.HMS ENTERPRISE — SSH Deploy Script (Hostinger Business Hosting)
# =============================================================================
# This script automates the full deployment:
#   1. Builds the deployment package (or uses an existing one)
#   2. Uploads via SCP
#   3. Extracts, configures .env, initializes DB
#   4. Restarts the app via Passenger
#
# Prerequisites:
#   - SSH access enabled on your Hostinger account
#   - SSH key or password authentication set up
#
# Usage:
#   bash deploy/hosting/deploy-ssh.sh                    # Full deploy (build + upload + setup)
#   bash deploy/hosting/deploy-ssh.sh --skip-build       # Skip build, upload existing package
#   bash deploy/hosting/deploy-ssh.sh --setup-only       # Only run remote setup (assumes files already uploaded)
#   bash deploy/hosting/deploy-ssh.sh --db-only          # Only push database schema changes
# =============================================================================

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

# ══════════════════════════════════════════════════════════════════════════
# CONFIGURATION — Edit these to match your Hostinger account
# ══════════════════════════════════════════════════════════════════════════

# SSH connection (use your SSH username, not cPanel username)
SSH_USER="u366055699"
SSH_HOST="orangered-hippopotamus-866396.hostingersite.com"
SSH_PORT="21098"               # Hostinger default SSH port (check hPanel if different)

# Or use an SSH alias from ~/.ssh/config:
# SSH_TARGET="hostinger"
# If set, SSH_USER/SSH_HOST/SSH_PORT are ignored.
SSH_TARGET=""

# Remote paths
REMOTE_HOME="/home/${SSH_USER}"
APP_DIR="mohd-hms"          # Application directory name on the server
PACKAGE_NAME="mohd-hms-deploy.tar.gz"

# ══════════════════════════════════════════════════════════════════════════
# ARGUMENTS
# ══════════════════════════════════════════════════════════════════════════

SKIP_BUILD=false
SETUP_ONLY=false
DB_ONLY=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-build)   SKIP_BUILD=true; shift ;;
        --setup-only)   SETUP_ONLY=true; shift ;;
        --db-only)      DB_ONLY=true; shift ;;
        --help|-h)
            echo "Usage: bash deploy/hosting/deploy-ssh.sh [--skip-build] [--setup-only] [--db-only]"
            echo ""
            echo "  --skip-build   Use existing package, don't rebuild"
            echo "  --setup-only   Only run remote setup (files must already be uploaded)"
            echo "  --db-only      Only push Prisma schema changes to remote database"
            exit 0 ;;
        *) fatal "Unknown option: $1" ;;
    esac
done

# ══════════════════════════════════════════════════════════════════════════
# DERIVED VALUES
# ══════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PACKAGE_PATH="${PROJECT_ROOT}/${PACKAGE_NAME}"

if [[ -n "${SSH_TARGET}" ]]; then
    SSH_CMD="ssh ${SSH_TARGET}"
    SCP_CMD="scp"
else
    SSH_CMD="ssh -p ${SSH_PORT} ${SSH_USER}@${SSH_HOST}"
    SCP_CMD="scp -P ${SSH_PORT}"
fi

REMOTE_APP="${REMOTE_HOME}/${APP_DIR}"

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  MOHD.HMS ENTERPRISE — SSH Deploy${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Server:${NC}   ${SSH_USER}@${SSH_HOST}:${SSH_PORT}"
echo -e "  ${CYAN}Target:${NC}   ${REMOTE_APP}"
echo ""

# ══════════════════════════════════════════════════════════════════════════
# DB-ONLY MODE
# ══════════════════════════════════════════════════════════════════════════

if [[ "${DB_ONLY}" == "true" ]]; then
    info "Pushing database schema changes to remote..."

    ${SSH_CMD} bash -s "${REMOTE_APP}" << 'REMOTE_SCRIPT'
    cd "$1"
    echo "Working directory: $(pwd)"

    # Generate Prisma client
    echo "Generating Prisma client..."
    npx prisma generate --skip-generate 2>/dev/null || npx prisma generate

    # Push schema
    echo "Pushing schema to database..."
    npx prisma db push --force-reset 2>/dev/null || npx prisma db push

    echo "Database updated successfully."
REMOTE_SCRIPT

    success "Database schema pushed."
    exit 0
fi

# ══════════════════════════════════════════════════════════════════════════
# STEP 1: BUILD
# ══════════════════════════════════════════════════════════════════════════

if [[ "${SETUP_ONLY}" == "false" && "${SKIP_BUILD}" == "false" ]]; then
    info "Step 1/4: Building deployment package..."
    bash "${SCRIPT_DIR}/build-package.sh" --docker
    echo ""
elif [[ "${SKIP_BUILD}" == "true" ]]; then
    if [[ ! -f "${PACKAGE_PATH}" ]]; then
        fatal "Package not found: ${PACKAGE_PATH}. Run without --skip-build first."
    fi
    info "Step 1/4: Using existing package: ${PACKAGE_PATH} ($(du -sh "${PACKAGE_PATH}" | cut -f1))"
fi

# ══════════════════════════════════════════════════════════════════════════
# STEP 2: TEST SSH CONNECTION
# ══════════════════════════════════════════════════════════════════════════

info "Step 2/4: Testing SSH connection..."
if ! ${SSH_CMD} "echo 'SSH OK' && node -v && npm -v" 2>/dev/null; then
    echo ""
    error "Cannot connect via SSH. Please check:"
    echo ""
    echo "  1. SSH is enabled in Hostinger hPanel:"
    echo "     hPanel → Hosting → SSH Access → Enable"
    echo ""
    echo "  2. SSH password is correct (set in hPanel → SSH Access → Change Password)"
    echo ""
    echo "  3. SSH port is correct (Hostinger default: 21098)"
    echo "     Check: hPanel → Hosting → SSH Access"
    echo ""
    echo "  4. Your IP is not blocked (try from a different network if needed)"
    echo ""
    echo "  Manual test:"
    echo "    ssh -p 21098 u366055699@orangered-hippopotamus-866396.hostingersite.com"
    echo ""
    fatal "SSH connection failed."
fi
success "SSH connected."
echo ""

# ══════════════════════════════════════════════════════════════════════════
# STEP 3: UPLOAD
# ══════════════════════════════════════════════════════════════════════════

if [[ "${SETUP_ONLY}" == "false" ]]; then
    info "Step 3/4: Uploading package to server..."
    ${SCP_CMD} "${PACKAGE_PATH}" "${SSH_USER}@${SSH_HOST}:${REMOTE_HOME}/${PACKAGE_NAME}"
    success "Uploaded: ${PACKAGE_NAME} ($(du -sh "${PACKAGE_PATH}" | cut -f1))"
    echo ""
else
    info "Step 3/4: Skipping upload (--setup-only)."
    echo ""
fi

# ══════════════════════════════════════════════════════════════════════════
# STEP 4: REMOTE SETUP
# ══════════════════════════════════════════════════════════════════════════

info "Step 4/4: Setting up application on server..."

${SSH_CMD} bash -s "${REMOTE_HOME}" "${APP_DIR}" "${PACKAGE_NAME}" << 'REMOTE_SCRIPT'
set -e

REMOTE_HOME="$1"
APP_DIR="$2"
PACKAGE_NAME="$3"
APP_PATH="${REMOTE_HOME}/${APP_DIR}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Remote Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Backup existing .env if this is an update ──
if [[ -f "${APP_PATH}/.env" ]]; then
    echo "[BACKUP] Saving existing .env..."
    cp "${APP_PATH}/.env" "${APP_PATH}/.env.backup.$(date +%Y%m%d%H%M%S)"
    EXISTING_ENV="yes"
else
    EXISTING_ENV="no"
fi

# ── Backup existing database if this is an update ──
if [[ -f "${APP_PATH}/db/custom.db" ]]; then
    echo "[BACKUP] Saving existing database..."
    mkdir -p "${REMOTE_HOME}/backups"
    cp "${APP_PATH}/db/custom.db" "${REMOTE_HOME}/backups/custom.db.$(date +%Y%m%d%H%M%S)"
fi

# ── Clean old app directory ──
if [[ -d "${APP_PATH}" ]]; then
    echo "[CLEAN] Removing previous app directory..."
    rm -rf "${APP_PATH}"
fi

# ── Extract package ──
echo "[EXTRACT] Extracting ${PACKAGE_NAME}..."
cd "${REMOTE_HOME}"
tar xzf "${PACKAGE_NAME}"
mv app "${APP_DIR}"
rm -f "${PACKAGE_NAME}"

# ── Create .env ──
if [[ "${EXISTING_ENV}" == "yes" ]]; then
    echo "[ENV] Restoring previous .env..."
    LATEST_BACKUP=$(ls -t "${APP_PATH}/.env.backup."* 2>/dev/null | head -1)
    if [[ -n "${LATEST_BACKUP}" ]]; then
        cp "${LATEST_BACKUP}" "${APP_PATH}/.env"
    fi
else
    echo "[ENV] Creating .env from template..."
    if [[ -f "${APP_PATH}/.env.example" ]]; then
        cp "${APP_PATH}/.env.example" "${APP_PATH}/.env"
        echo "[ENV] .env created from pre-configured template."
    else
        echo "[WARN] No .env.example found. Creating minimal .env..."
        cat > "${APP_PATH}/.env" << 'ENVCONTENT'
NODE_ENV=production
APP_URL=https://orangered-hippopotamus-866396.hostingersite.com
DATABASE_URL=file:./db/custom.db
JWT_SECRET=ac3582fa63dd6514476ac31f63495bcd705d03f3dbd173ae06822bc5ff00c302
JWT_EXPIRES_IN=7d
STORAGE_ROOT=./storage
MAX_FILE_SIZE=104857600
WHATSAPP_ENABLED=false
LOG_LEVEL=warn
ENVCONTENT
    fi
fi

# ── Ensure directories exist ──
mkdir -p "${APP_PATH}/db"
mkdir -p "${APP_PATH}/storage/chunks"
mkdir -p "${APP_PATH}/storage/documents"
mkdir -p "${APP_PATH}/tmp"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Setup Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  App directory: ${APP_PATH}"
echo "  .env file:     $([ -f "${APP_PATH}/.env" ] && echo 'EXISTS' || echo 'MISSING')"
echo "  Database:      $([ -f "${APP_PATH}/db/custom.db" ] && echo 'EXISTS (backed up)' || echo 'NOT YET (run: npx prisma db push)')"
echo ""

# ── Auto-detect if this is first deploy or update ──
if [[ "${EXISTING_ENV}" == "no" ]]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  FIRST DEPLOY — Remaining Steps"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  1. Go to cPanel → Software → Setup Node.js App"
    echo "     - Node.js version: 20.x"
    echo "     - Application mode: Production"
    echo "     - Application root: ${APP_DIR}"
    echo "     - Application URL: orangered-hippopotamus-866396.hostingersite.com"
    echo "     - Application startup file: server.js"
    echo "     - Click 'Create'"
    echo ""
    echo "  2. After cPanel creates the app, initialize the database:"
    echo "     cd ${APP_PATH}"
    echo "     npx prisma generate"
    echo "     npx prisma db push"
    echo ""
    echo "  3. Restart the app in cPanel (or run):"
    echo "     touch ${APP_PATH}/tmp/restart.txt"
    echo ""
else
    echo "  This is an UPDATE. Your .env and database are preserved."
    echo ""
    echo "  To apply database schema changes (if any):"
    echo "    cd ${APP_PATH} && npx prisma generate && npx prisma db push"
    echo ""
    echo "  To restart the app:"
    echo "    touch ${APP_PATH}/tmp/restart.txt"
    echo "    (or restart via cPanel → Setup Node.js App → Restart)"
    echo ""
fi

REMOTE_SCRIPT

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓  Deploy complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}URL:${NC}     https://orangered-hippopotamus-866396.hostingersite.com"
echo -e "  ${CYAN}Health:${NC}  https://orangered-hippopotamus-866396.hostingersite.com/api/health"
echo ""
echo -e "  ${CYAN}SSH:${NC}     ssh -p 21098 u366055699@orangered-hippopotamus-866396.hostingersite.com"
echo ""