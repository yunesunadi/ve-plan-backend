#!/usr/bin/env bash
#
# Restore a VE-Plan MongoDB backup archive produced by mongo-backup.sh.
# DESTRUCTIVE: --drop replaces every collection in the target database.
#
#   Usage:
#     scripts/mongo-restore.sh <archive.gz> [--yes]
#
#   Env / config:
#     RESTORE_DB_URL   target connection string
#                      (falls back to DB_URL, then backend/.env DB_URL)
#
# For a rehearsal, point RESTORE_DB_URL at a scratch database name so the
# live data is never touched — see docs/RUNBOOK.md "Backup & restore".
#
set -euo pipefail

ARCHIVE="${1:-}"
CONFIRM_FLAG="${2:-}"

if [[ -z "${ARCHIVE}" || ! -f "${ARCHIVE}" ]]; then
  echo "Usage: $0 <archive.gz> [--yes]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

TARGET="${RESTORE_DB_URL:-${DB_URL:-}}"
if [[ -z "${TARGET}" && -f "${REPO_DIR}/.env" ]]; then
  TARGET="$(grep -E '^DB_URL=' "${REPO_DIR}/.env" | head -1 | cut -d= -f2- | tr -d '"'"'"'')"
fi

if [[ -z "${TARGET}" ]]; then
  echo "ERROR: no target — set RESTORE_DB_URL or DB_URL" >&2
  exit 1
fi

echo "About to restore:"
echo "  archive : ${ARCHIVE}"
echo "  target  : ${TARGET%%\?*}"
echo "  mode    : mongorestore --drop --gzip  (replaces existing collections)"
echo

if [[ "${CONFIRM_FLAG}" != "--yes" ]]; then
  read -r -p 'Type RESTORE to continue: ' answer
  [[ "${answer}" == "RESTORE" ]] || { echo "Aborted."; exit 1; }
fi

mongorestore --uri "${TARGET}" --gzip --archive="${ARCHIVE}" --drop
echo "Restore complete."
