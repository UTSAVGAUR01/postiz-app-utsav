#!/usr/bin/env sh
set -eu

if [ ! -f .env ]; then
  cp .env.example .env
  postgres_secret="$(openssl rand -hex 24)"
  jwt_secret="$(openssl rand -hex 32)"
  sed -i "s/change_this_postgres_password/$postgres_secret/" .env
  sed -i "s/change_this_to_a_long_random_secret_at_least_32_characters/$jwt_secret/" .env
fi

docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps

./scripts/smoke-test.sh

printf '\nPostiz:      http://localhost:4007\n'
printf 'Temporal UI: http://localhost:8082\n'
