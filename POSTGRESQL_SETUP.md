# PostgreSQL Migration Guide

## 📋 Prerequisites

Your app is now ready for PostgreSQL! Follow these steps to complete the migration.

## 🚀 Quick Setup

### 1. Set Your Database URL

In Coolify, update your environment variables:

```env
DATABASE_URL=postgresql://username:password@host:port/database_name
```

**Example formats:**
- **Neon:** `postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`
- **Railway:** `postgresql://postgres:password@containers-us-west-xxx.railway.app:xxxx/railway`
- **Supabase:** `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres`
- **DigitalOcean:** `postgresql://username:password@db-xxx.db.ondigitalocean.com:25060/database?sslmode=require`

### 2. Deploy and Migrate

The application will automatically:
✅ Apply database migrations  
✅ Generate Prisma client  
✅ Start the application  

### 3. Verify Connection

Check deployment logs for:
```
✅ Database migrations applied successfully
✅ Prisma client generated
✅ Application started
```

## 🔧 Manual Migration (if needed)

If you want to migrate existing data from SQLite:

### 1. Export SQLite Data
```bash
node scripts/export-sqlite-data.js
```

### 2. Apply Schema to PostgreSQL
```bash
npx prisma migrate deploy
```

### 3. Import Data (manual step)
Use the exported JSON file to recreate your data in PostgreSQL.

## 🎯 Benefits You'll See

- **5-10x faster** concurrent operations
- **Better performance** for complex queries
- **Improved reliability** and data integrity
- **Better backup/restore** capabilities
- **Support for more concurrent users**

## 🚨 Important Notes

- **Remove SQLite volumes** from Coolify storage settings
- **Update DATABASE_URL** environment variable
- **No file permissions issues** with PostgreSQL
- **Better concurrent access** for multiple users

## 🆘 Troubleshooting

### Connection Issues
- Verify DATABASE_URL format
- Check network access to database
- Ensure SSL settings if required

### Migration Issues
- Check Coolify deployment logs
- Verify Prisma schema is correct
- Ensure PostgreSQL version compatibility

## 🔄 Rollback (if needed)

To switch back to SQLite:
1. Change `provider = "sqlite"` in `prisma/schema.prisma`
2. Update DATABASE_URL to SQLite format
3. Restore database files from backup
4. Redeploy

---

**Ready for PostgreSQL?** Just update your DATABASE_URL and deploy! 🚀