#!/usr/bin/env bash
# Nightly backup of the Indian Rounds data that cannot be rebuilt: the PostgreSQL database and the
# private uploads (résumés). Run from cron on the API host, e.g.:
#   15 2 * * *  /srv/indianrounds/scripts/backup.sh >> /var/log/indianrounds-backup.log 2>&1
#
# Required environment (put them in /etc/indianrounds-backup.env and `source` it from cron):
#   PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE   standard libpq variables
#   BACKUP_DIR        where dumps are written (a directory that is itself copied off the server)
#   UPLOADS_DIR       apps/api/storage/app/private   (résumés)
# Optional:
#   RETENTION_DAYS    default 30
#   OFFSITE_CMD       command that copies "$1" off the machine, e.g. 'aws s3 cp "$1" s3://bucket/ir/'
#                     A backup that lives only on the database server is not a backup.
set -euo pipefail

: "${BACKUP_DIR:?set BACKUP_DIR}" "${PGDATABASE:?set PGDATABASE}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"

db_file="$BACKUP_DIR/db-$stamp.dump"
echo "[$stamp] dumping database $PGDATABASE"
# Custom format: compressed, and lets pg_restore restore selected tables.
pg_dump --format=custom --no-owner --file="$db_file"
# Refuse to call a truncated dump a success.
pg_restore --list "$db_file" > /dev/null
[ "$(stat -c %s "$db_file")" -gt 1024 ] || { echo "dump is suspiciously small"; exit 1; }

if [ -n "${UPLOADS_DIR:-}" ] && [ -d "$UPLOADS_DIR" ]; then
  up_file="$BACKUP_DIR/uploads-$stamp.tar.gz"
  tar -czf "$up_file" -C "$UPLOADS_DIR" .
fi

for f in "$db_file" "${up_file:-}"; do
  [ -n "$f" ] || continue
  sha256sum "$f" > "$f.sha256"
  if [ -n "${OFFSITE_CMD:-}" ]; then
    set -- "$f"; eval "$OFFSITE_CMD"
    set -- "$f.sha256"; eval "$OFFSITE_CMD"
  fi
done

# Local retention only; the off-site bucket should have its own lifecycle rule.
find "$BACKUP_DIR" -type f \( -name 'db-*' -o -name 'uploads-*' \) -mtime +"$RETENTION_DAYS" -delete
echo "[$stamp] backup complete: $(basename "$db_file")"
