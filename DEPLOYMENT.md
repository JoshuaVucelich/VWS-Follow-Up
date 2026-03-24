# Deployment Quick Reference

VWS FollowUp can be self-hosted anywhere that runs Node.js 20+ and has access to a PostgreSQL database.

For full deployment instructions see **[docs/deployment.md](docs/deployment.md)**.

---

## Fastest path: Railway

1. Fork this repo to your GitHub account
2. Create a new project on [Railway](https://railway.app)
3. Add a **PostgreSQL** service, then deploy from your fork
4. Set the required environment variables (see below)
5. Railway runs `npm run build && npm start` automatically

## Docker (VPS)

```bash
# Build production image
docker build --target production -t vws-followup .

# Run (replace values in .env.production)
docker run -d \
  --name vws-followup \
  -p 3000:3000 \
  --env-file .env.production \
  vws-followup
```

The container automatically runs `prisma migrate deploy` before starting the server.

## Required environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random secret for JWT signing (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Public URL of the app (e.g. `https://crm.example.com`) |
| `NODE_ENV` | Set to `production` |

Optional (for email features):

| Variable | Description |
|---|---|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (default 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | Sender address (e.g. `no-reply@example.com`) |

See [docs/environment-variables.md](docs/environment-variables.md) for the complete list.

---

## First-time setup

After the app is running and database migrations have been applied:

1. Navigate to `https://your-domain.com/register`
2. Create your account — **the first registered user automatically becomes Owner**
3. Log in and go to **Settings → Team Members** to invite additional users

---

## Updating

```bash
git pull origin main
npm ci
npm run db:migrate:prod
npm run build
pm2 restart vws-followup   # or restart your Docker container
```

---

For detailed options (Vercel, DigitalOcean, Coolify, nginx/Caddy reverse proxy, backups) see **[docs/deployment.md](docs/deployment.md)**.
