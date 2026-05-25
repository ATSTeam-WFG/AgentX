# AgentX — Deployment Guide

Frontend → Vercel  
Backend + Workers → Railway (single process)  
Database → Supabase (already provisioned)  
Storage → Cloudflare R2  

---

## Prerequisites

Before deploying, generate the secrets you'll need:

```bash
# VAPID keys for push notifications (run once, save both values)
npx web-push generate-vapid-keys --json

# JWT secret (32+ chars)
openssl rand -hex 32

# QR HMAC secret (32+ chars)
openssl rand -hex 32
```

---

## 1 — Railway (Backend)

### Create the project

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub Repo
2. Select this repo, set **Root Directory** to `backend/`
3. Railway will detect the `railway.toml` and use it automatically

### Add Redis

In the Railway project → **New Service** → **Redis**. Railway injects `REDIS_URL` automatically — no manual env var needed.

### Set environment variables

In Railway → Variables, add every entry from `backend/.env.example` with real values:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `CORS_ORIGIN` | Your Vercel frontend URL, e.g. `https://agentx.vercel.app` |
| `DATABASE_URL` | Supabase pooled connection string |
| `DIRECT_URL` | Supabase direct (non-pooled) connection string |
| `JWT_SECRET` | 32+ char random string |
| `QR_HMAC_SECRET` | 32+ char random string (different from JWT) |
| `VAPID_PUBLIC_KEY` | From `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | From `npx web-push generate-vapid-keys` |
| `VAPID_CONTACT_EMAIL` | `admin@wfgtitle.com` |
| `ANTHROPIC_API_KEY` | Anthropic API key (golden points scoring) |
| `GOOGLE_AI_API_KEY` | Google AI Studio key (avatar generation) |
| `OBJECT_STORAGE_BUCKET` | `agentx-uploads` |
| `OBJECT_STORAGE_REGION` | `auto` |
| `OBJECT_STORAGE_ACCESS_KEY` | R2 access key |
| `OBJECT_STORAGE_SECRET_KEY` | R2 secret key |
| `OBJECT_STORAGE_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `OBJECT_STORAGE_PUBLIC_URL` | `https://pub-<hash>.r2.dev` |

`REDIS_URL` is injected automatically by Railway's Redis service.

### What the deploy does

The `railway.toml` runs:
1. `npm ci && npx prisma generate && npm run build` — installs deps, generates Prisma client, compiles TypeScript
2. `npx prisma migrate deploy` — runs any pending schema migrations (idempotent)
3. `node dist/index.js` — starts the HTTP server + background job worker in a single process

Health check: `GET /health` → `{ status: "ok", ts: <epoch> }`

### Seed data (first deploy only)

After the first deploy, run this once via Railway's Shell:

```bash
npx prisma db seed
```

This loads the trivia questions, prompt challenge questions, touchpoint locations, and initial content.

---

## 2 — Vercel (Frontend)

### Create the project

1. [vercel.com](https://vercel.com) → New Project → Import Git Repository
2. Select this repo
3. Set **Root Directory** to `frontend/`
4. Vercel detects Next.js automatically; `vercel.json` locks the framework

### Set environment variables

In Vercel → Settings → Environment Variables (set for **Production**):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Railway backend URL, e.g. `https://agentx-backend.up.railway.app` |
| `NEXT_PUBLIC_WS_URL` | Same host with `wss://` scheme |
| `NEXT_PUBLIC_APP_ENV` | `production` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Must match `VAPID_PUBLIC_KEY` on Railway |

### Notes

- `NEXT_PUBLIC_APP_ENV=production` enables the Serwist service worker (PWA + offline support). Leave it unset in preview deployments.
- WebSocket (`wss://`) uses the same Railway URL as the REST API — the backend registers both on the same port.

---

## 3 — Cloudflare R2 (Storage)

Avatar selfies and generated portraits are stored in R2.

1. Cloudflare Dashboard → R2 → Create Bucket → name: `agentx-uploads`
2. Create an API Token with **Object Read & Write** on that bucket
3. Enable **Public Access** on the bucket (or set a custom domain) to get `OBJECT_STORAGE_PUBLIC_URL`
4. Set all `OBJECT_STORAGE_*` vars in Railway

---

## 4 — Supabase (Database)

Supabase is already provisioned. Retrieve connection strings from:

Supabase Dashboard → Project Settings → Database → Connection string

- **Pooled (pgBouncer)** → `DATABASE_URL` (append `?pgbouncer=true&connection_limit=10`)
- **Direct** → `DIRECT_URL` (used by Prisma migrations only)

Migrations run automatically on every Railway deploy via `prisma migrate deploy`.

---

## Post-Deploy Checklist

- [ ] `GET https://<railway-url>/health` returns `{ status: "ok" }`
- [ ] Frontend loads and calls backend without CORS errors
- [ ] Sign up flow completes (invitee match or walk-in)
- [ ] Trivia activity loads 50 questions
- [ ] Golden Points submission triggers AI scoring (check Railway logs for worker activity)
- [ ] Avatar upload and generation completes (check R2 bucket for files)
- [ ] Push notification received after GP scoring
- [ ] Admin login works at `/admin`

---

## Useful Railway CLI commands

```bash
railway login
railway link              # link local repo to Railway project
railway logs              # tail live logs
railway run npm run db:seed   # run seed against production DB
railway shell             # open a shell in the running container
```
