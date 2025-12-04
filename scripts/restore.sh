#!/bin/bash

# Restore script for contractor CRM database

# Configuration
DB_PATH="./database/production.db"
BACKUP_DIR="/backups/contractor-crm"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lht "$BACKUP_DIR"/*.db.gz 2>/dev/null | head -20
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Create a safety backup of current database
if [ -f "$DB_PATH" ]; then
    echo "Creating safety backup of current database..."
    cp "$DB_PATH" "${DB_PATH}.before_restore_$(date +%Y%m%d_%H%M%S)"
fi

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Decompressing backup..."
    TEMP_FILE="/tmp/restore_temp.db"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    RESTORE_FILE="$TEMP_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Restore the database
echo "Restoring database from $BACKUP_FILE..."
cp "$RESTORE_FILE" "$DB_PATH"

# Fix permissions
chmod 666 "$DB_PATH"

# Cleanup temp file if created
[ -f "$TEMP_FILE" ] && rm "$TEMP_FILE"

# Verify the restored database
echo "Verifying restored database..."
sqlite3 "$DB_PATH" "PRAGMA integrity_check;"

if [ $? -eq 0 ]; then
    echo "Database restored successfully!"
    echo "Database size: $(ls -lh $DB_PATH | awk '{print $5}')"
else
    echo "Error: Database integrity check failed!"
    exit 1
fi