#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "$0")"

read_env() {
  local key="$1"
  sed -n "s/^${key}=//p" .env.production | tail -n1 | tr -d '\r'
}

DB_USER="$(read_env DB_USER)"
DB_NAME="$(read_env DB_NAME)"
BACKUP_S3_URI="$(read_env BACKUP_S3_URI)"
AWS_ACCESS_KEY_ID="$(read_env AWS_ACCESS_KEY_ID)"
AWS_SECRET_ACCESS_KEY="$(read_env AWS_SECRET_ACCESS_KEY)"
AWS_REGION="$(read_env AWS_REGION)"

: "${DB_USER:?DB_USER is required}"
: "${DB_NAME:?DB_NAME is required}"
: "${BACKUP_S3_URI:?BACKUP_S3_URI is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"
: "${AWS_REGION:?AWS_REGION is required}"
export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="/tmp/bukky-${timestamp}.dump.gz"
trap 'rm -f "$backup_file"' EXIT

docker compose --env-file .env.production exec -T postgres \
  pg_dump --format=custom --no-owner --no-acl --username="$DB_USER" "$DB_NAME" \
  | gzip -9 > "$backup_file"

test -s "$backup_file"
aws s3 cp "$backup_file" "${BACKUP_S3_URI%/}/$(basename "$backup_file")" \
  --only-show-errors \
  --sse AES256

echo "Backup uploaded: ${BACKUP_S3_URI%/}/$(basename "$backup_file")"
