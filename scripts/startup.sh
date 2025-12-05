#!/bin/sh

echo "Starting application setup..."

# For PostgreSQL, no need to create local database files
echo "Connecting to PostgreSQL database..."

# Run database migrations
echo "Applying database migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Start the application
echo "Starting the application..."
node server.js