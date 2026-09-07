#!/usr/bin/env bash
#
# Nightly MongoDB backup for VE-Plan (self-hosted Mongo on the same host).
# Produces a gzipped `mongodump` archive, prunes old archives, and appends a
# line to a log. Intended to be run from cron — see docs/RUNBOOK.md.
#
#   Env / config:
#     DB_URL                 Mongo connection string (falls back to backend/.env)
#     BACKUP_DIR             where archives land   (default: <repo>/backups)
#     BACKUP_RETENTION_DAYS  prune older than this (default: 14)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load DB_URL from backend/.env if not already in the environment.
if [[ -z "${DB_URL:-}" && -f "${REPO_DIR}/.env" ]]; then
  DB_URL="$(grep -E '^DB_URL=' "${REPO_DIR}/.env" | head -1 | cut -d= -f2- | tr -d '"'"'"'')"
fi

if [[ -z "${DB_URL:-}" ]]; then
  echo "ERROR: DB_URL is not set and was not found in ${REPO_DIR}/.env" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-${REPO_DIR}/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
LOG_FILE="${BACKUP_DIR}/backup.log"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE="${BACKUP_DIR}/veplan-${STAMP}.archive.gz"

mkdir -p "${BACKUP_DIR}"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "${LOG_FILE}"; }

log "backup start -> ${ARCHIVE}"

if mongodump --uri "${DB_URL}" --gzip --archive="${ARCHIVE}"; then
  SIZE="$(du -h "${ARCHIVE}" | cut -f1)"
  log "backup ok (${SIZE})"
else
  log "backup FAILED"
  rm -f "${ARCHIVE}"
  exit 1
fi

# Prune archives older than the retention window.
PRUNED="$(find "${BACKUP_DIR}" -maxdepth 1 -name 'veplan-*.archive.gz' -type f -mtime "+${RETENTION_DAYS}" -print -delete | wc -l | tr -d ' ')"
log "pruned ${PRUNED} archive(s) older than ${RETENTION_DAYS} days"
