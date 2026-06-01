# AI Job Platform — Production Runbook

## Status: All E2E tests passing. Ready for production deployment.

---

## PRODUCTION CHECKLIST (complete in order)

### Infrastructure
- [ ] VPS provisioned (Hetzner CX31 €12/month OR DigitalOcean 4GB $24/month)
- [ ] `infrastructure/scripts/setup-server.sh` run on fresh server
- [ ] Domain purchased: `.ai` (recommended) or `.com`
- [ ] Cloudflare account created, domain nameservers pointed to Cloudflare
- [ ] DNS A record: `yourdomain.ai` → VPS IP
- [ ] DNS A record: `api.yourdomain.ai` → VPS IP (optional if using Next.js proxy)
- [ ] Cloudflare SSL/TLS mode: **Full (strict)**
- [ ] GitHub repo pushed, `main` branch is source of truth

### Secrets & Environment
- [ ] `.env.prod` created from `.env.production.template` on server
- [ ] `JWT_SECRET` generated: `openssl rand -hex 32`
- [ ] `JWT_REFRESH_SECRET` generated: `openssl rand -hex 32`
- [ ] `ENCRYPTION_KEY` generated: `openssl rand -hex 32`
- [ ] `POSTGRES_PASSWORD` set (strong, random)
- [ ] `REDIS_PASSWORD` set
- [ ] `APP_URL` set to `https://yourdomain.ai`

### GitHub Actions Secrets (Settings > Secrets > Actions)
- [ ] `DEPLOY_HOST` = server IP
- [ ] `DEPLOY_USER` = `deploy`
- [ ] `DEPLOY_SSH_KEY` = private key (run: `ssh-keygen -t ed25519 -C "github-deploy"`)
- [ ] `REGISTRY` = `ghcr.io/your-github-username`
- [ ] `REGISTRY_USERNAME` = your GitHub username
- [ ] `REGISTRY_PASSWORD` = GitHub PAT with `write:packages` scope

### Services (configure AFTER server is running)
- [ ] Sentry project created (free tier): set `SENTRY_DSN` in `.env.prod`
- [ ] UptimeRobot monitor: `https://yourdomain.ai/api/health` every 5 min
- [ ] Stripe account: create Products/Prices, set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] AWS S3 bucket created (or keep MinIO for beta): set AWS vars
- [ ] Google OAuth app created (console.cloud.google.com): set `GOOGLE_CLIENT_ID/SECRET`

### Pre-launch Verification
- [ ] `docker compose -f docker-compose.prod.yml up -d` starts cleanly
- [ ] `curl https://yourdomain.ai/api/health` returns 200
- [ ] Can register account at `https://yourdomain.ai`
- [ ] Can upload a resume (tests S3/MinIO)
- [ ] Stripe test checkout completes
- [ ] `docker compose logs worker` shows queue processor active

---

## DEPLOYMENT — FASTEST PATH (VPS + GitHub Actions)

### Day 1 — Server + Domain (2-3 hours)

```bash
# 1. Provision Hetzner CX31 (Ubuntu 22.04) at console.hetzner.cloud
#    Cost: ~€12/month, 8GB RAM, 4 vCPU, 80GB SSD

# 2. SSH in as root, run setup script
ssh root@<server-ip>
curl -sL https://raw.githubusercontent.com/<you>/ai-job-platform/main/infrastructure/scripts/setup-server.sh | bash

# 3. Create deployment SSH key
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy
# Add public key to server's deploy user
ssh-copy-id -i ~/.ssh/github_deploy.pub deploy@<server-ip>
# Add private key to GitHub Actions secrets as DEPLOY_SSH_KEY

# 4. On server as deploy user: clone and configure
ssh deploy@<server-ip>
cd /opt/ai-job-platform
git clone https://github.com/<you>/ai-job-platform.git .
cp .env.production.template .env.prod
nano .env.prod  # Fill in all values

# 5. First manual deploy (before CI is configured)
export REGISTRY=ghcr.io/<you>
export VERSION=latest
docker compose -f docker-compose.prod.yml pull || true
docker compose -f docker-compose.prod.yml up -d
```

### Day 1 — Domain + SSL (30 minutes)

```
1. Buy domain at namecheap.com (~$12/year .com, ~$60/year .ai)
2. In Cloudflare: Add site → change nameservers at registrar
3. Cloudflare DNS: A record pointing to server IP (proxied = orange cloud ON)
4. SSL/TLS → Full (strict)
5. Update APP_URL in .env.prod, redeploy
```

### Day 2 — Automated CI/CD (1 hour)

```bash
# After GitHub Actions secrets are set, every push to main deploys automatically.
# Trigger manually:
git tag v0.1.0-beta
git push origin v0.1.0-beta
# GitHub Actions builds images → pushes to ghcr.io → SSH deploys to server
```

---

## ALTERNATIVE: Railway + Vercel (no server management)

### Cost: ~$20-50/month depending on usage

```
Railway project:
  aijob-api     → apps/api/Dockerfile      (use api.railway.json)
  aijob-worker  → apps/api/Dockerfile      (use worker.railway.json)  
  aijob-ai      → apps/ai-service/Dockerfile (use ai-service.railway.json)
  PostgreSQL    → Railway plugin            (~$5/month for 1GB)
  Redis         → Railway plugin            (~$3/month)

Vercel project:
  Root: apps/web
  Framework: Next.js
  Build: pnpm --filter @ai-job/web build
  Env vars:
    INTERNAL_API_URL = https://<railway-api-service>.railway.app
    NEXT_PUBLIC_API_URL = /api/v1

Total: ~$25-35/month for beta
```

---

## MONITORING SETUP

### Sentry (error tracking) — Free tier: 5k errors/month

```bash
# 1. Create account at sentry.io
# 2. New project → Node.js → get DSN
# 3. Set in .env.prod:
SENTRY_DSN=https://xxxxx@sentry.io/project-id
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/project-id
```

### UptimeRobot (uptime monitoring) — Free: 50 monitors, 5-min intervals

```
Monitor 1: https://yourdomain.ai                  → "Landing Page"
Monitor 2: https://yourdomain.ai/api/health       → "API Health"
Monitor 3: https://yourdomain.ai/api/v1/platforms → keyword: "LinkedIn" (auth error = 401, still up)
Alert: Email + Slack webhook
```

### Structured log access

```bash
# API logs (JSON structured)
docker compose -f docker-compose.prod.yml logs api -f --tail=100

# Worker logs  
docker compose -f docker-compose.prod.yml logs worker -f --tail=100

# Filter errors only
docker compose logs api 2>&1 | grep '"level":"error"'

# Bull Board (queue monitor UI)
# Expose port 3002 only on localhost, access via SSH tunnel:
ssh -L 3002:localhost:3002 deploy@<server-ip>
# Then open: http://localhost:3002
```

### Database monitoring

```bash
# Connection count, slow queries
docker exec aijob-postgres psql -U postgres -d ai_job_platform -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Table sizes
docker exec aijob-postgres psql -U postgres -d ai_job_platform -c \
  "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;"
```

---

## BETA LAUNCH STRATEGY

### Target: 10–20 beta users in Week 1

**Who to invite:**
- Job seekers in your personal network actively looking
- LinkedIn connections who recently posted "open to work"
- Developer communities (Discord servers, Slack groups for job seekers)
- ProductHunt "upcoming" launch for waitlist

**Invitation message (DM/email):**
```
Hey [Name],

I built an AI tool that automates job applications — it parses your resume, 
matches you to jobs on LinkedIn/Indeed/Naukri, and applies on your behalf.

It's in private beta. Would you be willing to try it and give honest feedback?

I'm especially looking for people actively job-hunting right now.
Just upload your resume and connect one platform — takes 5 minutes.

Link: https://yourdomain.ai
Beta code: BETA2026

[Your name]
```

**Beta user onboarding sequence:**
1. User registers → onboarding wizard (already built)
2. Day 0: Welcome email + "here's what to do first" (manual for now)
3. Day 2: Follow-up: "Did your first automation run? Here's the result"
4. Day 7: Feedback survey (Google Form or Typeform)

**What to track during beta:**
```sql
-- Onboarding completion rate
SELECT 
  COUNT(*) FILTER (WHERE onboarding_completed_at IS NOT NULL) AS completed,
  COUNT(*) AS total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE onboarding_completed_at IS NOT NULL) / COUNT(*), 1) AS pct
FROM user_profiles;

-- Automation success rate by platform
SELECT 
  jp.name,
  COUNT(*) FILTER (WHERE al.status = 'COMPLETED') AS success,
  COUNT(*) AS total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE al.status = 'COMPLETED') / COUNT(*), 1) AS rate
FROM automation_logs al
JOIN applications a ON a.automation_id = al.id
JOIN jobs j ON j.id = a.job_id
JOIN job_platforms jp ON jp.id = j.platform_id
GROUP BY jp.name;

-- Resume parse success rate
SELECT
  COUNT(*) FILTER (WHERE parse_status = 'completed') AS parsed,
  COUNT(*) FILTER (WHERE parse_status = 'failed') AS failed,
  COUNT(*) AS total
FROM resumes;
```

**Key beta KPIs (track weekly):**
| Metric | Target |
|--------|--------|
| Automation success rate | >60% |
| Resume parse success | >95% |
| Onboarding completion | >70% |
| D7 retention (still active) | >40% |
| CAPTCHA hit rate | <10% |

---

## AUTOMATION HARDENING ROADMAP

### Phase 1 — Stability (Week 1-2, Beta)
These are already implemented:
- [x] Browser semaphore (max 3 concurrent)
- [x] Session cookie persistence (no fresh login every run)
- [x] CAPTCHA detection + graceful failure
- [x] Exponential backoff (3 retries, Bull config)
- [x] Multi-selector fallback (LinkedIn + Naukri)

### Phase 2 — Reliability (Week 3-4, after first 50 runs)
Track failures from beta → fix the top 3 failure reasons

Common failure categories:
1. **Selector stale** — platform changed DOM → add new selectors to fallback array
2. **Rate limited** — increase `AUTOMATION_RATE_LIMIT_MS` in .env (default 2000ms → try 4000ms)
3. **CAPTCHA** → increase human delays, reduce concurrency to 1
4. **Auth expired** → cookie refresh already implemented; check `lastSyncAt`

### Phase 3 — Scale (Month 2+, >50 active users)
- Increase `BROWSER_POOL_SIZE` from 3 → 5 when CPU allows
- Add dedicated worker server (separate from API)
- LinkedIn: switch to official API where possible (reduces detection)
- Add Playwright cluster with persistent browser contexts

---

## SCALING ROADMAP

### Tier 1: Beta (0–25 users) — Current setup
- Single VPS or Railway starter
- 1 API + 1 Worker + 1 AI service
- Single Postgres + Redis
- MinIO for storage (or S3 free tier)
- **Cost: ~€12-30/month**

### Tier 2: Early growth (25–200 users) — Month 2-3
Triggers: API p95 latency >500ms OR automation queue depth >10 for >5 min

Actions:
- Upgrade VPS to 16GB RAM (Hetzner CX41 €28/month)
- Scale worker to 2 replicas (processes more jobs in parallel)
- Add read replica Postgres (Railway or RDS)
- Switch MinIO → AWS S3
- **Cost: ~€50-80/month**

### Tier 3: PMF (200–1000 users) — Month 4-6
Triggers: >50 automation runs/day OR resume parse queue depth >20

Actions:
- Separate API, Worker, AI onto different VPS instances
- API: 2 replicas behind nginx load balancer
- Worker: 3 replicas (each with `BROWSER_POOL_SIZE=3` = 9 concurrent browsers)
- AI service: dedicated GPU instance for embeddings
- Redis Cluster for queue reliability
- **Cost: ~€150-300/month**

### Tier 4: Scale (1000+ users) — Month 6+
- AWS ECS / Kubernetes
- RDS Aurora (multi-AZ)
- ElastiCache Redis
- CloudFront CDN
- Consider raising funding
- **Cost: ~$500-2000/month depending on usage**

---

## OPERATIONAL STRATEGY — DAY-TO-DAY

### Daily (5 minutes)
```bash
# Check health
curl -s https://yourdomain.ai/api/health | jq .
docker compose logs --tail=50 api | grep "error\|warn"

# Check queue depth (should clear within minutes)
docker exec aijob-redis redis-cli -a <password> keys "bull:auto-apply:*" | grep "waiting\|active" | wc -l
```

### Weekly (30 minutes)
1. Review Sentry errors — fix top 3 by frequency
2. Check automation success rates (SQL above)
3. Review UptimeRobot downtime report
4. Backup database: `docker exec aijob-postgres pg_dump -U postgres ai_job_platform | gzip > backup-$(date +%Y%m%d).sql.gz`
5. Rotate failed Bull jobs if needed (Bull Board UI)

### On automation failure spike (>30% failure rate)
1. Check API logs for pattern
2. Test the failing platform manually (is LinkedIn down? Changed their DOM?)
3. If selector issue: update connector selectors, redeploy
4. If rate limit: increase `AUTOMATION_RATE_LIMIT_MS`, reduce `BROWSER_POOL_SIZE`
5. Notify affected users via notification system

### Incident response
```
P0 (site down): Fix within 30 min
  → Check docker compose ps
  → Check nginx logs
  → Restart containers: docker compose -f docker-compose.prod.yml restart

P1 (automation not working): Fix within 2 hours
  → Check worker logs
  → Check Redis queue depth
  → Manual test via API

P2 (feature broken): Fix within 24 hours
  → Sentry alert → fix → deploy via GitHub Actions push to main
```

---

## STRIPE CONFIGURATION

### Test mode (Beta phase)
```bash
# In .env.prod use test keys:
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Create products in Stripe dashboard:
# Product: "AI Job Platform Pro"
#   Price: $19/month → STRIPE_PRO_PRICE_ID=price_xxxxx
# Product: "AI Job Platform Enterprise"  
#   Price: $49/month → STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx

# Webhook endpoint: https://yourdomain.ai/api/v1/subscriptions/webhook
# Events to listen: customer.subscription.* , invoice.payment_failed
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Switch to live mode (after 10 paying beta users)
1. Complete Stripe business verification
2. Swap `sk_test_` → `sk_live_` keys in `.env.prod`
3. Create same Products/Prices in live mode
4. Update webhook to use live signing secret
5. Test with a real $1 charge before announcing

---

## GITHUB ACTIONS SECRETS REFERENCE

Set all of these at: github.com/<you>/<repo>/settings/secrets/actions

| Secret | Value |
|--------|-------|
| `DEPLOY_HOST` | Server IP address |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | Contents of `~/.ssh/github_deploy` (private key) |
| `REGISTRY` | `ghcr.io/<your-github-username>` |
| `REGISTRY_USERNAME` | Your GitHub username |
| `REGISTRY_PASSWORD` | GitHub PAT (`Settings > Developer Settings > PAT` with `write:packages`) |
| `NEXT_PUBLIC_API_URL` | `/api/v1` |

---

## DOMAIN RECOMMENDATIONS

| Option | Domain | Cost/year | Best for |
|--------|--------|-----------|----------|
| Best branding | `applyai.app` | ~$30 | Short, memorable |
| Professional | `hirepath.ai` | ~$60 | Career focus |
| Budget | `aijobbot.com` | ~$12 | Functional name |

After purchase: point nameservers to Cloudflare for free SSL + DDoS protection.
