#!/usr/bin/env bash
# End-to-end test: real PostgreSQL (all migrations + RLS) + local Supabase API
# stand-in + production Next.js build, driven through the UI with Playwright.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
WORK="$(mktemp -d)"
PGPORT=54998
API_PORT=54321
APP_PORT=3100
PIDS=()
RUN_AS=""
if [ "$(id -u)" = "0" ]; then
  id pgtest >/dev/null 2>&1 || useradd -M pgtest
  chown -R pgtest "$WORK"
  RUN_AS="runuser -u pgtest --"
fi
cleanup() {
  for pid in "${PIDS[@]:-}"; do kill -- "-$pid" >/dev/null 2>&1 || kill "$pid" >/dev/null 2>&1 || true; done
  $RUN_AS "$PGBIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

$RUN_AS "$PGBIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
$RUN_AS "$PGBIN/pg_ctl" -D "$WORK/data" -o "-p $PGPORT -k $WORK -c listen_addresses=127.0.0.1" -l "$WORK/pg.log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
PSQL=("$PGBIN/psql" -h 127.0.0.1 -p "$PGPORT" -U postgres -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -c "create database atlas_e2e" >/dev/null
"${PSQL[@]}" -d atlas_e2e -f "$ROOT/scripts/db-test/supabase-stubs.sql"
"${PSQL[@]}" -d atlas_e2e -c "alter table auth.users add column encrypted_password text"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -d atlas_e2e -f "$f"; done
echo "→ database ready"

DATABASE_URL="postgres://postgres@127.0.0.1:$PGPORT/atlas_e2e" PORT=$API_PORT setsid node "$ROOT/scripts/e2e/fake-supabase.mjs" > "$WORK/api.log" 2>&1 &
PIDS+=($!)

export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:$API_PORT"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_atlas_e2e_local"
export NEXT_PUBLIC_SITE_URL="http://127.0.0.1:$APP_PORT"
cd "$ROOT"
if [ -n "${E2E_DEV:-}" ]; then
  setsid npx next dev -p "$APP_PORT" -H 127.0.0.1 > "$WORK/next.log" 2>&1 &
  PIDS+=($!)
elif [ "${SKIP_BUILD:-0}" != "1" ]; then npx next build > "$WORK/build.log" 2>&1 || { tail -40 "$WORK/build.log"; exit 1; }; fi
if [ -z "${E2E_DEV:-}" ]; then
  setsid npx next start -p "$APP_PORT" -H 127.0.0.1 > "$WORK/next.log" 2>&1 &
  PIDS+=($!)
fi
for _ in $(seq 1 180); do curl -sf "http://127.0.0.1:$APP_PORT/login" >/dev/null && break; sleep 1; done
echo "→ app ready"

trap 'if [ -n "${E2E_TRACE:-}" ]; then cp "$WORK/api.log" "${E2E_TRACE}"; cp "$WORK/next.log" "${E2E_TRACE}.next"; fi; cleanup' EXIT
APP_URL="http://127.0.0.1:$APP_PORT" node "${FLOWS_FILE:-$ROOT/scripts/e2e/flows.mjs}" || { echo "--- next.log"; tail -40 "$WORK/next.log"; echo "--- api.log"; tail -20 "$WORK/api.log"; exit 1; }
