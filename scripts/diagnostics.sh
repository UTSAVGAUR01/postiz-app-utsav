#!/usr/bin/env sh
set -eu

mkdir -p test-reports
report="test-reports/diagnostics-$(date +%Y%m%d-%H%M%S).log"
{
  printf 'Postiz diagnostics: %s\n\n' "$(date -Iseconds)"
  printf 'COMPOSE STATUS\n'
  docker compose ps
  printf '\nRESOURCE USAGE\n'
  docker stats --no-stream $(docker compose ps -q) 2>&1 || true
  for service in postgres redis temporal temporal-ui postiz; do
    printf '\nLOGS: %s\n' "$service"
    docker compose logs --no-color --tail=200 "$service" 2>&1 || true
  done
} > "$report"
printf 'Diagnostic report: %s\n' "$report"
