#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# FacilityPro — Build Deployment Package for Hostinger Business Hosting
# =============================================================================
# This script builds the Next.js app and creates a deployable .tar.gz
# for upload to Hostinger Business hosting (cPanel Node.js).
#
# IMPORTANT: Build on a Linux machine (or WSL). If on macOS/Windows,
# use the Docker build option (--docker) to ensure Linux compatibility.
#
# Usage:
#   bash deploy/hosting/build-package.sh              # Local build (Linux/WSL)
#   bash deploy/hosting/build-package.sh --docker     # Docker build (any OS)
#   bash deploy/hosting/build-package.sh --docker --with-whatsapp
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

# ── Arguments ──────────────────────────────────────────────────────────────
USE_DOCKER=false
WITH_WHATSAPP=false
SKIP_INSTALL=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --docker)         USE_DOCKER=true; shift ;;
        --with-whatsapp)  WITH_WHATSAPP=true; shift ;;
        --skip-install)   SKIP_INSTALL=true; shift ;;
        --help|-h)
            echo "Usage: bash deploy/hosting/build-package.sh [--docker] [--with-whatsapp] [--skip-install]"
            exit 0 ;;
        *) fatal "Unknown option: $1" ;;
    esac
done

# ── Constants ──────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${PROJECT_ROOT}/.build-output"
PACKAGE_NAME="facilitypro-deploy.tar.gz"
OUTPUT="${PROJECT_ROOT}/${PACKAGE_NAME}"

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  FacilityPro — Build Deployment Package${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# ══════════════════════════════════════════════════════════════════════════
# METHOD 1: Docker Build (works on any OS)
# ══════════════════════════════════════════════════════════════════════════
if [[ "${USE_DOCKER}" == "true" ]]; then
    command -v docker &>/dev/null || fatal "Docker is not installed. Install Docker or use local build without --docker."

    info "Building with Docker (Linux compatibility guaranteed)…"

    DOCKER_TAG="facilitypro-build:latest"

    # Build the package inside a Docker container
    docker build -f "${SCRIPT_DIR}/Dockerfile.build" -t "${DOCKER_TAG}" "${PROJECT_ROOT}"

    # Extract the built package from the container
    CONTAINER_ID=$(docker create "${DOCKER_TAG}")
    docker cp "${CONTAINER_ID}:/app/${PACKAGE_NAME}" "${OUTPUT}"
    docker rm "${CONTAINER_ID}" > /dev/null

    success "Package created: ${OUTPUT}"
    echo ""
    echo -e "  ${CYAN}Size:${NC} $(du -sh "${OUTPUT}" | cut -f1)"
    echo ""

else
    # ══════════════════════════════════════════════════════════════════════
    # METHOD 2: Local Build (Linux/WSL only)
    # ══════════════════════════════════════════════════════════════════════
    info "Building locally…"

    # Check OS (sharp native modules require Linux)
    if [[ "$(uname -s)" != "Linux" ]]; then
        warn "You are not on Linux. Native modules (sharp) may not work on the server."
        warn "Consider using --docker flag for cross-platform compatibility."
        echo ""
        read -p "Continue anyway? [y/N] " -n 1 -r
        echo ""
        [[ ! $REPLY =~ ^[Yy]$ ]] && exit 0
    fi

    cd "${PROJECT_ROOT}"

    # ── Step 1: Install Dependencies ──────────────────────────────────────
    if [[ "${SKIP_INSTALL}" == "true" ]]; then
        warn "Skipping npm install."
    else
        info "Installing dependencies…"
        npm install --ignore-scripts 2>&1 | tail -3
        success "Dependencies installed."
    fi

    # ── Step 2: Generate Prisma Client ────────────────────────────────────
    info "Generating Prisma client…"
    npx prisma generate
    success "Prisma client generated."

    # ── Step 3: Build Next.js ────────────────────────────────────────────
    info "Building Next.js (standalone)…"
    npm run build 2>&1 | tail -5

    if [[ ! -f ".next/standalone/server.js" ]]; then
        fatal "Build failed — standalone/server.js not found."
    fi
    success "Next.js built."

    # ── Step 4: Assemble Package ──────────────────────────────────────────
    info "Assembling deployment package…"

    rm -rf "${BUILD_DIR}"
    mkdir -p "${BUILD_DIR}/app"

    # Copy standalone output
    cp -r .next/standalone/* "${BUILD_DIR}/app/"

    # ── CRITICAL: Include a proper package.json for cPanel ─────────────
    # cPanel's "Setup Node.js App" runs `npm install` on this directory.
    # The standalone output has a minimal package.json that may miss
    # native modules (sharp, etc.) or their postinstall scripts.
    # We overwrite it with one that has all production dependencies.
    info "Preparing production package.json…"
    node -e "
    const pkg = require('./package.json');
    const prod = {
      name: pkg.name,
      version: pkg.version,
      private: true,
      scripts: {
        start: 'node server.js',
        'db:push': 'npx prisma db push',
        'db:generate': 'npx prisma generate'
      },
      dependencies: pkg.dependencies
    };
    // Remove dev-only packages that don't work on shared hosting
    delete prod.dependencies['puppeteer-core'];
    require('fs').writeFileSync(
      '${BUILD_DIR}/app/package.json',
      JSON.stringify(prod, null, 2) + '\n'
    );
    "

    # Copy Prisma schema (needed for db push/migrations)
    mkdir -p "${BUILD_DIR}/app/prisma"
    cp prisma/schema.prisma "${BUILD_DIR}/app/prisma/"

    # Create storage directory
    mkdir -p "${BUILD_DIR}/app/storage/chunks"
    mkdir -p "${BUILD_DIR}/app/storage/documents"

    # Create db directory
    mkdir -p "${BUILD_DIR}/app/db"

    # Copy production env template
    if [[ -f "deploy/hosting/.env.production" ]]; then
        cp deploy/hosting/.env.production "${BUILD_DIR}/app/.env.example"
    fi

    # Copy htaccess
    if [[ -f "deploy/hosting/.htaccess" ]]; then
        cp deploy/hosting/.htaccess "${BUILD_DIR}/app/.htaccess"
    fi

    # ── Step 5: Create tarball ────────────────────────────────────────────
    info "Creating deployment archive…"
    cd "${BUILD_DIR}"
    tar czf "${OUTPUT}" app/
    cd "${PROJECT_ROOT}"
    rm -rf "${BUILD_DIR}"

    success "Package created: ${OUTPUT}"
    echo ""
    echo -e "  ${CYAN}Size:${NC} $(du -sh "${OUTPUT}" | cut -f1)"
fi

# ── Summary ──────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓  Build complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Package:${NC}  ${OUTPUT}"
echo -e "  ${CYAN}Size:${NC}    $(du -sh "${OUTPUT}" | cut -f1)"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo ""
echo -e "  1. Upload ${YELLOW}${PACKAGE_NAME}${NC} to your Hostinger hosting via:"
echo -e "     - cPanel File Manager → Upload to home directory"
echo -e "     - Or SFTP:  sftp ${YELLOW}u366055699@orangered-hippopotamus-866396.hostingersite.com${NC}"
echo ""
echo -e "  2. Extract on the server:"
echo -e "     ${YELLOW}tar xzf facilitypro-deploy.tar.gz${NC}"
echo ""
echo -e "  3. Configure and start (see DEPLOY.md for full guide)"
echo ""