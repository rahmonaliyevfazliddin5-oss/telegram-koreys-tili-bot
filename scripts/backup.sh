#!/bin/sh
set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/course_bot_db_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "Zaxira nusxasi olinmoqda: ${BACKUP_FILE}"
docker exec course_bot_postgres pg_dump -U postgres course_bot_db | gzip > "${BACKUP_FILE}"

# 7 kundan eski zaxira nusxalarini o'chirish
find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +7 -delete

echo "Zaxira nusxasi muvaffaqiyatli saqlandi."
