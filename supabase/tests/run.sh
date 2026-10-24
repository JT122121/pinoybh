#!/usr/bin/env bash
# Runs the migration and the trust & safety tests against a throwaway
# local Postgres. Needs Postgres binaries (initdb, pg_ctl, psql) on PATH
# or in /usr/lib/postgresql/*/bin.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
pgbin="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
export PATH="${pgbin:+$pgbin:}$PATH"
tmp="$(mktemp -d)"
port=54329
trap 'as_pg pg_ctl -D "$tmp/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$tmp"' EXIT

# Postgres refuses to run as root (e.g. in CI containers).
as_pg() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$tmp" && chmod 755 "$tmp"
as_pg initdb -D "$tmp/data" -U postgres --auth=trust >/dev/null
as_pg pg_ctl -D "$tmp/data" -o "-p $port -k $tmp -c listen_addresses=''" -l "$tmp/log" start >/dev/null
psql_() { psql -X -q -v ON_ERROR_STOP=1 -h "$tmp" -p "$port" -U postgres "$@"; }

# Run twice: as a new Supabase project (no default grants) and as an older
# one (everything in public granted by default).
for mode in new legacy; do
  echo "== Supabase project type: $mode"
  psql_ -c "create database pinoybh_$mode" postgres
  psql_ -d "pinoybh_$mode" -f "$here/bootstrap.sql"
  [ "$mode" = legacy ] && psql_ -d "pinoybh_$mode" -f "$here/legacy_defaults.sql"
  for f in "$here"/../migrations/*.sql; do
    case "$f" in *storage*) continue ;; esac # Storage schema only exists on Supabase
    psql_ -d "pinoybh_$mode" -f "$f"
  done
  psql_ -d "pinoybh_$mode" -t -o /dev/null -f "$here/trust_safety.sql" 2>&1 | sed "s/^psql:[^ ]* NOTICE:  /  /"
done
echo "All database tests passed."
