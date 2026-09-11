#!/usr/bin/env bash
# Install a daily Restic backup job for the current user.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_SCRIPT="$PROJECT_ROOT/scripts/restic_backup.sh"
LOCK_FILE="$PROJECT_ROOT/tmp/restic-backup.lock"
MARKER="# ark-api-restic-backup"
SCHEDULE="${ARK_BACKUP_CRON_SCHEDULE:-0 3 * * *}"
CRON_COMMAND="$SCHEDULE flock -n $LOCK_FILE $BACKUP_SCRIPT $MARKER"

current_crontab="$(crontab -l 2>/dev/null || true)"
filtered_crontab="$(printf '%s\n' "$current_crontab" | grep -Fv "$MARKER" || true)"
{
    printf '%s\n' "$filtered_crontab"
    printf '%s\n' "$CRON_COMMAND"
} | sed '/^[[:space:]]*$/d' | crontab -

echo "Installed daily Ark backup schedule: $SCHEDULE"
