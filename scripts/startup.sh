#!/bin/sh

echo "Starting application setup..."

# Create database directory if it doesn't exist
mkdir -p /app/database

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting the application..."
node server.js