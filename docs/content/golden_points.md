# Golden Points Activity

## Overview

Golden Points is the AI-scored written reflection activity at the WFG Executive Summit 2026. Attendees answer a single open-ended question about pain points in the title/escrow/real estate closing industry. Their response is scored by Claude Haiku on four dimensions, and points are awarded instantly without any human review gate.

The activity is one-shot per event: each user gets exactly one submission.

---

## User Flow

### 1. Landing on the Activity

The user navigates to `/activities/golden-points`. The page shows:

- The question prompt
- A textarea with a live word counter
- Cue chips that append topic suggestions to the textarea (e.g., "Reducing closing delays", "Wire fraud prevention", "Title search automation")
- A "Submit" button that is disabled until the 50-word minimum is met

### 2. Writing a Response

The user types (or builds using cue chips) a response. The word count updates in real time. Submission is blocked below 50 words.

### 3. Submitting

On submit:
- The frontend POSTs to `POST /v1/activities/golden-points/submit`
- The UI transitions to a `scoring` state with a spinner
- A push notification prompt appears: "Get notified when your score is ready?"

### 4. Polling for Results

The frontend polls `GET /v1/activities/golden-points/:id` every 2 seconds until the status is `scored`. Scoring typically completes within a few seconds.

### 5. Results Screen

Once scored, the page displays:
- Points earned (one of: 0, 25, 50, 75, or 100)
- AI-generated feedback explaining the score
- A trophy icon for non-zero scores

If the user navigates away and returns, the second `POST /submit` call returns the existing submission ID and the polling resumes seamlessly.

---

## Submission Validation

| Rule | Detail |
|---|---|
| Minimum length | 100 characters (enforced on frontend and backend) |
| One-shot | A second submit returns the existing submission ID — no new record is created |
| Activity must be open | Submissions are rejected with 400 if the activity's `isOpen` flag is false |
| Authentication | JWT required; 401 without a valid token |

---

## Scoring Mechanism

Scoring is fully automated using Claude Haiku (`claude-haiku-4-5-20251001`). The system prompt (~1100 tokens) is cached via Anthropic prompt caching for cost efficiency.

### Four Dimensions (each 0–25 points)

| Dimension | Top tier (20–25 pts) | Bottom tier (0–9 pts) |
|---|---|---|
| **Specificity** | Names concrete, actionable pain points | Vague platitudes with no specifics |
| **Relevance** | Grounded in title/escrow/real estate closing | Off-topic or only tangentially related |
| **Depth** | Explains root cause + proposes a concrete tech solution | Only describes a problem or only names a technology |
| **Authenticity** | Sounds like real professional experience | Reads as auto-generated or copied |

### Score Tiers → Points Mapping

| AI Score (0–100) | Points Awarded | Submission Status |
|---|---|---|
| 0–29 | 0 | `rejected` |
| 30–49 | 25 | `ai_scored` |
| 50–74 | 50 | `ai_scored` |
| 75–89 | 75 | `ai_scored` |
| 90–100 | 100 | `ai_scored` |

The AI score is the sum of four dimension scores, each clamped to [0, 25] before summation. The total is then mapped to the nearest tier. AI scoring is final — there is no human override step.

---

## Async Job Architecture

```
User submits text
       │
       ▼
POST /submit → creates GoldenPointsSubmission (status: pending)
             → enqueues Job { type: golden_points_scoring }
             → returns { id }
       │
       ▼
Worker picks up job
       │
       ├─ calls scoreGoldenPoints(text, question)
       │        └─ Claude Haiku → aiScore (0–100), aiFeedback
       │
       └─ DB transaction:
            ├─ update GoldenPointsSubmission { aiScore, aiFeedback, status, pointsAwarded }
            ├─ upsert UserScore { totalPoints += pointsAwarded, activitiesCompleted += 1 }
            └─ mark Job complete
             → fire-and-forget push notification
```

The submission record stays `pending` until the worker completes. If the scoring provider is down, the submission remains `pending` indefinitely — there is no automatic fallback to base points.

---

## Database Models

### `GoldenPointsSubmission`

| Field | Type | Notes |
|---|---|---|
| `id` | String (CUID) | Primary key |
| `userId` | String | FK → User |
| `text` | String | Full submission text |
| `wordCount` | Int | Stored at submission time |
| `aiScore` | Int? | Raw score 0–100; null until scored |
| `aiFeedback` | String? | AI-generated feedback text |
| `aiScoredAt` | DateTime? | Timestamp of scoring |
| `status` | Enum | `pending` / `ai_scored` / `flagged_for_review` / `approved` / `rejected` |
| `pointsAwarded` | Int | Default 0; set after scoring |
| `reviewedByAdminId` | String? | Reserved for future manual review |
| `reviewedAt` | DateTime? | Reserved for future manual review |
| `createdAt` | DateTime | Submission timestamp |

### `UserScore`

| Field | Type | Notes |
|---|---|---|
| `userId` | String | PK, FK → User |
| `totalPoints` | Int | Sum of all activity points; indexed DESC for leaderboard |
| `activitiesCompleted` | Int | Count of completed activities |
| `updatedAt` | DateTime | Last update timestamp |

---

## API Reference

### Submit Response
```
POST /v1/activities/golden-points/submit
Authorization: Bearer <token>

Body: { text: string }

Response 201: { id: string }
Response 400: { error: "minimum 50 words required" | "activity is not open" }
Response 401: Unauthorized
```

Second call with same user returns `{ id }` of existing submission — no new record created.

### Poll Status
```
GET /v1/activities/golden-points/:id
Authorization: Bearer <token>

Response 200 (pending): { status: "pending" }
Response 200 (scored):  { status: "scored", pointsAwarded: number, feedback: string }
Response 403: Forbidden (another user's submission)
Response 404: Not found
```

---

## Admin View

Admins access `/admin/golden-points` to see all submissions. The view is **read-only** — there are no approve/reject actions.

Each card shows:
- User name, email, avatar initials
- Submission status (color-coded: gray=pending, green=ai_scored, gold=flagged, blue=approved, red=rejected)
- AI score and points awarded
- Expandable section with full submission text and AI feedback

The admin dashboard stat `goldenPointsPending` shows total submission count.

---

## Push Notifications

After scoring completes, a push notification is sent to the user (fire-and-forget — does not block job completion):

- **Title**: Score ready
- **Body**: Points earned + link to `/activities/golden-points` results

Users are prompted to opt in to notifications on the activity page after submitting.

---

## Design Decisions

**One-shot submission** — Prevents gaming by iterating responses. A second POST idempotently returns the existing ID.

**Fully async scoring** — Anthropic API latency is non-deterministic. Submitting into a job queue decouples user response time from AI scoring time.

**Fixed point tiers** — Rather than awarding the raw AI score as points (which would feel arbitrary), responses map to 5 discrete tiers (0, 25, 50, 75, 100). This makes the system feel fair and easy to communicate.

**Prompt caching** — The scoring system prompt is ~1100 tokens and identical for every submission. Anthropic ephemeral caching avoids paying that token cost on every call.

**No human review gate** — AI scoring is final. Admin view exists for visibility/auditing only. This keeps point awards immediate and removes operational overhead.

**Claude Haiku model** — Chosen for low latency and cost at scale. The scoring task (structured JSON output with 4 numeric scores) is well within Haiku's capability.
