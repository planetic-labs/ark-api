#!/usr/bin/env bash
# Validate or apply an Ark PostgreSQL, Redis, uploads, and configuration snapshot.
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SNAPSHOT="latest"
APPLY=0
RESTIC_RETRY_LOCK="${RESTIC_RETRY_LOCK:-5m}"
for argument in "$@"; do
    case "$argument" in
        --apply) APPLY=1 ;;
        -h|--help) echo "Usage: $0 [snapshot-id] [--apply]"; exit 0 ;;
        *) SNAPSHOT="$argument" ;;
    esac
done

if [[ -f "$PROJECT_ROOT/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.env"
    set +a
fi

compose=()
if docker compose version >/dev/null 2>&1; then compose=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then compose=(docker-compose)
else echo "ERROR: Docker Compose is required." >&2; exit 1
fi
for required_command in restic python3; do
    command -v "$required_command" >/dev/null 2>&1 || {
        echo "ERROR: $required_command is not installed." >&2; exit 1;
    }
done
if [[ -z "${RESTIC_REPOSITORY:-}" || -z "${RESTIC_PASSWORD:-}" ]]; then
    echo "ERROR: RESTIC_REPOSITORY and RESTIC_PASSWORD must be set in .env." >&2; exit 1
fi
if [[ -z "${S3_ACCESS_KEY:-}" || -z "${S3_SECRET_KEY:-}" ]]; then
    echo "ERROR: S3_ACCESS_KEY and S3_SECRET_KEY must be set in .env." >&2; exit 1
fi
export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY"
[[ -z "${S3_REGION_NAME:-}" ]] || export AWS_DEFAULT_REGION="$S3_REGION_NAME"

mkdir -p "$PROJECT_ROOT/tmp"
RESTORE_DIR="$(mktemp -d "$PROJECT_ROOT/tmp/restic-restore.XXXXXX")"
chmod 700 "$RESTORE_DIR"
ROLLBACK_DIR="$RESTORE_DIR/rollback"
SERVICES_STOPPED=0
APPLY_STARTED=0
APPLY_FINISHED=0
ROLLBACK_READY=0

find_restored_file() { find "$RESTORE_DIR" -path "*/tmp/restic-backup/$1" -type f -print -quit; }
find_restored_dir() { find "$RESTORE_DIR" -path "*/tmp/restic-backup/$1" -type d -print -quit; }
restore_volume_contents() {
    local service="$1" source="$2" destination="$3"
    "${compose[@]}" run --rm --no-deps --user root \
        -v "$source:/restore:ro" --entrypoint sh "$service" \
        -c "find '$destination' -mindepth 1 -delete && cp -a /restore/. '$destination/'"
}
rollback_live_data() {
    echo "ERROR: Restore failed; rolling live data back..." >&2
    set +e
    "${compose[@]}" exec -T db pg_restore \
        --clean --if-exists --exit-on-error --single-transaction \
        -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-ark}" < "$ROLLBACK_DIR/postgres.dump"
    restore_volume_contents api "$ROLLBACK_DIR/uploads" /app/static/uploads
    restore_volume_contents redis "$ROLLBACK_DIR/redis" /data
    if [[ -f "$ROLLBACK_DIR/project.env" ]]; then
        install -m 600 "$ROLLBACK_DIR/project.env" "$PROJECT_ROOT/.env.rollback"
        mv -f "$PROJECT_ROOT/.env.rollback" "$PROJECT_ROOT/.env"
    else
        rm -f "$PROJECT_ROOT/.env"
    fi
    set -e
}
finish() {
    local status=$?
    trap - EXIT
    if [[ "$status" -ne 0 && "$APPLY_STARTED" -eq 1 && "$APPLY_FINISHED" -eq 0 && "$ROLLBACK_READY" -eq 1 ]]; then
        rollback_live_data
    fi
    if [[ "$SERVICES_STOPPED" -eq 1 ]]; then
        "${compose[@]}" up -d redis api worker >/dev/null || true
    fi
    rm -rf "$RESTORE_DIR"
    exit "$status"
}
trap finish EXIT

# Removes only locks restic itself identifies as stale; active locks remain intact.
restic unlock >/dev/null
echo "Available Ark snapshots:"
restic snapshots --retry-lock "$RESTIC_RETRY_LOCK" --host ark-api-dev --tag ark-api
echo "Restoring snapshot '$SNAPSHOT' into protected staging..."
if [[ "$SNAPSHOT" == latest ]]; then
    restic restore latest --retry-lock "$RESTIC_RETRY_LOCK" --host ark-api-dev \
        --tag ark-api --verify --target "$RESTORE_DIR"
else
    snapshot_json="$(restic snapshots --retry-lock "$RESTIC_RETRY_LOCK" \
        --json --host ark-api-dev --tag ark-api "$SNAPSHOT")"
    python3 -c 'import json,sys; raise SystemExit(len(json.load(sys.stdin)) != 1)' \
        <<< "$snapshot_json" || { echo "ERROR: '$SNAPSHOT' is not exactly one Ark snapshot." >&2; exit 1; }
    restic restore "$SNAPSHOT" --retry-lock "$RESTIC_RETRY_LOCK" --verify --target "$RESTORE_DIR"
fi

DUMP_PATH="$(find_restored_file ark.postgres.dump)"
UPLOADS_PATH="$(find_restored_dir uploads)"
REDIS_DUMP_PATH="$(find_restored_file redis/dump.rdb)"
ENV_PATH="$(find_restored_file .env)"
if [[ -z "$DUMP_PATH" || ! -s "$DUMP_PATH" || -z "$UPLOADS_PATH" ]]; then
    echo "ERROR: Snapshot is incomplete; PostgreSQL and uploads are required." >&2; exit 1
fi
"${compose[@]}" run --rm --no-deps -T db pg_restore --list < "$DUMP_PATH" >/dev/null
if [[ -n "$REDIS_DUMP_PATH" && -s "$REDIS_DUMP_PATH" ]]; then
    "${compose[@]}" run --rm --no-deps -v "$REDIS_DUMP_PATH:/restore/dump.rdb:ro" \
        --entrypoint redis-check-rdb redis /restore/dump.rdb >/dev/null
else
    echo "WARNING: Legacy snapshot has no Redis dump; existing Redis data will be kept."
    REDIS_DUMP_PATH=""
fi
echo "Snapshot preflight passed. No live data has been changed."
if [[ "$APPLY" -ne 1 ]]; then
    echo "Validation completed; protected staging data will now be removed."
    exit 0
fi

read -r -p "Type RESTORE to replace PostgreSQL, Redis, uploads, and .env: " CONFIRM
[[ "$CONFIRM" == RESTORE ]] || { echo "Restore cancelled."; exit 0; }
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-ark}"
mkdir -p "$ROLLBACK_DIR/uploads" "$ROLLBACK_DIR/redis"
chmod 700 "$ROLLBACK_DIR"
echo "Creating rollback copy of current live data..."
"${compose[@]}" exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    --format=custom --no-owner --no-privileges > "$ROLLBACK_DIR/postgres.dump"
test -s "$ROLLBACK_DIR/postgres.dump"
API_CONTAINER_ID="$("${compose[@]}" ps -q api)"
REDIS_CONTAINER_ID="$("${compose[@]}" ps -q redis)"
test -n "$API_CONTAINER_ID" && test -n "$REDIS_CONTAINER_ID"
docker cp "$API_CONTAINER_ID:/app/static/uploads/." "$ROLLBACK_DIR/uploads/"
docker exec "$REDIS_CONTAINER_ID" redis-cli --rdb /tmp/ark-rollback.rdb >/dev/null
docker cp "$REDIS_CONTAINER_ID:/tmp/ark-rollback.rdb" "$ROLLBACK_DIR/redis/dump.rdb"
docker exec "$REDIS_CONTAINER_ID" rm -f /tmp/ark-rollback.rdb
[[ ! -f "$PROJECT_ROOT/.env" ]] || cp -a "$PROJECT_ROOT/.env" "$ROLLBACK_DIR/project.env"
ROLLBACK_READY=1

echo "Stopping API, worker, and Redis..."
"${compose[@]}" stop api worker redis >/dev/null
SERVICES_STOPPED=1
APPLY_STARTED=1
echo "Restoring PostgreSQL atomically..."
"${compose[@]}" exec -T db pg_restore --clean --if-exists --exit-on-error \
    --single-transaction -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$DUMP_PATH"
echo "Restoring uploads..."
restore_volume_contents api "$UPLOADS_PATH" /app/static/uploads
if [[ -n "$REDIS_DUMP_PATH" ]]; then
    echo "Restoring Redis..."
    mkdir -p "$RESTORE_DIR/redis-volume"
    cp "$REDIS_DUMP_PATH" "$RESTORE_DIR/redis-volume/dump.rdb"
    restore_volume_contents redis "$RESTORE_DIR/redis-volume" /data
fi
if [[ -n "$ENV_PATH" && -s "$ENV_PATH" ]]; then
    echo "Restoring project configuration..."
    install -m 600 "$ENV_PATH" "$PROJECT_ROOT/.env.restore"
    mv -f "$PROJECT_ROOT/.env.restore" "$PROJECT_ROOT/.env"
fi
echo "Starting Redis, API, and worker..."
"${compose[@]}" up -d redis api worker
SERVICES_STOPPED=0
APPLY_FINISHED=1
echo "Restore completed; staging and rollback data will now be removed."
