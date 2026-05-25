# AgentX — Build Changelog

Tracks what shipped each week, written for the full team (no technical background required).

---

## Week of May 18–25, 2026

Five major areas shipped this week: AI features (Golden Points + Avatar), design overhaul, admin improvements, full deployment setup, and PWA hardening.

---

### What Shipped

#### AI-Scored Responses (Golden Points) — Fully Live

Attendees can now visit the Golden Points activity, type a response to the event's featured industry question, and receive an AI-generated score within seconds — no staff involvement needed.

How it works:
- The attendee writes a response (minimum 50 words) and taps Submit.
- The app sends the response to an AI reviewer that evaluates it across four areas: how specific the insights are, how relevant they are to the title and real estate industry, how deep the thinking goes, and how genuine the response sounds.
- A score between 0 and 100 is awarded, along with written feedback explaining the result. Points are given in steps: 0, 25, 50, 75, or 100.
- Results appear on screen within a few seconds.
- Each attendee gets one submission. A second attempt simply shows the original result — no gaming possible.
- Admins can view every submission and its AI score in the control panel, but the AI's decision is final — no manual override step.

---

#### Notifications When Your Score Is Ready

After submitting a Golden Points response, users are offered the option to receive a phone or desktop notification when their score is ready.

- They can navigate away from the page and get alerted the moment the AI finishes scoring.
- Tapping the notification takes them directly to their results.
- Works on Android, Windows, Mac, and Chrome/Firefox/Edge on any platform.
- iPhone users need to have the app added to their Home Screen first (standard Apple requirement for web notifications).
- If a user denies notifications or their browser doesn't support them, they can still see their results by returning to the page — nothing is lost.

---

#### Admin Control Panel — Login & Live Dashboard

Administrators now have a secure, password-protected login page. Once logged in, they see a live dashboard and a dedicated Golden Points management view.

**Dashboard stats (updated in real time):**
- Total registered attendees
- Number of Golden Points submissions currently being processed by AI
- Number of attendees who have scanned touchpoint locations
- Average Golden Points score across all scored submissions

**Golden Points admin view:**
- Browse every submission with the attendee's name and email
- See the AI score and how many points were awarded
- Expand any submission to read the full response and the AI's written feedback
- Color-coded status badges (pending, scored, rejected)

---

### Improvements

#### Visual Design Overhaul

The app's look was significantly upgraded across all screens.

- Color palette simplified to three core colors: deep navy, royal blue, and amber. Cleaner, more polished, executive feel.
- Profile page redesigned with a full hero section showing the attendee's name, points total, and rank.
- Navigation bar and header refined throughout.
- All admin screens (dashboard, users, Golden Points) rebuilt with the new design language.

---

#### Avatar Studio — Fully Live

Attendees can now create an AI-generated executive portrait.

How it works:
- The attendee takes or uploads a selfie and picks one of two event backdrops.
- The app sends both images to an AI that composites them into a polished executive-style portrait.
- The generated avatar is ready within seconds. The attendee earns 50 points for uploading.
- At the event, attendees can visit a kiosk to claim a printed copy of their avatar for an additional 100 points.
- Selfie photos are deleted from our servers after generation is complete — only the finished avatar is stored.
- The activity awards up to 150 points total (50 for generating, 100 for printing).

Provider: Google Gemini 3 Pro. Storage: Cloudflare R2.

---

#### App Background & Offline Improvements

The app's background service (used for push notifications and caching content for offline access) was upgraded. This ensures smoother, more reliable performance on event day — particularly important given that venue Wi-Fi quality can be unpredictable.

---

### Decisions Made This Week

| Decision | Why |
|---|---|
| AI scoring is final — no human review step | Keeps point awards instant. Removes the need for staff to manually approve or reject submissions on event day. |
| Push notifications built without a third-party service | Reduces vendor dependency. The built-in Web Push standard works natively across all modern browsers and platforms. |
| Admin Golden Points view is read-only | AI is the sole scoring authority. The admin view exists for visibility and auditing only. |
| Avatar provider: Google Gemini 3 Pro | Selected for image generation quality; selfies deleted post-generation to limit data retention. |

---

#### Deployment — Railway + Vercel Ready

The app now has full deployment configuration. Deploying to a live URL is a matter of connecting the repo and setting environment variables.

- **Backend → Railway**: `backend/railway.toml` configures the build (`npm ci + prisma generate + tsc`), release (`prisma migrate deploy`), start (`node dist/index.js`), and health check (`GET /health`). Redis is provisioned as a Railway service.
- **Frontend → Vercel**: `frontend/vercel.json` locks the Next.js framework. Root directory is `frontend/` in the Vercel dashboard.
- A step-by-step setup guide is in `docs/deployment.md` covering all services (Railway, Vercel, Supabase, Cloudflare R2) and every required environment variable.

---

#### PWA — App Is Now Installable and Offline-Resilient

The app now passes all practical PWA requirements for an event deployment.

**Install experience:**
- Android/Chrome users see a native "Add to home screen" prompt with the ES26 logo icon.
- iPhone/Safari users see a step-by-step banner explaining how to use the Share → "Add to Home Screen" flow.
- Both prompts are dismissable and remember the user's choice across sessions.
- Push notification permission is requested on the home page (once, after the install prompt), not buried in the Golden Points activity.

**Offline experience:**
- When a user loses connection while navigating to a new page, they see a branded AgentX offline page instead of the browser's error screen. The page includes a "Try again" reload button.
- A slim amber bar slides in below the header whenever the device loses connection and auto-disappears when it reconnects.
- The offline write queue (for activity submissions made during spotty connections) now automatically retries when the device comes back online. Previously this queue existed but was never activated.

**Icons and branding:**
- App icon is derived from the ES26 logo: 512×512, 192×192, and 180×180 sizes for PWA install and iOS home screen. Favicon generated from the same source.

---

### Decisions Made This Week

| Decision | Why |
|---|---|
| AI scoring is final — no human review step | Keeps point awards instant. Removes the need for staff to manually approve or reject submissions on event day. |
| Push notifications built without a third-party service | Reduces vendor dependency. The built-in Web Push standard works natively across all modern browsers and platforms. |
| Admin Golden Points view is read-only | AI is the sole scoring authority. The admin view exists for visibility and auditing only. |
| Avatar provider: Google Gemini 3 Pro | Selected for image generation quality; selfies deleted post-generation to limit data retention. |
| Offline write queue activated | Queue infrastructure existed but was never wired up. Now initialized on every app mount so venue Wi-Fi drops don't silently lose activity submissions. |
| Offline fallback registered before Serwist | SW fetch handlers fire in registration order; our navigation fallback must intercept before Serwist's default handler to guarantee offline.html is served. |

---

### Still Blocked

| Item | Waiting On |
|---|---|
| Invitee list | WFG Team — needed to pre-load attendee records before the event |
| Production environment variables | Engineering — `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, `OBJECT_STORAGE_*`, and `VAPID_*` keys must be set on the live server before Phase 3 features work |

---

## Week of May 12–17, 2026

Foundation and core activities complete. App connected end-to-end.

### What Shipped

- **Sign-up and login** — Attendees can register using their invite link or walk up and sign in. Sessions stay active across visits.
- **Agenda** — Live schedule delivered from the server, with per-event detail pages. Updates pushed automatically when the schedule changes.
- **Trivia** — Live quiz activity with scoring, deduplication (no double-points on retry), and leaderboard integration.
- **Prompt Challenge** — Five official industry questions, one response per question, scored and stored.
- **Touchpoints** — QR code scanning at event locations, awarding points per unique location scan.
- **Leaderboard** — Live rankings by total points, updated after every activity.
- **Feedback** — Per-session and app-wide feedback forms.
- **Frontend connected to backend** — All screens wired up to the live API. Offline caching active for agenda, profile, and announcements.
- **Admin basics** — Invitee CSV upload, admin login, basic user management.

---

*For build phase details and a full task list, see [progress.md](./progress.md).*
*For technical architecture, see [backend.md](./backend.md) and [frontend.md](./frontend.md).*
