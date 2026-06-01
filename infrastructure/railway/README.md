# Railway Deployment

## Services to create in Railway dashboard

| Railway Service | Config File           | Image/Source    |
|-----------------|-----------------------|-----------------|
| `aijob-api`     | api.railway.json      | Dockerfile      |
| `aijob-worker`  | worker.railway.json   | same Dockerfile |
| `aijob-ai`      | ai-service.railway.json | ai-service/Dockerfile |
| `aijob-postgres`| (Railway plugin)      | PostgreSQL       |
| `aijob-redis`   | (Railway plugin)      | Redis            |

## Setup steps

1. Create a new Railway project
2. Add PostgreSQL plugin → note DATABASE_URL
3. Add Redis plugin → note REDIS_URL
4. Create service `aijob-api`:
   - Source: GitHub repo, branch `main`
   - Set root directory to repo root
   - Paste contents of `api.railway.json` into Railway settings
   - Add all env vars from `.env.production.template`
5. Create service `aijob-worker`:
   - Same source as API
   - Paste contents of `worker.railway.json`
   - Add same env vars + `WORKER_PORT=4001`
6. Create service `aijob-ai`:
   - Source: GitHub repo
   - Root directory: `apps/ai-service`
7. Deploy frontend to Vercel (see `apps/web/vercel.json`)
   - Set `INTERNAL_API_URL` = Railway API service's internal URL

## Environment variables for Railway API service

Copy from `.env.production.template` and set:
- `DATABASE_URL` = from Railway Postgres plugin
- `REDIS_URL` = from Railway Redis plugin
- `AI_SERVICE_URL` = `https://<aijob-ai.railway.app>` (Railway service URL)
- `APP_URL` = `https://<your-vercel-app>.vercel.app` (or custom domain)
- All secrets (JWT, encryption, Stripe, etc.)
