# Environment Variables Reference

Copy `.env.example` to `.env` to get started:

```bash
cp .env.example .env
```

---

## Required variables

These must be set before the application will start.

### `DATABASE_URL`

PostgreSQL connection string.

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

**Local development (Docker Compose):**
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/vws_followup?schema=public"
```

**Production:**
```
DATABASE_URL="postgresql://vws_user:your-password@your-db-host:5432/vws_followup?schema=public"
```

---

### `AUTH_SECRET`

A secret string used to sign and encrypt session tokens.

Generate a secure value:
```bash
openssl rand -base64 32
```

This must be at least 32 characters. The app will throw a startup error if this is not set in production.

```
AUTH_SECRET="your-random-secret-at-least-32-chars"
```

---

### `NEXTAUTH_URL`

The canonical public URL of your deployment. Used for OAuth callbacks and links in emails.

No trailing slash.

```
# Local development
NEXTAUTH_URL="http://localhost:3000"

# Production
NEXTAUTH_URL="https://your-domain.com"
```

---

## Optional variables

### Email / SMTP

Required for password reset emails and future email reminders.

```
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-smtp-username"
SMTP_PASSWORD="your-smtp-password"
SMTP_FROM="VWS FollowUp <noreply@example.com>"
SMTP_SECURE="true"
```

**Recommended SMTP providers for self-hosted setups:**
- [Resend](https://resend.com) — generous free tier
- [Mailgun](https://mailgun.com)
- [SendGrid](https://sendgrid.com)
- Self-hosted [Postfix](http://www.postfix.org) or [Mailu](https://mailu.io)

If SMTP is not configured, password reset will not work. The app will still function for manual use.

---

### Application

```
# Controls logging verbosity and error messages shown to users
NODE_ENV="development"    # or "production"

# Override the app name shown in the UI (useful for white-labeling)
NEXT_PUBLIC_APP_NAME="VWS FollowUp"

# Override the base URL for generated links
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Security notes

- **Never commit your `.env` file.** It is listed in `.gitignore` by default.
- The `.env.example` file is committed and documents all variables without real values.
- Use strong, randomly generated secrets for `AUTH_SECRET`.
- In production, use environment variable injection from your hosting platform rather than a `.env` file on disk.

### Platform-specific guides

**Railway:**
Settings → Variables → Add Variable

**DigitalOcean App Platform:**
Settings → App-Level Environment Variables

**Coolify:**
Environment Variables tab on your service

**Docker run:**
```bash
docker run \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH_SECRET="..." \
  -e NEXTAUTH_URL="https://your-domain.com" \
  -p 3000:3000 \
  vws-followup
```

**Docker Compose:**
Create a `.env` file in the project root — Docker Compose reads it automatically.
