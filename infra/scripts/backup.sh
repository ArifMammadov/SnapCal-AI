#!/bin/bash
set -e

# Database backup
BACKUP_DIR=/opt/snapcal/backups
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker exec snapcal_postgres_1 pg_dump -U snapcal snapcal | gzip > $BACKUP_DIR/snapcal_$DATE.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -name "snapcal_*.sql.gz" -mtime +7 -delete

echo "Backup created: $BACKUP_DIR/snapcal_$DATE.sql.gz"
