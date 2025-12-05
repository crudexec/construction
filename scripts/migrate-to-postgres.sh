#!/bin/bash

echo "🚀 Migrating from SQLite to PostgreSQL..."

# 1. Create new migration for PostgreSQL
echo "📋 Creating new migration..."
npx prisma migrate dev --name init_postgres --create-only

echo "🔄 Applying migrations to PostgreSQL..."
npx prisma migrate deploy

echo "🔧 Generating Prisma client for PostgreSQL..."
npx prisma generate

echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Update your DATABASE_URL environment variable"
echo "2. Test the connection with 'npx prisma studio'"
echo "3. Deploy your application"