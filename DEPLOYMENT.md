# Deployment Guide for Coolify

## Prerequisites
- Coolify instance running
- GitHub repository connected to Coolify
- Domain name (optional but recommended)

## Step-by-Step Deployment

### 1. Create New Project in Coolify

1. Log into your Coolify dashboard
2. Click "New Project" or "Add Resource"
3. Select "Public Repository" or connect your GitHub account
4. Enter your repository URL

### 2. Configure Build Settings

In Coolify's application settings:

**Build Pack:** Docker (since we have a Dockerfile)

**Port:** 3000

**Health Check Path:** /api/health (we'll create this)

### 3. Set Environment Variables

In Coolify's Environment Variables section, add:

```env
DATABASE_URL=file:./database/prod.db
JWT_SECRET=<generate-a-secure-random-string>
NEXTAUTH_SECRET=<generate-another-secure-random-string>
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

**To generate secure secrets:**
```bash
openssl rand -base64 32
```

### 4. Configure Persistent Storage

**IMPORTANT:** SQLite database needs persistent storage!

In Coolify's Storage settings:
1. Add a new volume
2. Mount path: `/app/database`
3. Size: 1GB (or as needed)
4. This ensures your database persists between deployments

### 5. Configure Domain (Optional)

In Coolify's Domain settings:
1. Add your domain
2. Enable "Generate SSL Certificate" for HTTPS
3. Coolify will handle Let's Encrypt SSL automatically

### 6. Deploy

1. Click "Deploy" in Coolify
2. Monitor the build logs
3. First deployment will:
   - Build the Docker image
   - Run database migrations
   - Start the application

### 7. Create Initial Admin User

After deployment, access your app and:
1. Navigate to `/register`
2. Create the first user account
3. This user will automatically be an ADMIN

### 8. Database Backup (Important!)

Since we're using SQLite, set up regular backups:

**Option 1: Manual Backup**
SSH into your server and run:
```bash
docker exec <container-id> sqlite3 /app/database/prod.db ".backup /app/database/backup.db"
```

**Option 2: Automated Backup**
Add a cron job on your server:
```bash
0 2 * * * docker exec <container-id> sqlite3 /app/database/prod.db ".backup /app/database/backup-$(date +\%Y\%m\%d).db"
```

## Troubleshooting

### Database Issues
If migrations fail, you can manually run them:
```bash
docker exec -it <container-id> npx prisma migrate deploy
```

### Reset Database (Development Only!)
```bash
docker exec -it <container-id> npx prisma migrate reset
```

### View Logs
In Coolify, check the "Logs" tab for application logs

### Environment Variables Not Loading
- Ensure no spaces around `=` in env variables
- Restart the application after changing env variables

## Performance Optimization

### 1. Enable Response Caching
Already configured in Next.js for static pages

### 2. Database Optimization
SQLite is configured with WAL mode for better concurrent access

### 3. Resource Limits
In Coolify, set appropriate:
- Memory: 512MB minimum
- CPU: 0.5 CPU minimum

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Change default NEXTAUTH_SECRET  
- [ ] Use HTTPS (SSL certificate)
- [ ] Set up regular backups
- [ ] Monitor disk usage for database
- [ ] Review user permissions regularly

## Updating the Application

1. Push changes to GitHub
2. In Coolify, click "Redeploy" or set up auto-deploy
3. Database migrations run automatically

## Monitoring

Consider adding:
- Uptime monitoring (UptimeRobot, Pingdom)
- Error tracking (Sentry - optional)
- Analytics (Plausible, Umami - optional)

## Support

For issues:
1. Check Coolify logs
2. Check application logs
3. Verify environment variables
4. Ensure database volume is mounted
5. Check disk space for database