#!/usr/bin/env bash
set -euo pipefail

# SnapCal AI — PostgreSQL backup to S3-compatible storage
# Usage: backup-db.sh [retention-days]
# Environment: S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, DATABASE_URL

RETENTION_DAYS="${1:-7}"
TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
DUMP_NAME="snapcal-main-${TIMESTAMP}.sql.gz"
DUMP_PATH="/tmp/${DUMP_NAME}"

# Validate env
: "${DATABASE_URL:?DATABASE_URL is not set}"
: "${S3_ENDPOINT:?S3_ENDPOINT is not set}"
: "${S3_BUCKET:?S3_BUCKET is not set}"
: "${S3_ACCESS_KEY:?S3_ACCESS_KEY is not set}"
: "${S3_SECRET_KEY:?S3_SECRET_KEY is not set}"

# Run pg_dump and compress
pg_dump "${DATABASE_URL}" --clean --if-exists | gzip > "${DUMP_PATH}"

# Upload to S3/Spaces using s3cmd or aws-cli
if command -v aws &> /dev/null; then
  export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}"
  export AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}"
  aws s3 cp "${DUMP_PATH}" "s3://${S3_BUCKET}/backups/${DUMP_NAME}" --endpoint-url="${S3_ENDPOINT}"
else
  echo "aws CLI not installed" >&2
  exit 1
fi

# Cleanup local temp
rm -f "${DUMP_PATH}"

# Cleanup old backups on S3
aws s3 ls "s3://${S3_BUCKET}/backups/" --endpoint-url="${S3_ENDPOINT}" | \
  awk '{print $4}' | \
  grep -E '^snapcal-main-[0-9]{8}-[0-9]{6}\.sql\.gz$' | \
  sort | \
  head -n -"${RETENTION_DAYS}" | \
  while read -r old; do
    echo "Removing old backup: ${old}"
    aws s3 rm "s3://${S3_BUCKET}/backups/${old}" --endpoint-url="${S3_ENDPOINT}"
  done

echo "Backup completed: ${DUMP_NAME}"
