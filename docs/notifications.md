# AgentX — Push Notifications

**Implemented:** 2026-05-22  
**Scope:** Web Push (VAPID) for Golden Points AI scoring completion. Architecture is designed to extend to other triggers (announcements, agenda changes, leaderboard milestones).

---

## 1. Overview

Push notifications are delivered via the **Web Push Protocol (RFC 8030)** using **VAPID authentication (RFC 8292)**. No third-party service (Firebase, OneSignal) is used. The `web-push` npm package handles VAPID signing and HTTP delivery to browser push services.

The only active trigger is **Golden Points scoring completed** — when the AI worker finishes scoring a user's submission, a push is sent to all of that user's subscribed devices.

---

## 2. Platform Support

| Platform | Support | Requirement |
|---|---|---|
| Android Chrome / Edge / Samsung Browser | Full | None |
| Desktop Chrome / Edge / Firefox | Full | None |
| macOS Safari 16+ | Full | None |
| **iOS Safari 16.4+** | Full | **PWA must be installed to Home Screen** |
| iOS browser tab (not installed) | None | Install prompt required |

On iOS, Safari routes Web Push through APNs internally — this is transparent to the developer. The VAPID implementation works identically across all platforms.

**iOS install requirement:** Users who open the PWA in Safari's browser tab will not receive push. The `getPushState()` function in `frontend/lib/push.ts` returns `'unsupported'` when `PushManager` is absent, so no prompt is shown. A separate "Add to Home Screen" guide should be surfaced during onboarding for iOS users.

---

## 3. Architecture

```
[User subscribes on GP page]
        │
        ▼
browser PushManager.subscribe(VAPID_PUBLIC_KEY)
        │  → returns { endpoint, keys: { p256dh, auth } }
        ▼
POST /v1/push/subscribe
        │  → upsert PushSubscription row (userId, endpoint, p256dh, auth)
        ▼
[GP worker finishes AI scoring]
        │
        ▼
prisma.$transaction() commits score + job=done
        │
        ▼
sendPushToUser(userId, payload)
        │  → prisma.pushSubscription.findMany({ where: { userId } })
        │  → webPush.sendNotification(endpoint, JSON.stringify(payload))
        │    (uses VAPID headers; browser push service routes to device)
        ▼
Service Worker push event fires (device wakes up)
        │  → self.registration.showNotification(title, options)
        ▼
User taps notification
        │  → notificationclick event
        │  → clients.openWindow('/activities/golden-points')
```

The push call in the worker is **fire-and-forget** — it does not block job completion and never throws. The transaction is already committed before push is attempted. If push fails, the scoring result is still persisted and visible via polling.

---

## 4. Database Schema

```prisma
model PushSubscription {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}
```

**Key design decisions:**

- `endpoint` is `@unique` — each browser/device/origin combination gets its own row. One user on two devices = two rows. Correct.
- `onDelete: Cascade` — deleting a `User` purges all their push subscriptions automatically.
- The `upsert` on `endpoint` in the subscribe route handles re-subscription (e.g. after a permission reset) without creating duplicates.
- Stale subscriptions (push service returns HTTP 410 or 404) are deleted automatically by `sendPushToUser`. No cleanup job needed.

**Migration:** `backend/prisma/migrations/20260522000000_add_push_subscriptions/migration.sql`

---

## 5. Environment Variables

### Backend (`backend/.env`)

```
VAPID_PUBLIC_KEY=<base64url>     # generated once, shared with frontend
VAPID_PRIVATE_KEY=<base64url>    # server-side only, never exposed to client
VAPID_CONTACT_EMAIL=admin@wfgtitle.com
```

All three are **required** — the Zod schema in `backend/src/config.ts` will `process.exit(1)` if any are missing.

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same base64url as VAPID_PUBLIC_KEY above>
```

The public key must match exactly. A mismatch causes the push service to return HTTP 401 on every send, which is logged by the backend but swallowed (user receives no notification).

### Key Generation

Run once and save both outputs:

```bash
cd backend
npx web-push generate-vapid-keys --json
# → { "publicKey": "...", "privateKey": "..." }
```

Keys are stable for the lifetime of the app — regenerating them invalidates all existing push subscriptions.

---

## 6. Backend Implementation

### `backend/src/lib/push.ts`

The only file that imports `web-push`. VAPID details are set once at module load time.

```
sendPushToUser(userId, { title, body, url })
```

- Queries all `PushSubscription` rows for `userId`
- Sends to each in parallel via `Promise.allSettled` (one stale sub does not block others)
- TTL is 3600 seconds — if the device is offline for more than an hour, the push service drops it
- HTTP 410 / 404 responses → subscription is deleted from DB
- Any other error → logged, swallowed

### `backend/src/routes/push.ts`

Registered at `/v1/push`. Requires user auth (same `authenticate` preHandler as all user routes).

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/push/subscribe` | Save or refresh a subscription. Body: `{ endpoint, keys: { p256dh, auth } }`. Returns `201 { ok: true }`. |
| `DELETE` | `/v1/push/subscribe` | Explicit unsubscribe. Body: `{ endpoint }`. Returns `200 { ok: true }`. |

The POST uses `upsert` on `endpoint` — safe to call multiple times (e.g. on every app boot to refresh a potentially-rotated subscription).

### `backend/src/workers/golden-points.ts`

Push fires immediately after the scoring transaction commits:

```typescript
sendPushToUser(submission.userId, {
  title: 'Your Golden Points score is in!',
  body:  `You scored ${result.aiScore}/100 and earned ${result.pointsAwarded} pts. Tap to see your feedback.`,
  url:   '/activities/golden-points',
}).catch(() => {})
```

The `.catch(() => {})` makes the call truly fire-and-forget — even if `sendPushToUser` unexpectedly throws, the worker continues normally.

---

## 7. Frontend Implementation

### `frontend/lib/push.ts`

Pure browser utilities — no React state, no hooks. Two exports:

```typescript
getPushState(): 'unsupported' | 'default' | 'granted' | 'denied'
```
Checks for `PushManager` availability (returns `'unsupported'` if absent or SSR) and returns the current `Notification.permission` value. Safe to call on every render.

```typescript
requestAndSubscribe(): Promise<'granted' | 'denied' | 'unsupported'>
```
Full subscription flow in one call: requests permission → creates `PushSubscription` via `PushManager.subscribe()` → POSTs to `/v1/push/subscribe`. Re-uses an existing subscription if one already exists (does not re-prompt the browser).

The `urlBase64ToUint8Array` helper converts the VAPID public key from base64url to `Uint8Array<ArrayBuffer>` as required by `PushManager.subscribe({ applicationServerKey })`.

### `frontend/lib/api/push.ts`

API module following the same pattern as `lib/api/activities.ts`:

```typescript
subscribePush(body: PushSubscribeBody): Promise<{ ok: boolean }>
unsubscribePush(endpoint: string): Promise<{ ok: boolean }>
```

### `frontend/app/sw.ts`

Two event handlers added after `serwist.addEventListeners()`:

**`push` event** — parses the JSON payload (`{ title, body, url }`), calls `showNotification()` with:
- `tag: 'gp-score'` — collapses multiple rapid notifications (e.g. a worker retry) into one OS notification
- `renotify: false` — no re-vibration on collapse
- `data: { url }` — passed through to the click handler

**`notificationclick` event** — closes the notification, then either focuses an already-open window of the app and navigates it to the target URL, or opens a new window if the app is closed.

### `frontend/app/(app)/activities/golden-points/page.tsx`

The notification prompt is shown during the `scoring` state (after submit, while polling). It transitions through states:

| `pushState` | Rendered UI |
|---|---|
| `idle` | "Get notified when your score is ready?" + "Notify me" button |
| `asking` | "Waiting for permission…" |
| `granted` | "You'll be notified when scoring is done." |
| `denied` | Nothing (browser blocked — cannot re-prompt) |
| `unsupported` | Nothing (SW not active, i.e. dev mode or incompatible browser) |

On mount, `getPushState()` is called to initialise from the browser's existing permission state. If the user already granted permission in a previous session, `pushState` is set to `'granted'` immediately and no prompt is shown — the existing subscription is reused.

---

## 8. Service Worker and Dev Mode

The service worker is compiled only in production builds. `next.config.ts`:

```typescript
withSerwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NEXT_PUBLIC_APP_ENV !== "production",
})
```

`NEXT_PUBLIC_APP_ENV` is `development` in `.env.local` by default. To test push locally:

1. Set `NEXT_PUBLIC_APP_ENV=production` in `frontend/.env.local`
2. Run `npm run build && npm run start` (not `npm run dev`)
3. Use Chrome DevTools → Application → Service Workers to inspect SW state
4. Use Application → Push to simulate a push event without a backend trigger

**Note:** `npm run dev` never registers a service worker regardless of `NEXT_PUBLIC_APP_ENV`. Only a production build does.

---

## 9. Extending to Other Notification Types

The architecture is ready to support additional triggers. For each new trigger:

**Backend:** call `sendPushToUser(userId, { title, body, url })` at the appropriate point in the handler or worker. The `url` field controls where tapping the notification navigates.

**Service worker:** The current `push` event handler is generic — it reads `title`, `body`, and `url` from the payload. No SW changes are needed for new notification types unless you want different `tag` values (to prevent collisions between notification types, use a distinct tag per type rather than a single `'gp-score'` tag).

**Notification types planned for future implementation:**

| Trigger | Handler location | Suggested `url` |
|---|---|---|
| Announcement published | `POST /v1/admin/announcements` route | `/home` |
| Agenda event changed | `PATCH /v1/admin/agenda/:id` route | `/agenda` |
| Leaderboard rank milestone | `UserScore` update utility | `/profile` |
| Activity closing soon | Scheduled job (cron-like) | `/activities` |

---

## 10. Testing Checklist

1. `npx prisma migrate deploy` — confirm `PushSubscription` table exists in Supabase Studio
2. `next build && next start` with `NEXT_PUBLIC_APP_ENV=production` — confirm `public/sw.js` is generated
3. Navigate to `/activities/golden-points` in Chrome
4. Submit a response — confirm "Get notified when your score is ready?" prompt appears
5. Click "Notify me" — OS permission dialog fires → Allow
6. DevTools Network: `POST /v1/push/subscribe` → HTTP 201
7. Supabase Studio: confirm row in `PushSubscription` for your userId
8. Backend logs: after worker scores → `[push]` log line appears
9. OS notification appears within ~5 seconds
10. Tap notification → app opens/focuses at `/activities/golden-points`
11. **Stale sub test:** manually corrupt an `endpoint` value in Supabase → trigger another submission → confirm the row is deleted after the 410 response

---

## 11. Known Limitations

**iOS install requirement.** Users on iOS who haven't added the PWA to their Home Screen will silently get no prompt. An onboarding nudge for iOS users is not yet implemented.

**No subscription on `done` state.** If the user navigates away from the GP page before the scoring state is rendered (unlikely — scoring triggers immediately on submit), they'll never see the prompt. This is an acceptable edge case; the polling result is visible when they return.

**`NEXT_PUBLIC_APP_ENV=production` needed locally.** Developers testing push on their own machine must build for production. The dev server never runs the service worker.

**Single push topic.** All GP score notifications share `tag: 'gp-score'`. If a user submits multiple times across sessions (impossible due to one-shot constraint) or a worker retry fires twice, the second notification replaces the first silently. Not a real issue in practice.
