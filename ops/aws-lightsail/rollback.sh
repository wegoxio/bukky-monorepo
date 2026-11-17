#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "$0")"
target_sha="${1:-$(cat .previous-release 2>/dev/null || true)}"

if [[ ! "$target_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: ./rollback.sh <full-git-sha>" >&2
  exit 2
fi

./deploy.sh "$target_sha"
