#!/usr/bin/env sh
set -eu

max_attempts="${SMOKE_MAX_ATTEMPTS:-36}"
attempt=1

printf 'Waiting for the Postiz test stack'
while [ "$attempt" -le "$max_attempts" ]; do
  unhealthy="$(docker compose ps --format json 2>/dev/null | grep -E '"Health":"(unhealthy|starting)"|"State":"(exited|dead|restarting)"' || true)"
  running="$(docker compose ps --services --status running | wc -l | tr -d ' ')"
  if [ -z "$unhealthy" ] && [ "$running" -ge 5 ]; then
    break
  fi
  printf '.'
  sleep 5
  attempt=$((attempt + 1))
done
printf '\n'

if [ "$attempt" -gt "$max_attempts" ]; then
  printf 'ERROR: services did not become healthy in time.\n' >&2
  docker compose ps
  exit 1
fi

docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose exec -T redis redis-cli ping | grep -q PONG

postiz_port="${POSTIZ_PORT:-4007}"
http_code="$(curl -sS -o /dev/null -w '%{http_code}' "http://localhost:${postiz_port}/auth")"
if [ "$http_code" != "200" ]; then
  printf 'ERROR: Postiz returned HTTP %s instead of 200.\n' "$http_code" >&2
  exit 1
fi

printf 'PASS: PostgreSQL, Redis, Temporal, Postiz, and HTTP checks succeeded.\n'
