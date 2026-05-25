# AgentX

Event gamification PWA for the **WFG Executive Summit 2026** — June 3–5, Opal Grand Resort, Delray Beach FL.

Attendees earn points through activities (trivia, AI-scored responses, QR touchpoints, avatar studio), compete on a leaderboard, and receive push notifications. Staff manage everything through a separate admin panel.

---

## Repository Structure

```
AgentX/
├── frontend/        # Next.js 15 PWA (attendee app + admin panel)
├── backend/         # Fastify API + job workers
├── docs/            # Architecture, progress tracking, deployment guide
├── k6/              # Load test scripts (peak: 800 concurrent)
└── scripts/         # One-off ops scripts (seed, migrations, etc.)
```

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, TanStack Query v5, Serwist (PWA) |
| Backend | Fastify, TypeScript, Prisma ORM |
| Database | PostgreSQL (Supabase) |
| Cache / Queue | Redis (Railway) |
| Object Storage | Cloudflare R2 (avatar images) |
| AI — scoring | Claude Haiku (`claude-haiku-4-5-20251001`) |
| AI — avatars | Google Gemini 3 Pro |
| Push notifications | Web Push (VAPID, no third-party service) |
| Hosting | Vercel (frontend) + Railway (backend + Redis) |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- PostgreSQL (local or Supabase)
- Redis (local or Railway)

### Backend

```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL, REDIS_URL, JWT_SECRET, etc.
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev                   # starts on :3001
```

### Frontend

```bash
cd frontend
cp .env.example .env.local    # set NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev                   # starts on :3000
```

Open `http://localhost:3000`. The backend must be running for any API calls to work.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | Signs attendee JWTs (min 32 chars) |
| `ADMIN_JWT_SECRET` | Yes | Signs admin JWTs (separate secret) |
| `ANTHROPIC_API_KEY` | Phase 3 | Golden Points AI scoring |
| `GOOGLE_AI_API_KEY` | Phase 3 | Avatar generation (Gemini) |
| `OBJECT_STORAGE_ACCOUNT_ID` | Phase 3 | Cloudflare R2 account |
| `OBJECT_STORAGE_ACCESS_KEY_ID` | Phase 3 | R2 access key |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | Phase 3 | R2 secret |
| `OBJECT_STORAGE_BUCKET_NAME` | Phase 3 | R2 bucket name |
| `OBJECT_STORAGE_PUBLIC_URL` | Phase 3 | Public base URL for R2 assets |
| `VAPID_PUBLIC_KEY` | Phase 3 | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | Phase 3 | Web Push VAPID private key |
| `VAPID_SUBJECT` | Phase 3 | `mailto:` address for VAPID |
| `TOUCHPOINT_HMAC_SECRET` | Yes | Signs QR touchpoint tokens |
| `PORT` | No | Defaults to `3001` |
| `CORS_ORIGIN` | No | Defaults to `http://localhost:3000` |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (no trailing slash) |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL (same host, `ws://` or `wss://`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key (matches backend) |
| `NEXT_PUBLIC_APP_ENV` | `development` or `production` (controls SW) |

---

## Key Features

### Attendee App (`/`)

| Screen | Description |
|---|---|
| Onboarding | Sign up by name + email; matched against invitee list; walk-ins flagged for approval |
| Home | Current session card, personalized "For You" suggestions, daily progress ring |
| Agenda | Full 3-day schedule; per-session detail + feedback |
| Activities | Trivia, Prompt Challenge, Golden Points, Touchpoints, Avatar Studio |
| Profile | Points total, rank, 3-ring progress (Attend / Engage / Connect), leaderboard |

### Activities

| Activity | Points | Notes |
|---|---|---|
| Title Trivia | ≤ 250 | 50 questions, 5 pts each, one-shot |
| Prompt Challenge | ≤ 250 | 5 questions × 50 pts, one-shot each |
| Golden Points | 0–100 | AI-scored free-text response (Claude Haiku); 5 tiers |
| Touchpoint QR Scans | 30 pts × N locations | HMAC-signed QR codes |
| Avatar Studio | 150 pts | 50 pts generate + 100 pts kiosk print claim |

### Admin Panel (`/admin`)

URL-only entry point, desktop browser only (blocked in PWA mode).

| Tab | What It Does |
|---|---|
| Dashboard | Live stats: users, GP queue, touchpoints, avg score |
| Users | Search all users; Pending tab for walk-in approvals; expand any card to adjust points |
| Golden Pts | Read-only AI scoring viewer; filter by status |
| Announce | Create / delete event-wide announcements |
| Activities | Toggle any activity open or closed |
| Agenda | Create, edit, and delete sessions (grouped by day) |
| Invitees | CSV bulk upload or add one at a time; search with registered badge |
| Audit Log | Every admin action logged with email, timestamp, and full payload |

---

## Architecture Notes

### Authentication

- **Attendees:** `POST /v1/auth/signup` or `/login` with `{ name, email }` — no password. Token stored in `localStorage` as `agentx_token`. 7-day JWT.
- **Admins:** `POST /v1/admin/auth/login` with `{ email, password }`. bcrypt-hashed passwords in separate `AdminUser` table. Token stored as `agentx_admin_token`. 24-hour JWT, separate signing secret, `aud: 'admin'` claim.

### Job Workers

Avatar generation and Golden Points AI scoring run as async background workers polling a `jobs` table via `FOR UPDATE SKIP LOCKED`. Workers run in the same Node.js process as the API (started in `src/workers/index.ts`). Batch size: 5 concurrent jobs. Retry: 3 attempts with exponential backoff.

### Offline Support

Activity submissions are queued in IndexedDB (Dexie) and replayed on reconnect. Each submission carries a `dedupeKey` (UUID) — the backend's UNIQUE constraint on `client_dedupe_key` makes retries fully idempotent. Navigation failures while offline serve a cached `offline.html` via the service worker.

### Audit Log

Every mutating admin operation writes an `AuditLog` row in the same Prisma `$transaction` as the data change. This guarantees the log is always consistent with actual database state.

---

## Deployment

See [`docs/deployment.md`](docs/deployment.md) for the full step-by-step guide covering Railway, Vercel, Supabase, and Cloudflare R2.

**Quick summary:**
1. Fork/clone repo, create Railway project (backend + Redis), create Vercel project (frontend)
2. Set all required environment variables (see table above)
3. Railway auto-builds on push: `npm ci && prisma generate && tsc`; runs `prisma migrate deploy` as release command
4. Vercel auto-builds on push; set root directory to `frontend/`
5. Generate VAPID keys once: `npx web-push generate-vapid-keys`

---

## Testing

```bash
# Backend — unit + integration (Vitest)
cd backend && npm test

# Load tests (requires running backend + k6)
k6 run k6/trivia.js
k6 run k6/golden-points.js
```

95 tests in the backend suite covering: auth flows, all activity endpoints, dedupe/idempotency, scoring tiers, worker retry logic. See [`docs/tests-backend.md`](docs/tests-backend.md) and [`docs/tests-load.md`](docs/tests-load.md).

---

## Documentation

| Doc | What It Covers |
|---|---|
| [`docs/backend.md`](docs/backend.md) | Full API reference, schema, worker architecture |
| [`docs/frontend.md`](docs/frontend.md) | Component structure, design tokens, offline strategy |
| [`docs/deployment.md`](docs/deployment.md) | Step-by-step production setup |
| [`docs/progress.md`](docs/progress.md) | Build phase tracker, task status, decisions log |
| [`CHANGELOG.md`](CHANGELOG.md) | Weekly changelog for the full team |
| [`docs/tests-backend.md`](docs/tests-backend.md) | Test suite structure and running instructions |
| [`docs/tests-load.md`](docs/tests-load.md) | k6 load test scenarios and thresholds |
| [`docs/worker.md`](docs/worker.md) | Job worker design, retry logic, concurrency |
| [`docs/notifications.md`](docs/notifications.md) | Push notification setup and VAPID configuration |

---

## Event Details

**WFG Executive Summit 2026**
- Date: June 3–5, 2026
- Venue: Opal Grand Resort, Delray Beach, FL
- Expected attendance: 300–400

The app is in use for 3 days only. It is designed for attendees aged 40–60 on mobile devices (iOS Safari and Android Chrome primary targets).
