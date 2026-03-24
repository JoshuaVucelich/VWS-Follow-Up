# Docker Setup Guide

VWS FollowUp includes Docker support for both local development and production deployment.

---

## Local development with Docker Compose

The easiest way to get a local database running is with Docker Compose.

### Start just the database

```bash
docker compose up db -d
```

Then run the app locally:
```bash
npm run dev
```

This is the recommended development workflow — the app benefits from Next.js hot reload when run directly with `npm run dev`.

### Start the full stack

```bash
docker compose up -d
```

This starts both the database and the Next.js app. The app will be available at `http://localhost:3000`.

### Useful commands

```bash
# View logs
docker compose logs -f

# View app logs only
docker compose logs -f app

# Stop everything
docker compose down

# Stop and remove all data (full reset)
docker compose down -v

# Rebuild the app image (after dependency changes)
docker compose build app
```

---

## Production deployment with Docker

### 1. Build the production image

```bash
docker build --target production -t vws-followup:latest .
```

### 2. Run with environment variables

```bash
docker run -d \
  --name vws-followup \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@your-db-host:5432/vws_followup" \
  -e AUTH_SECRET="your-secure-random-secret" \
  -e NEXTAUTH_URL="https://your-domain.com" \
  -e NODE_ENV="production" \
  vws-followup:latest
```

Or use an `.env` file:
```bash
docker run -d \
  --name vws-followup \
  -p 3000:3000 \
  --env-file .env.production \
  vws-followup:latest
```

### 3. Run database migrations on first deploy

```bash
docker exec vws-followup npx prisma migrate deploy
```

The production Docker CMD already runs `prisma migrate deploy` automatically on startup, so this is only needed if you want to run it manually or check migration status.

---

## Docker Compose for production

For a simple single-server production setup:

```yaml
# docker-compose.prod.yml
version: "3.8"
services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: vws_user
      POSTGRES_PASSWORD: your-secure-password
      POSTGRES_DB: vws_followup
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    image: vws-followup:latest
    restart: always
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://vws_user:your-secure-password@db:5432/vws_followup"
      AUTH_SECRET: "your-secure-random-secret"
      NEXTAUTH_URL: "https://your-domain.com"
      NODE_ENV: "production"
    depends_on:
      - db

volumes:
  postgres_data:
```

Run:
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Using with a reverse proxy

In production, put a reverse proxy (Nginx, Caddy, Traefik) in front of the app to handle:
- SSL/TLS termination
- HTTP → HTTPS redirect
- Custom domain routing

### Caddy example

```
your-domain.com {
    reverse_proxy localhost:3000
}
```

Caddy automatically handles SSL certificates via Let's Encrypt.

### Nginx example

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
