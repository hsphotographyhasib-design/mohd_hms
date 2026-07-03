#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# FacilityPro - Backup Script
# Company: SMART MAINTENANCE SERVICES SDN BHD
#
# Backs up the SQLite database and document storage to a compressed archive.
# Designed to be run manually or via cron (e.g., daily at 2 AM).
#
# Usage:
#   sudo bash backup.sh
#
# Cron example (daily at 2 AM, keep last 7 days):
#   0 2 * * * /opt/facilitypro/app/backup.sh >> /opt/facilitypro/logs/backup.log 2>&1
#
# Restore with:  sudo bash restore.sh /opt/facilitypro/backups/facilitypro-YYYYMMDD-HHMMSS.tar.gz
# =============================================================================

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Disable colours if not a terminal (e.g., cron)
if [[ ! -t 1 ]]; then
    RED='' GREEN='' YELLOW='' BLUE='' CYAN='' NC=''
fi

info()    { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] [OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] [WARN]${NC}  $*"; }
error()   { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $*" >&2; }
fatal()   { error "$*"; exit 1; }

# ── Configuration ────────────────────────────────────────────────────────────
APP_DIR="/opt/facilitypro"
BACKUP_DIR="${APP_DIR}/backups"
DB_DIR="${APP_DIR}/db"
STORAGE_DIR="${APP_DIR}/storage"
RETENTION_DAYS=7
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
BACKUP_NAME="facilitypro-${TIMESTAMP}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# ── Preflight ────────────────────────────────────────────────────────────────
info "Starting backup…"
echo ""

# Check source directories exist
[[ -d "${DB_DIR}" ]]      || warn "Database directory ${DB_DIR} does not exist. Nothing to back up."
[[ -d "${STORAGE_DIR}" ]] || warn "Storage directory ${STORAGE_DIR} does not exist. Nothing to back up."

# Create backup directory
mkdir -p "${BACKUP_DIR}"
success "Backup directory: ${BACKUP_DIR}"

# ── Step 1: Create Temp Working Directory ────────────────────────────────────
WORK_DIR=$(mktemp -d)
trap 'rm -rf "${WORK_DIR}"' EXIT

mkdir -p "${WORK_DIR}/db"
mkdir -p "${WORK_DIR}/storage"
info "Working directory: ${WORK_DIR}"

# ── Step 2: Backup SQLite Database ──────────────────────────────────────────
info "Backing up SQLite database…"

DB_BACKED_UP=false
if [[ -d "${DB_DIR}" ]]; then
    # Find any .db files in the database directory
    DB_FILES=$(find "${DB_DIR}" -maxdepth 1 -name '*.db' -type f 2>/dev/null || true)

    if [[ -n "${DB_FILES}" ]]; then
        for db_file in ${DB_FILES}; do
            db_name=$(basename "${db_file}")
            info "  Backing up: ${db_name}"

            # Use SQLite's built-in backup for consistency if sqlite3 is available
            if command -v sqlite3 &>/dev/null; then
                # Create an in-memory backup to avoid corruption from concurrent writes
                sqlite3 "${db_file}" ".backup '${WORK_DIR}/db/${db_name}'" 2>/dev/null && \
                    success "  ${db_name} backed up (SQLite backup API)" || {
                    # Fallback: direct copy
                    cp -a "${db_file}" "${WORK_DIR}/db/${db_name}"
                    warn "  ${db_name} copied (fallback — SQLite backup API failed)"
                }
            else
                cp -a "${db_file}" "${WORK_DIR}/db/${db_name}"
                warn "  ${db_name} copied directly (sqlite3 not available — install for safer backups)"
            fi

            # Also copy WAL and SHM files if they exist
            for ext in wal shm; do
                if [[ -f "${db_file}-${ext}" ]]; then
                    cp -a "${db_file}-${ext}" "${WORK_DIR}/db/${db_name}-${ext}"
                fi
            done
            DB_BACKED_UP=true
        done
    else
        warn "No .db files found in ${DB_DIR}."
    fi
fi

if [[ "${DB_BACKED_UP}" == "true" ]]; then
    success "Database backup complete."
else
    warn "No database files were backed up."
fi

# ── Step 3: Backup Storage Directory ────────────────────────────────────────
info "Backing up storage directory…"

STORAGE_BACKED_UP=false
if [[ -d "${STORAGE_DIR}" ]] && [[ -n "$(ls -A "${STORAGE_DIR}" 2>/dev/null)" ]]; then
    # Use rsync for efficient incremental copy
    rsync -a --delete "${STORAGE_DIR}/" "${WORK_DIR}/storage/" 2>/dev/null
    STORAGE_COUNT=$(find "${WORK_DIR}/storage" -type f 2>/dev/null | wc -l)
    success "Storage backup complete: ${STORAGE_COUNT} file(s)."
    STORAGE_BACKED_UP=true
else
    warn "Storage directory is empty or does not exist. Skipping."
fi

# ── Step 4: Compress Backup ─────────────────────────────────────────────────
if [[ "${DB_BACKED_UP}" == "false" ]] && [[ "${STORAGE_BACKED_UP}" == "false" ]]; then
    warn "Nothing to back up. Exiting."
    exit 0
fi

info "Compressing backup…"
tar -czf "${BACKUP_FILE}" -C "${WORK_DIR}" db storage 2>/dev/null
success "Backup compressed: ${BACKUP_FILE}"

# ── Step 5: Backup Rotation ─────────────────────────────────────────────────
info "Rotating old backups (keeping last ${RETENTION_DAYS} days)…"

DELETED=0
if [[ -d "${BACKUP_DIR}" ]]; then
    while IFS= read -r -d '' old_backup; do
        rm -f "${old_backup}"
        DELETED=$((DELETED + 1))
    done < <(find "${BACKUP_DIR}" -name 'facilitypro-*.tar.gz' -type f -mtime +${RETENTION_DAYS} -print0 2>/dev/null)
fi

if [[ ${DELETED} -gt 0 ]]; then
    success "Removed ${DELETED} old backup(s) older than ${RETENTION_DAYS} days."
else
    success "No old backups to remove."
fi

# ── Summary ─────────────────────────────────────────────────────────────────
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
BACKUP_FILES_TOTAL=$(find "${WORK_DIR}" -type f | wc -l)

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓  Backup complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Backup file:${NC}     ${BACKUP_FILE}"
echo -e "  ${CYAN}Backup size:${NC}     ${BACKUP_SIZE}"
echo -e "  ${CYAN}Files backed up:${NC}  ${BACKUP_FILES_TOTAL}"
echo -e "  ${CYAN}Retention:${NC}       ${RETENTION_DAYS} days"
echo ""
echo -e "${CYAN}To restore:${NC}"
echo -e "  ${YELLOW}sudo bash restore.sh ${BACKUP_FILE}${NC}"
echo ""