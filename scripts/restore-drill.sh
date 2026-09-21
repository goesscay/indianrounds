#!/usr/bin/env bash
# Restore drill: proves a backup can actually be restored and that the money tables reconcile.
# Restores into a THROWAWAY database, never the live one. Do this once before launch and then quarterly.
#
#   PGHOST=... PGUSER=... PGPASSWORD=... ./scripts/restore-drill.sh /path/to/db-YYYYMMDDTHHMMSSZ.dump
#
# The role needs CREATEDB. The scratch database is dropped at the end.
set -euo pipefail

dump="${1:?usage: restore-drill.sh <db-dump-file>}"
scratch="ir_restore_drill_$(date +%s)"
trap 'dropdb --if-exists "$scratch" >/dev/null 2>&1 || true' EXIT

sha="$dump.sha256"
[ -f "$sha" ] && sha256sum --check "$sha"

createdb "$scratch"
pg_restore --no-owner --dbname="$scratch" "$dump"

q() { psql --no-align --tuples-only --dbname="$scratch" --command="$1"; }

echo "users:                 $(q 'select count(*) from users')"
echo "bookings:              $(q 'select count(*) from bookings')"
echo "paid milestones:       $(q "select count(*) from payment_milestones where status='paid'")"
echo "audit log rows:        $(q 'select count(*) from audit_logs')"

# Reconciliation: a confirmed booking must have at least one paid milestone (or be fully covered by a credit note),
# and no batch may carry more booked seats than its capacity.
bad_confirmed="$(q "select count(*) from bookings b where b.status='confirmed' and b.credit_applied = 0 and not exists (select 1 from payment_milestones m where m.booking_id=b.id and m.status='paid')")"
oversold="$(q 'select count(*) from batches where seats_booked > capacity')"
echo "confirmed without payment: $bad_confirmed (expected 0)"
echo "oversold batches:          $oversold (expected 0)"

[ "$bad_confirmed" = "0" ] && [ "$oversold" = "0" ] && echo "RESTORE DRILL PASSED" || { echo "RESTORE DRILL FAILED"; exit 1; }
