#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# FacilityPro - Restore Script
# Company: SMART MAINTENANCE SERVICES SDN BHD
#
# Restores database and storage from a previously created backup archive.
#
# Usage:
#   sudo bash restore.sh <backup-file> [--force]
#
# Arguments:
#   <backup-file>  Path to the .tar.gz backup file
#   --force        Skip confirmation prompt
#
# Example:
#   sudo bash restore.sh /opt/facilitypro/backups/facilitypro-20250101-020000.tar.gz
# =============================================================================

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
fatal()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Configuration ────────────────────────────────────────────────────────────
APP_DIR="/opt/facilitypro"
DB_DIR="${APP_DIR}/db"
STORAGE_DIR="${APP_DIR}/storage"
COMPOSE_FILE="${APP_DIR}/app/docker-compose.yml"

# ── Step 1: Check Arguments ─────────────────────────────────────────────────
FORCE=false
BACKUP_FILE=""

for arg in "$@"; do
    case "${arg}" in
        --force)  FORCE=true ;;
        -*)       warn "Unknown option: ${arg}" ;;
        *)
            if [[ -z "${BACKUP_FILE}" ]]; then
                BACKUP_FILE="${arg}"
            else
                fatal "Multiple backup files specified. Provide only one."
            fi
            ;;
    esac
done

if [[ -z "${BACKUP_FILE}" ]]; then
    error "Usage: sudo bash restore.sh <backup-file> [--force]"
    echo ""
    echo -e "  Available backups:"
    if [[ -d "${APP_DIR}/backups" ]]; then
        ls -lht "${APP_DIR}/backups"/facilitypro-*.tar.gz 2>/dev/null | while read -r line; do
            echo -e "    ${CYAN}${line}${NC}"
        done
        if [[ -z "$(ls "${APP_DIR}/backups"/facilitypro-*.tar.gz 2>/dev/null)" ]]; then
            echo -e "    ${YELLOW}(no backups found)${NC}"
        fi
    else
        echo -e "    ${YELLOW}(backup directory not found)${NC}"
    fi
    exit 1
fi

# ── Step 2: Verify Backup File ──────────────────────────────────────────────
info "Verifying backup file: ${CYAN}${BACKUP_FILE}${NC}"

if [[ ! -f "${BACKUP_FILE}" ]]; then
    fatal "Backup file not found: ${BACKUP_FILE}"
fi

# Verify it's a valid gzip file
if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
    fatal "Backup file is corrupted or not a valid gzip archive."
fi
success "Backup file is valid."

# List contents for preview
echo ""
info "Backup contents:"
tar -tzf "${BACKUP_FILE}" 2>/dev/null | head -20
TOTAL_FILES=$(tar -tzf "${BACKUP_FILE}" 2>/dev/null | wc -l)
echo -e "  … ${TOTAL_FILES} file(s) total"
echo ""

# ── Step 3: Confirmation ────────────────────────────────────────────────────
if [[ "${FORCE}" != "true" ]]; then
    echo -e "${RED}${BOLD}⚠  WARNING: This will REPLACE your current database and storage files!${NC}"
    echo ""
    echo -e "  Target database dir:  ${CYAN}${DB_DIR}${NC}"
    echo -e "  Target storage dir:   ${CYAN}${STORAGE_DIR}${NC}"
    echo -e "  Backup file:          ${CYAN}${BACKUP_FILE}${NC}"
    echo ""
    read -rp "$(echo -e "${YELLOW}${BOLD}Type 'RESTORE' to continue: ${NC}")" CONFIRM
    if [[ "${CONFIRM}" != "RESTORE" ]]; then
        warn "Restore cancelled by user."
        exit 0
    fi
fi

# ── Step 4: Stop Services ──────────────────────────────────────────────────
info "Stopping application services…"

if [[ -f "${COMPOSE_FILE}" ]]; then
    cd "${APP_DIR}/app"
    docker compose stop 2>/dev/null || true
    success "Docker services stopped."
else
    warn "docker-compose.yml not found. Skipping Docker stop."
fi

# ── Step 5: Create Temporary Restore Directory ─────────────────────────────
WORK_DIR=$(mktemp -d)
trap 'rm -rf "${WORK_DIR}"' EXIT

info "Extracting backup to temporary directory…"
tar -xzf "${BACKUP_FILE}" -C "${WORK_DIR}" 2>/dev/null
success "Backup extracted."

# ── Step 6: Restore Database ───────────────────────────────────────────────
if [[ -d "${WORK_DIR}/db" ]] && [[ -n "$(ls -A "${WORK_DIR}/db" 2>/dev/null)" ]]; then
    info "Restoring database…"

    # Create a pre-restore backup of current DB (just in case)
    if [[ -d "${DB_DIR}" ]] && [[ -n "$(ls -A "${DB_DIR}"/*.db 2>/dev/null)" ]]; then
        PRE_RESTORE_DIR="${APP_DIR}/backups/pre-restore-$(date '+%Y%m%d-%H%M%S')"
        mkdir -p "${PRE_RESTORE_DIR}"
        cp -a "${DB_DIR}"/*.db* "${PRE_RESTORE_DIR}/" 2>/dev/null || true
        warn "Current database backed up to: ${PRE_RESTORE_DIR}"
    fi

    # Ensure DB directory exists
    mkdir -p "${DB_DIR}"

    # Restore database files
    for db_file in "${WORK_DIR}/db"/*.db; do
        [[ -f "${db_file}" ]] || continue
        db_name=$(basename "${db_file}")
        info "  Restoring: ${db_name}"
        cp -a "${db_file}" "${DB_DIR}/${db_name}"
    done

    # Restore WAL and SHM if they exist
    for ext in wal shm; do
        for file in "${WORK_DIR}/db"/*."${ext}"; do
            [[ -f "${file}" ]] || continue
            cp -a "${file}" "${DB_DIR}/"
        done
    done

    # Fix permissions
    chmod 644 "${DB_DIR}"/*.db 2>/dev/null || true
    chmod 644 "${DB_DIR}"/*.db-wal 2>/dev/null || true
    chmod 644 "${DB_DIR}"/*.db-shm 2>/dev/null || true

    success "Database restored."
else
    warn "No database files found in backup. Skipping database restore."
fi

# ── Step 7: Restore Storage ────────────────────────────────────────────────
if [[ -d "${WORK_DIR}/storage" ]] && [[ -n "$(ls -A "${WORK_DIR}/storage" 2>/dev/null)" ]]; then
    info "Restoring storage files…"

    # Create a pre-restore backup of current storage
    if [[ -d "${STORAGE_DIR}" ]] && [[ -n "$(ls -A "${STORAGE_DIR}" 2>/dev/null)" ]]; then
        PRE_RESTORE_STORAGE="${APP_DIR}/backups/pre-restore-storage-$(date '+%Y%m%d-%H%M%S')"
        mkdir -p "${PRE_RESTORE_STORAGE}"
        cp -a "${STORAGE_DIR}/." "${PRE_RESTORE_STORAGE}/" 2>/dev/null || true
        warn "Current storage backed up to: ${PRE_RESTORE_STORAGE}"
    fi

    # Ensure storage directory exists
    mkdir -p "${STORAGE_DIR}"

    # Restore storage files
    rsync -a --delete "${WORK_DIR}/storage/" "${STORAGE_DIR}/" 2>/dev/null

    # Fix permissions
    chmod -R 755 "${STORAGE_DIR}"

    FILE_COUNT=$(find "${STORAGE_DIR}" -type f | wc -l)
    success "Storage restored: ${FILE_COUNT} file(s)."
else
    warn "No storage files found in backup. Skipping storage restore."
fi

# ── Step 8: Restart Services ───────────────────────────────────────────────
info "Restarting application services…"

if [[ -f "${COMPOSE_FILE}" ]]; then
    cd "${APP_DIR}/app"
    docker compose start 2>/dev/null || docker compose up -d 2>/dev/null
    success "Docker services restarted."

    # Wait for health check
    info "Waiting for application to become healthy…"
    ELAPSED=0
    while [[ ${ELAPSED} -lt 30 ]]; do
        if curl -sf -o /dev/null http://localhost:3000 2>/dev/null; then
            success "Application is healthy!"
            break
        fi
        sleep 2
        ELAPSED=$((ELAPSED + 2))
    done
else
    warn "docker-compose.yml not found. Start services manually."
fi

# ── Step 9: Verify Restoration ─────────────────────────────────────────────
echo ""
info "Verifying restoration…"

# Check database
if [[ -d "${DB_DIR}" ]]; then
    DB_COUNT=$(find "${DB_DIR}" -name '*.db' -type f | wc -l)
    if [[ ${DB_COUNT} -gt 0 ]]; then
        success "Database: ${DB_COUNT} database file(s) present."
    else
        warn "Database: No .db files found after restore."
    fi
fi

# Check storage
if [[ -d "${STORAGE_DIR}" ]]; then
    STORAGE_COUNT=$(find "${STORAGE_DIR}" -type f | wc -l)
    STORAGE_SIZE=$(du -sh "${STORAGE_DIR}" 2>/dev/null | cut -f1)
    success "Storage: ${STORAGE_COUNT} file(s), ${STORAGE_SIZE} total."
fi

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓  Restore complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Restored from:${NC}  ${BACKUP_FILE}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo -e "  Check logs:  ${YELLOW}cd ${APP_DIR}/app && docker compose logs -f --tail=50${NC}"
echo -e "  Verify app:  ${YELLOW}curl -sf http://localhost:3000/api/health || echo 'health endpoint not available'${NC}"
echo ""