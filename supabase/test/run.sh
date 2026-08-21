#!/usr/bin/env bash
# Run the Joint Posts database checks against a throwaway local Postgres.
#
# The sandbox cannot reach Supabase, and the lock and version checks are the
# whole safety model for joint sims -- so they get tested here, against a real
# Postgres, rather than being reasoned about. What this does NOT prove is
# anything about Supabase itself: PostgREST, the JWT, or the hosted auth
# schema. It proves the SQL logic and the policies.
#
#   supabase/test/run.sh
#
# Needs postgresql-16 binaries on the machine. Leaves nothing behind.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
WORK=$(mktemp -d)
PORT=${PGPORT:-5433}

# initdb refuses to run as root, so when we are root the cluster runs as a
# throwaway unprivileged user instead.
RUNAS=""
if [ "$(id -u)" = "0" ]; then
  id pgtest >/dev/null 2>&1 || useradd -M pgtest
  chown pgtest "$WORK"; chmod 755 "$WORK"
  RUNAS="pgtest"
fi
run() { if [ -n "$RUNAS" ]; then su "$RUNAS" -s /bin/sh -c "$1"; else sh -c "$1"; fi; }

cleanup() {
  run "$PGBIN/pg_ctl -D $WORK/pg stop -m immediate" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

mkdir -p "$WORK/pg" "$WORK/sock"
[ -n "$RUNAS" ] && chown "$RUNAS" "$WORK/pg" "$WORK/sock"
run "$PGBIN/initdb -D $WORK/pg -U postgres --auth=trust" >/dev/null
run "$PGBIN/pg_ctl -D $WORK/pg -o '-k $WORK/sock -p $PORT -c listen_addresses=' -l $WORK/pg/pg.log start -w" >/dev/null

psql() { command psql -h "$WORK/sock" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 "$@"; }

echo "· standing in for the Supabase-only bits"
psql -q -f "$HERE/harness.sql" >/dev/null
# Errors here are shown, not swallowed. An earlier version piped this to
# /dev/null and a schema that would not apply looked exactly like a schema that
# applied cleanly.
apply() {
  local out
  if ! out=$(psql -q -f "$HERE/../schema.sql" 2>&1); then
    echo "$out" | grep -v NOTICE | tail -20
    return 1
  fi
}
echo "· applying schema.sql"
apply || { echo "schema.sql failed to apply"; exit 1; }
echo "· applying it a second time (it must be re-runnable)"
apply || { echo "schema.sql is not re-runnable"; exit 1; }
echo "· running the joint-post checks"
echo

out=$(psql -q -f "$HERE/jp_test.sql" 2>&1) || { echo "$out" | tail -20; exit 1; }
echo "$out" | grep -E 'PASS|FAIL|passed' | sed 's/^psql.*NOTICE:  //'

if echo "$out" | grep -q FAIL; then exit 1; fi
echo
echo "$(echo "$out" | grep -c PASS) checks passed."
