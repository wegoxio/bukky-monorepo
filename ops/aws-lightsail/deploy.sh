#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "$0")"

release_sha="${1:-}"
if [[ ! "$release_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: ./deploy.sh <full-git-sha>" >&2
  exit 2
fi

test -f .env.production
chmod 600 .env.production

previous_sha="$(sed -n 's/^RELEASE_SHA=//p' .env.production | head -n1)"
if grep -q '^RELEASE_SHA=' .env.production; then
  sed -i "s/^RELEASE_SHA=.*/RELEASE_SHA=${release_sha}/" .env.production
else
  printf '\nRELEASE_SHA=%s\n' "$release_sha" >> .env.production
fi

docker compose --env-file .env.production --profile operations --profile worker pull backend frontend worker migrate seed-superadmin
docker compose --env-file .env.production --profile operations run --rm migrate
docker compose --env-file .env.production --profile operations run --rm seed-superadmin
docker compose --env-file .env.production --profile worker up -d --remove-orphans --wait
docker compose --env-file .env.production --profile worker ps

if [[ -n "$previous_sha" && "$previous_sha" != "$release_sha" ]]; then
  printf '%s\n' "$previous_sha" > .previous-release
fi

docker image prune -f --filter "until=168h" >/dev/null
