#!/usr/bin/env bash
# Applies every migration to a throwaway PostgreSQL cluster and runs the RLS /
# search tests. Requires PostgreSQL 15+ binaries (initdb, pg_ctl, psql).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
WORK="$(mktemp -d)"
PORT="${PGPORT_TEST:-54999}"
RUN_AS=""
if [ "$(id -u)" = "0" ]; then
  id pgtest >/dev/null 2>&1 || useradd -M pgtest
  chown -R pgtest "$WORK"
  RUN_AS="runuser -u pgtest --"
fi
cleanup() { "$PGBIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT


$RUN_AS "$PGBIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
$RUN_AS "$PGBIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$WORK" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -c "create database atlas_test" >/dev/null
"${PSQL[@]}" -d atlas_test -f "$ROOT/scripts/db-test/supabase-stubs.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ $(basename "$f")"
  "${PSQL[@]}" -d atlas_test -f "$f"
done
echo "→ re-running latest migration (idempotency)"
"${PSQL[@]}" -d atlas_test -f "$(ls "$ROOT"/supabase/migrations/*.sql | tail -1)"
echo "→ tests"
"${PSQL[@]}" -d atlas_test -f "$ROOT/scripts/db-test/tests.sql"
echo "All database tests passed."
