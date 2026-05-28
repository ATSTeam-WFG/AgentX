# Onboarding & Authentication Flow

Complete reference for the ES26 PWA onboarding experience, PWA installation, signup/login, JWT lifecycle, and all edge-case handling.

---

## Overview

The app enforces a **PWA-first** onboarding model. Users must install the app on their Home Screen before they can sign up. This ensures the JWT is always born inside the installed PWA context, eliminating the iOS storage-isolation re-login problem.

```
Browser
  └── / (Welcome + video)
        └── Get Started / Skip Intro
              └── /install  (OS-specific install instructions)
                    ├── iOS:     3-step manual guide → user opens PWA from Home Screen
                    ├── Android: native Chrome install sheet → tab auto-closes
                    └── Desktop: immediate redirect → /onboarding

PWA (standalone)
  └── / (Welcome + video again)
        └── Get Started / Skip Intro
              └── /onboarding  (name + email + role)
                    ├── New user  → /onboarding/interests → /home (+ AppTour)
                    └── Returning → /home  (skip interests)
```

---

## Page-by-Page Flow

### 1. Welcome Page — `app/page.tsx`

First thing every user sees, in both browser and PWA contexts.

**On mount (client-side):**
1. Reads `agentx_token` from `localStorage`
2. If token exists and is not expired → `router.replace('/home')` — bypasses entire flow
3. Detects `standalone` mode: `matchMedia('(display-mode: standalone)') || navigator.standalone`
4. Sets `ready = true`, page renders

**Content:** WFG logo · "Presents" · ES26 logo + "EXECUTIVE SUMMIT 2026" · welcome video (Gene Rebadow) · two CTAs

**CTA routing (forked by context):**
| Context | "Get Started" / "Skip Intro" destination |
|---|---|
| Browser (not standalone) | `/install` |
| PWA standalone | `/onboarding` |
| Valid token present | `/home` (never reaches CTAs) |

Both buttons go to the same destination — "Skip Intro" just skips watching the video, it doesn't skip onboarding.

---

### 2. Install Page — `app/install/page.tsx`

Only reachable from the browser. Explains why installation is needed and guides the user through it.

**Subtitle shown to users:**
> "For the full summit experience, let's get this lightweight app on your Home Screen."

**OS detection (client-side, `useEffect`):**
```
iOS     → /iphone|ipad|ipod/i  → static 3-step guide
Android → /android/i           → native install prompt flow
Other   → router.replace('/onboarding')  (desktop, no gate)
```

#### iOS Branch

Static instructional UI. No button needed — the user follows the OS flow.

| Step | Instruction |
|---|---|
| 1 | Tap Share (↑ box icon at bottom of Safari) |
| 2 | Add to Home Screen |
| 3 | Tap Add, open ES26 |

- **"Already added?" hint** — for users who completed the steps and are still viewing this page in Safari: "Open ES26 from your Home Screen."
- **"Continue" button** — lets users proceed to `/onboarding` without installing. Amber, same weight as the install CTA. No user is forced.

#### Android Branch

Three states driven by browser events:

| State | Trigger | UI |
|---|---|---|
| `available` | `beforeinstallprompt` event captured | "One last step" + amber **Install** button + amber **Continue** button |
| `installing` | User tapped Install, OS sheet is open | Spinner + "Installing…" |
| `installed` | `appinstalled` event fires | Checkmark + "ES26 Installed!" + **Close Tab** button |

On `appinstalled`:
- `window.close()` fires after 800ms (auto-close attempt)
- If Chrome blocks it (direct-navigation tabs), the **Close Tab** button gives the user a manual trigger from within a user gesture

**2-second timeout fallback:** If `beforeinstallprompt` never fires (already installed, or unsupported browser like Firefox/Samsung), silently redirects to `/onboarding`.

#### "Continue" Button

Present on both iOS and Android `available` states. Routes directly to `/onboarding`. No user is forced to install — it's strongly encouraged, not mandatory.

---

### 3. Onboarding Page — `app/onboarding/page.tsx`

Reached only from the PWA standalone context (or via "Continue" in browser).

**Fields:**
- Full Name
- Email Address
- "I am attending as…" — role picker (Title Agent / WFG Employee / Guest)

> **Note:** The role picker is UI-only. It is never sent to the backend and has no effect on the user record. The actual attendee classification (`invited` vs `walk_in`) is determined server-side by whether the email exists in the `Invitee` table.

**On submit** — calls `POST /v1/auth/login` (which doubles as signup):

```
Email in Invitee table + no User yet  →  creates User (attendeeType: invited, pendingAdminApproval: false)
Email NOT in Invitee table            →  creates User (attendeeType: walk_in, pendingAdminApproval: true)
                                          only if checkin_open feature flag is true
Email already has a User record       →  logs in, updates lastSeenAt and name
```

**Routing after response:**
| `isNewUser` | `pendingAdminApproval` | Destination |
|---|---|---|
| `true` | `false` | `/onboarding/interests` |
| `true` | `true` | `/onboarding/interests` (interests saved, but home shows pending state) |
| `false` | — | `/home` (returning user, skip interests) |

On success: `setAuth(user, token)` — stores JWT in `localStorage` and populates Zustand store.

---

### 4. Interests Page — `app/onboarding/interests/page.tsx`

New users only.

**Options (multi-select):**
- Networking & Connections
- Leadership & Growth
- AI & Technology
- Business Strategy
- Recognition & Awards

On submit: `PATCH /v1/me` with `{ onboardingInterests: [...] }` — non-blocking, errors are swallowed. Whether it succeeds or fails, the user is pushed to `/home`.

Also clears `localStorage.tour_done` so the App Tour triggers on the next render.

---

### 5. App Tour — `components/onboarding/AppTour.tsx`

An overlay rendered inside `app/(app)/layout.tsx`, not a separate route.

**Trigger:** `localStorage.getItem('tour_done')` is absent.

**5 steps** (spotlight highlights each tab bar item + FAB):
1. Home
2. Agenda
3. Explore
4. Activities
5. Profile

On complete or skip: `localStorage.setItem('tour_done', '1')` — never shown again on this device.

---

## JWT & Session Architecture

### What's in the Token

```
Header: { alg: "HS256" }
Payload: {
  sub:          userId,
  tokenId:      sessionId (UUID),
  name:         user.name,
  email:        user.email,
  attendeeType: "invited" | "walk_in",
  iat:          issuedAt,
  exp:          issuedAt + 7 days
}
```

The token embeds `name`, `email`, and `attendeeType` so cold-start rehydration (PWA fresh launch, page reload) works immediately without an API call.

### Token Storage

| Key | Value | Scope |
|---|---|---|
| `agentx_token` | User JWT | `localStorage` |
| `agentx_admin_token` | Admin JWT | `localStorage` |

### Session Record (DB)

Every login/signup creates a `Session` row:

```
Session {
  tokenId:    UUID (matches JWT claim)
  userId:     FK
  expiresAt:  now + 7 days
  revokedAt:  null (set on logout or admin revocation)
  lastUsedAt: updated on /refresh
}
```

The `authenticate` middleware only verifies the JWT signature and expiry — it does **not** check the Session table on every request. Session validation only happens on `/v1/auth/refresh`.

---

## Cold-Start Rehydration

On every fresh PWA launch, the Zustand auth store is empty (in-memory, not persisted). `app/(app)/layout.tsx` rehydrates it:

```
readToken() from localStorage
  ├── null or expired → clearAuth() + router.replace('/') → Welcome page
  └── valid
        decodeToken() → { sub, name, email, attendeeType, exp }
        setAuth({ id: sub, name, email, attendeeType, ... }, token)
        → App renders with correct user immediately
```

Home and Profile pages also call `GET /v1/me` (React Query, staleTime 60s, retry 1) which refreshes the profile data including points, rank, and activitiesCompleted — fields not stored in the JWT.

---

## Platform Behavior: Browser → PWA Storage

| Platform | localStorage shared between browser and PWA? | Result |
|---|---|---|
| iOS Safari → Add to Home Screen | **No** — completely isolated | User must re-enter name + email. Backend finds existing account (`isNewUser: false`) → `/home` directly. ~15 sec friction. |
| Android Chrome → Install PWA | **Yes** — same Chrome profile, same origin | Token travels. Cold-start rehydration runs. User is already logged in. No friction. |

The PWA-first install gate mitigates the iOS case: since signup happens *after* install, the JWT is always created inside the correct storage context.

---

## JWT Lifecycle Scenarios

### Normal Use (within 7 days)

```
Open PWA → layout rehydrates from localStorage → app works
getMe() refreshes profile data in background
```

### Token Expired (>7 days since last login)

```
Open PWA → isTokenExpired() → true → clearAuth() → router.replace('/')
User sees Welcome page → taps Get Started → /onboarding (standalone)
Login returns isNewUser: false → /home directly
```

**Active risk for testers:** Anyone who signs in more than 7 days before the event will have an expired token on event day. The `/v1/auth/refresh` endpoint exists but is not called automatically. Manual re-login takes ~15 seconds (name + email, no password).

### Admin Revokes Session

The client continues working with a valid JWT until expiry. The revocation only blocks future `/refresh` calls. No real-time invalidation.

### Offline

Zustand stays populated in-memory. React Query serves stale cached data. Write operations queue to IndexedDB via the outbox (`lib/outbox.ts`) and flush automatically on reconnect.

---

## Auth Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/auth/login` | None | Login or signup. Returns `{ token, user, isNewUser, status }` |
| `POST` | `/v1/auth/signup` | None | Explicit signup (same logic as login for new emails) |
| `POST` | `/v1/auth/refresh` | Bearer | Rotates token. Validates session in DB. Returns `{ token }` |
| `POST` | `/v1/auth/logout` | Bearer | Sets `revokedAt` on session |

### Login / Signup Response Shape

```json
{
  "token": "<jwt>",
  "isNewUser": true,
  "user": {
    "id": "uuid",
    "name": "Alex Johnson",
    "email": "alex@wfgtitle.com",
    "attendeeType": "invited",
    "pendingAdminApproval": false
  },
  "status": "active"
}
```

`status` is `"pending_approval"` for walk-in users until an admin approves them.

---

## Key Files

| File | Role |
|---|---|
| `app/page.tsx` | Welcome page, token check, standalone detection, CTA fork |
| `app/install/page.tsx` | PWA install gate — iOS steps, Android native prompt |
| `app/onboarding/page.tsx` | Name/email/role form, login API call |
| `app/onboarding/interests/page.tsx` | Interest selection, PATCH /v1/me |
| `app/onboarding/tour/page.tsx` | Legacy tour route (unused — AppTour component is used instead) |
| `components/onboarding/AppTour.tsx` | 5-step spotlight tour overlay |
| `app/(app)/layout.tsx` | Cold-start JWT rehydration, outbox init, feature flags fetch |
| `lib/auth.ts` | `saveToken`, `readToken`, `decodeToken`, `isTokenExpired`, `JwtClaims` |
| `store/auth.ts` | Zustand auth store — `user`, `token`, `setAuth`, `clearAuth` |
| `lib/api/auth.ts` | `login()`, `refreshToken()` API calls |
| `backend/src/routes/auth.ts` | Auth endpoints, `signUserJwt`, session management |
| `backend/src/plugins/auth.ts` | `authenticate` / `authenticateAdmin` middleware |
