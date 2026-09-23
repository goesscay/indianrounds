#!/usr/bin/env bash
# Runs on the production server as the `deploy` user. Called by .github/workflows/deploy.yml:
#   deploy.sh <source-tarball> <version> <commit-sha>
# Backs up the database and current code, ships the new code, migrates, rebuilds, restarts,
# health-checks, and rolls the code back automatically if the health check fails.
set -euo pipefail

APP=/srv/indianrounds
BACKUPS=/srv/backups
SITE_URL=${SITE_URL:-https://indianrounds.in}
TARBALL=${1:?source tarball}
VERSION=${2:?version}
SHA=${3:?commit sha}
TS=$(date +%Y%m%d-%H%M%S)

log() { echo "[deploy $VERSION] $*"; }

if [ -f "$APP/VERSION" ] && [ "$(sed -n 2p "$APP/VERSION")" = "$SHA" ] && [ "${FORCE:-0}" != "1" ]; then
  log "commit $SHA is already deployed, nothing to do"
  exit 0
fi

env_get() { grep -E "^$1=" "$APP/apps/api/.env" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }

install_and_build() {
  (cd "$APP/apps/api" && composer install --no-dev --optimize-autoloader --no-interaction --quiet)
  (cd "$APP/apps/web" && pnpm install --frozen-lockfile --silent && pnpm build >/tmp/ir-web-build.log 2>&1) || { tail -30 /tmp/ir-web-build.log; return 1; }
}

restart_services() {
  (cd "$APP/apps/api" && php artisan config:cache && php artisan route:cache && php artisan event:cache) >/dev/null
  sudo /usr/bin/systemctl reload php8.5-fpm
  sudo /usr/bin/systemctl restart indianrounds-queue
  sudo /usr/bin/systemctl restart indianrounds-web
}

healthy() {
  for _ in $(seq 1 30); do
    if curl -fsS "$SITE_URL/api/v1/health" | grep -q '"status":"ok"' && curl -fsS -o /dev/null "$SITE_URL/"; then
      return 0
    fi
    sleep 2
  done
  return 1
}

mkdir -p "$BACKUPS"

log "backing up database"
PGPASSWORD="$(env_get DB_PASSWORD)" pg_dump -h "$(env_get DB_HOST)" -p "$(env_get DB_PORT)" -U "$(env_get DB_USERNAME)" -Fc "$(env_get DB_DATABASE)" -f "$BACKUPS/db-$TS.dump"

log "backing up current code"
PREV_CODE="$BACKUPS/code-$TS.tgz"
tar -czf "$PREV_CODE" -C "$APP" \
  --exclude=node_modules --exclude=vendor --exclude=.next --exclude=storage \
  --exclude=bootstrap/cache --exclude=.env --exclude=.env.local .

log "shipping new code"
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
tar -xzf "$TARBALL" -C "$STAGE"
rsync -a --delete \
  --exclude=node_modules --exclude=vendor --exclude=.next --exclude=storage \
  --exclude=bootstrap/cache --exclude=.env --exclude=.env.local --exclude=VERSION \
  "$STAGE"/ "$APP"/

rollback() {
  log "FAILED: rolling code back to the previous release (database is not rolled back; restore $BACKUPS/db-$TS.dump only if a migration broke it)"
  local R; R=$(mktemp -d)
  tar -xzf "$PREV_CODE" -C "$R"
  rsync -a --delete \
    --exclude=node_modules --exclude=vendor --exclude=.next --exclude=storage \
    --exclude=bootstrap/cache --exclude=.env --exclude=.env.local --exclude=VERSION \
    "$R"/ "$APP"/
  rm -rf "$R"
  install_and_build && restart_services || true
  if healthy; then log "rollback OK, previous release is serving again"; else log "rollback did not restore health, manual attention needed"; fi
}

log "installing dependencies and building"
if ! install_and_build; then rollback; exit 1; fi

log "migrating"
if ! (cd "$APP/apps/api" && php artisan migrate --force); then rollback; exit 1; fi

log "restarting services"
restart_services

log "health check"
if ! healthy; then rollback; exit 1; fi

printf '%s\n%s\n' "$VERSION" "$SHA" > "$APP/VERSION"
ls -1t "$BACKUPS"/db-*.dump 2>/dev/null | tail -n +11 | xargs -r rm -f
ls -1t "$BACKUPS"/code-*.tgz 2>/dev/null | tail -n +11 | xargs -r rm -f
log "deployed $VERSION ($SHA)"
