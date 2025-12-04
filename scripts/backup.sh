#!/bin/bash

# Backup script for contractor CRM database

# Configuration
DB_PATH="./database/production.db"
BACKUP_DIR="/backups/contractor-crm"
RETENTION_DAYS=30
MAX_BACKUPS=50

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/production_${TIMESTAMP}.db"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database file not found at $DB_PATH"
    exit 1
fi

# Create backup using SQLite backup command (safer for active databases)
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
    # Compress the backup
    gzip "$BACKUP_FILE"
    echo "Backup created successfully: ${BACKUP_FILE}.gz"
    
    # Calculate backup size
    SIZE=$(ls -lh "${BACKUP_FILE}.gz" | awk '{print $5}')
    echo "Backup size: $SIZE"
    
    # Remove old backups (older than RETENTION_DAYS)
    find "$BACKUP_DIR" -name "production_*.db.gz" -mtime +$RETENTION_DAYS -delete
    
    # Keep only the latest MAX_BACKUPS
    ls -t "$BACKUP_DIR"/production_*.db.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm
    
    echo "Cleanup completed. Kept last $MAX_BACKUPS backups and removed backups older than $RETENTION_DAYS days"
else
    echo "Error: Backup failed"
    exit 1
fi