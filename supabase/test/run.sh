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
# THE UPGRADE PATH, which is the one that actually breaks. Applying this file
# to an EMPTY database proves nothing about applying it to a database that has
# already run an EARLIER version of it -- and every real database is the second
# kind. A change to a function's return type passes a from-scratch test and then
# fails in the Supabase SQL editor with "cannot change return type of existing
# function".
#
# EACH prior version is tested ON ITS OWN, from a clean database, with the
# current file applied on top. Replaying them in sequence does not work: the
# newest prior already has the current shape, so the upgrade being tested is a
# no-op and the check passes while the real upgrade fails.
reset_db() {
  psql -q -c "drop schema if exists public cascade; create schema public;" >/dev/null 2>&1
  psql -q -c "drop schema if exists auth cascade; drop schema if exists storage cascade;" >/dev/null 2>&1
  psql -q -f "$HERE/harness.sql" >/dev/null 2>&1
}

PRIORS=$(cd "$HERE/.." && git log --format=%H --reverse -- schema.sql 2>/dev/null)
if [ -n "$PRIORS" ]; then
  n=0
  for sha in $PRIORS; do
    (cd "$HERE/.." && git show "$sha:supabase/schema.sql" > "$WORK/prior.sql" 2>/dev/null) || continue
    reset_db
    # A prior version that will not apply to a clean database is not a version
    # anybody upgraded FROM, so it is not an upgrade path worth testing.
    psql -q -f "$WORK/prior.sql" >/dev/null 2>&1 || continue
    n=$((n + 1))
    if ! out=$(psql -q -f "$HERE/../schema.sql" 2>&1); then
      echo "· UPGRADE FAILS from schema.sql as of ${sha}"
      echo "$out" | grep -v NOTICE | grep -i error | head -4
      echo
      echo "  This is what breaks in the Supabase SQL editor. A database that has"
      echo "  already run that version cannot take the current file."
      exit 1
    fi
  done
  echo "· upgrades from $n earlier version(s) of schema.sql apply cleanly"
fi

reset_db
echo "· applying schema.sql to a clean database"
psql -q -c "drop schema public cascade; create schema public; grant usage on schema public to anon, authenticated;" >/dev/null 2>&1
psql -q -f "$HERE/harness.sql" >/dev/null 2>&1
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
