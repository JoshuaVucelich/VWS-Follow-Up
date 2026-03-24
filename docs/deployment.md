# Deployment Guide

VWS FollowUp is designed to be easy to self-host. This guide covers the most common deployment options.

---

## Prerequisites

For any deployment you will need:
- A PostgreSQL database (v14 or newer)
- The environment variables listed in [environment-variables.md](environment-variables.md)
- Node.js 20+ or Docker

---

## Option 1: Railway (Recommended for beginners)

Railway handles infrastructure automatically and has a generous free tier.

1. Create a [Railway](https://railway.app) account
2. Create a new project
3. Add a **PostgreSQL** service
4. Deploy the app from your GitHub repo
5. Set environment variables in the Railway dashboard:
   - `DATABASE_URL` — copy the internal URL from your PostgreSQL service
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` — your Railway public URL (e.g., `https://vws-followup.up.railway.app`)
   - `NODE_ENV=production`
6. Add the build command: `npm run build`
7. Add the start command: `npm start`
8. Railway will run your app automatically on deploy

---

## Option 2: DigitalOcean App Platform

1. Create a [DigitalOcean](https://www.digitalocean.com) account
2. Create a **Managed PostgreSQL** database
3. Create a new App from your GitHub repo
4. Set environment variables in the App settings
5. Set `Run Command` to: `npm start`

---

## Option 3: VPS (Recommended for full control)

Tested with Ubuntu 22.04. Works on any Linux VPS (DigitalOcean Droplet, Linode, Hetzner, etc.).

### Step 1: Server setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Docker (for PostgreSQL)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

### Step 2: PostgreSQL with Docker

```bash
docker run -d \
  --name vws_postgres \
  --restart always \
  -e POSTGRES_USER=vws_user \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e POSTGRES_DB=vws_followup \
  -p 5432:5432 \
  -v vws_postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine
```

### Step 3: Clone and build

```bash
git clone https://github.com/your-org/vws-followup.git
cd vws-followup
npm ci
cp .env.example .env
# Edit .env with production values
```

### Step 4: Database setup

```bash
npm run db:migrate:prod
```

### Step 5: Build

```bash
npm run build
```

### Step 6: Run with PM2

```bash
# Install PM2 (process manager)
sudo npm install -g pm2

# Start the app
pm2 start npm --name "vws-followup" -- start

# Save PM2 config to start on reboot
pm2 save
pm2 startup
```

### Step 7: Reverse proxy with Caddy

```bash
sudo apt install caddy -y
```

Edit `/etc/caddy/Caddyfile`:
```
your-domain.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl restart caddy
```

---

## Option 4: Coolify (Self-hosted PaaS)

[Coolify](https://coolify.io) is a self-hosted Heroku/Netlify alternative.

1. Install Coolify on a VPS following their docs
2. Add a PostgreSQL resource in Coolify
3. Add a new service from your GitHub repo
4. Set the environment variables
5. Deploy

---

## Option 5: Vercel

Vercel works well for the Next.js frontend but requires an external PostgreSQL database (Vercel Postgres, Supabase, Neon, etc.).

1. Push your code to GitHub
2. Import the project in Vercel
3. Add a PostgreSQL database (Vercel Postgres or external)
4. Set environment variables in Vercel project settings
5. Deploy

Note: Vercel's free tier may have limitations for database connections. Consider using a connection pooler like PgBouncer or Prisma Accelerate.

---

## Post-deployment checklist

- [ ] Environment variables are set correctly
- [ ] `AUTH_SECRET` is a strong random string
- [ ] `NEXTAUTH_URL` matches your actual domain (no trailing slash)
- [ ] Database migrations have run (`npm run db:migrate:prod`)
- [ ] SMTP is configured if you want password reset emails
- [ ] SSL/HTTPS is working
- [ ] Create the first owner account by navigating to `/register`
- [ ] Disable public registration after setting up your account (see settings)

---

## Updating

### VPS with PM2

```bash
cd /path/to/vws-followup
git pull origin main
npm ci
npm run db:migrate:prod
npm run build
pm2 restart vws-followup
```

### Docker

```bash
docker build --target production -t vws-followup:latest .
docker stop vws-followup
docker rm vws-followup
docker run -d --name vws-followup -p 3000:3000 --env-file .env.production vws-followup:latest
```

---

## Backups

Always back up your PostgreSQL database. For a simple backup:

```bash
# Create a backup
pg_dump -U vws_user -h localhost vws_followup > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql -U vws_user -h localhost vws_followup < backup_20240101_120000.sql
```

For automated backups, consider tools like [pgBackRest](https://pgbackrest.org) or your hosting provider's backup features.
