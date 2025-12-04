#!/bin/sh

echo "Starting application setup..."

# Create database directory if it doesn't exist
mkdir -p /app/database

# Check if database exists, if not create it
if [ ! -f /app/database/production.db ]; then
    echo "Database not found, creating new database..."
    touch /app/database/production.db
    chmod 666 /app/database/production.db
    
    # Run database migrations for new database
    echo "Running database migrations for new database..."
    npx prisma migrate deploy
else
    echo "Existing database found, preserving data..."
    # Ensure proper permissions
    chmod 666 /app/database/production.db
    
    # Run migrations to update schema (won't lose data)
    echo "Applying any new migrations..."
    npx prisma migrate deploy
fi

# Start the application
echo "Starting the application..."
node server.js