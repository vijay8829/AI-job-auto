# Production Deployment Guide

## Option A — Railway (Recommended for MVP launch)

### 1. Create Railway project
```bash
npm install -g @railway/cli
railway login
railway init
```

### 2. Add services
In the Railway dashboard create:
- **PostgreSQL** — use Railway managed Postgres (add pgvector via init SQL)
- **Redis** — use Railway managed Redis
- **API service** — link to this repo, Dockerfile: `apps/api/Dockerfile`
- **Web service** — link to this repo, Dockerfile: `apps/web/Dockerfile`

### 3. Required environment variables (API service)
```
NODE_ENV=production
PORT=4000
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=<64-char random>
JWT_REFRESH_SECRET=<64-char random>
ENCRYPTION_KEY=<32-char hex>
APP_URL=https://your-web.railway.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://your-api.railway.app/api/v1/auth/google/callback
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=ai-job-platform-resumes
AWS_REGION=us-east-1
AWS_PRESIGN_URL=https://your-s3-domain.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-...
SENTRY_DSN=https://...@sentry.io/...
```

### 4. Required environment variables (Web service)
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-api.railway.app/api/v1
INTERNAL_API_URL=https://your-api.railway.app
NEXT_PUBLIC_APP_URL=https://your-web.railway.app
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

### 5. Enable pgvector on Railway Postgres
Connect to the DB and run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 6. Run migrations
```bash
railway run --service api npx prisma migrate deploy
```

---

## Option B — Vercel (Web) + Railway (API)

### Web → Vercel
```bash
cd apps/web
vercel --prod
```
Set env vars in Vercel dashboard as listed above.

### API → Railway
Same as Option A steps 2–6 but only the API service.

---

## Option C — AWS ECS (Production Scale)

Use the provided `docker-compose.yml` as a reference. Each service maps to an ECS task definition:
- `api` → ECS task, ALB target group, `/api/health` health check
- `web` → ECS task, CloudFront distribution
- `postgres` → RDS PostgreSQL with pgvector extension
- `redis` → ElastiCache Redis
- `minio` → S3 (replace minio with native S3)

---

## Domain configuration

1. Buy domain (e.g. `applypilot.ai`) via Cloudflare Registrar
2. Add Cloudflare as nameserver
3. In Cloudflare: add CNAME records pointing to Railway/Vercel domains
4. Enable **Full (Strict) SSL** in Cloudflare SSL/TLS settings
5. Enable **Always Use HTTPS** redirect rule
6. Update OAuth callback URLs in Google Cloud Console to use new domain

---

## Post-deploy checklist

- [ ] Run `prisma migrate deploy` on production DB
- [ ] Test register + login flow end-to-end
- [ ] Test Google OAuth with new callback URL
- [ ] Test resume upload to S3
- [ ] Test Stripe webhook (use `stripe listen --forward-to`)
- [ ] Verify Sentry is receiving errors
- [ ] Set up uptime monitoring (Better Uptime, UptimeRobot) on `/api/health`
- [ ] Configure rate limit tuning for production traffic
