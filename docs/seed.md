# Seed Data Reference

Source: `backend/prisma/seed.ts` → `backend/src/lib/seeder.ts`

Run with: `npx prisma db seed` (from `backend/`)

---

## Admin

| Field         | Value                  |
|---------------|------------------------|
| Email         | admin@es26.com         |
| Password      | executiveSum@26        |
| Role          | super_admin            |

---

## Invitees

Placeholder test records only — not real attendees.

| Email          | Name           | Type    |
|----------------|----------------|---------|
| alice@wfg.com  | Alice Agent    | invited |
| bob@wfg.com    | Bob Broker     | invited |
| carol@wfg.com  | Carol Manager  | invited |

---

## Agenda

All times stored as UTC. Event location: Delray Beach, FL (EDT = UTC−4).

### Day 1 — Wednesday, June 3

| ID                   | Name                        | Time (EDT)        | Location          | Speaker       |
|----------------------|-----------------------------|-------------------|-------------------|---------------|
| seed-agenda-d1-wls   | Women's Leadership Seminar  | 1:00–5:15 PM      | Opal Grand Resort | Amy Franko    |

### Day 2 — Thursday, June 4

| ID                           | Name                                                  | Time (EDT)         | Location                    | Speaker                                                          |
|------------------------------|-------------------------------------------------------|--------------------|-----------------------------|------------------------------------------------------------------|
| seed-agenda-d2-breakfast     | Breakfast                                             | 7:30–8:30 AM       | Main Hall                   | —                                                                |
| seed-agenda-d2-opening-remarks | Opening Remarks                                     | 8:45–8:55 AM       | Main Hall                   | WFG Leadership                                                   |
| seed-agenda-d2-q2-economic   | What's Next: The Q2 Economic Perspective              | 9:00–9:45 AM       | Main Hall                   | Patrick F. Stone · Bill Conerly                                  |
| seed-agenda-d2-agent30       | Agent 3.0: Amplify Your Edge                          | 9:50–10:00 AM      | Main Hall                   | Gene Rebadow                                                     |
| seed-agenda-d2-beyond-faster | Beyond Faster: Turn AI from Commodity into Competitive Advantage | 10:05–10:50 AM | Main Hall            | Julie Holmes                                                     |
| seed-agenda-d2-ats-team      | ATS Team: Custom AI Solutions for Title Agents        | 10:50–11:20 AM     | Main Hall                   | Ryan Ozonian · Vedant Upganlawar · Priyal Katudia · Anish Tatke · Wendy Lunt |
| seed-agenda-d2-real-talk     | Real Talk: How Title Agents Actually Use AI Solutions in Their Business | 11:25–11:45 AM     | Main Hall                   | Roxanne Kos · Jaime Kosofsky · Hope Ottovini · Leo Fousekis      |
| seed-agenda-d2-networking-lunch | Networking Lunch                                   | 12:00–1:00 PM      | Main Hall                   | —                                                                |
| seed-agenda-d2-ai-shift      | The AI Shift: What Title Agents Need to Know          | 1:00–1:30 PM       | Main Hall                   | Mo Choumli · Michael Ruder · Wendy Lunt                          |
| seed-agenda-d2-ai-search     | AI Search: Helping You Get Found on AI Platforms      | 1:30–2:00 PM       | Main Hall                   | Jeff Lobb                                                        |
| seed-agenda-d2-breakout-ai-101 | Don't Get Left Behind: AI for the Modern Title Agent | 2:15–3:00 PM      | Main Hall — Breakout Rooms  | —                                                                |
| seed-agenda-d2-breakout-workflow | Replace the Busy Work: Automate, Accelerate, Dominate Your Workflow | 3:00–3:45 PM | Main Hall — Breakout Rooms | —                                                      |
| seed-agenda-d2-ats-demo      | ATS Demo Room — Hands-On AI Demos                     | 2:15–3:35 PM       | ATS Demo Room               | Vedant Upganlawar · Priyal Katudia · Anish Tatke                 |
| seed-agenda-d2-awards        | Top Agent Awards                                      | 6:00–9:30 PM       | Seacrest Ballroom           | WFG Leadership                                                   |
| seed-agenda-d2-after-party   | After Party                                           | 9:30–10:30 PM      | Seacrest Ballroom           | —                                                                |

### Day 3 — Friday, June 5

| ID                      | Name        | Time (EDT)       | Location          | Speaker |
|-------------------------|-------------|------------------|-------------------|---------|
| seed-agenda-d3-departures | Departures | 7:00 AM–12:00 PM | Opal Grand Resort | —       |

> Agenda upsert strategy: deletes any `AgendaEvent` rows whose IDs are not in the seeded set, then upserts each event. `update: {}` means re-runs do not overwrite manual edits.

---

## Sponsors

Logos are served from Cloudflare R2 CDN (`https://pub-9849080621014a8e9c12e5989f01a96e.r2.dev/sponsors/`).

Run `npx tsx scripts/upload-sponsor-logos.ts` from `backend/` to upload assets (requires a network that is not blocked by WFG proxy — use a hotspot or request InfoSec to whitelist `*.r2.cloudflarestorage.com`).

All tiers are set to `partner` by default — update individually once tier assignments are confirmed.

Upsert strategy: deletes any `Sponsor` rows whose IDs are not in the seeded set, then upserts each sponsor. `update: {}` means re-runs do not overwrite manual edits.

| ID                          | Name               | Tier    | Logo file                   | Website                          | Order |
|-----------------------------|--------------------|---------|-----------------------------|----------------------------------|-------|
| seed-sponsor-qualia         | Qualia             | partner | qualia-logo.png             | qualia.com                       | 1     |
| seed-sponsor-closinglock    | Closinglock        | partner | closinglock-logo.jpg        | closinglock.com                  | 2     |
| seed-sponsor-bear-printing  | Bear Printing      | partner | bear-printing-logo.png      | bearprinting.com                 | 3     |
| seed-sponsor-pythonic       | Pythonic           | partner | pythonic-logo.png           | —                                | 4     |
| seed-sponsor-capital-bank   | Capital Bank, N.A. | partner | capital-bank-logo.jpg       | capitalbankmd.com                | 5     |
| seed-sponsor-alanna         | alanna.ai          | partner | alanna-logo.png             | alanna.ai                        | 6     |
| seed-sponsor-datatrace      | DataTrace          | partner | datatrace-logo.png          | datatracetitle.com               | 7     |
| seed-sponsor-signature-xcel | Signature Xcel     | partner | signature-xcel-logo.jpg     | signaturexcel.com                | 8     |
| seed-sponsor-connect        | Connect Services   | partner | connect-logo.svg            | connectservices.com              | 9     |
| seed-sponsor-palmagent      | PalmAgent          | partner | palmagent-logo.png (`dark`) | palmagent.com                    | 10    |

> Bear Printing logo source file is 1.8 MB — consider optimizing before upload.

---

## Initiatives

Upsert strategy: deletes any `Initiative` rows whose IDs are not in the seeded set, then upserts each initiative.

Visual display fields (`mono`, `color`, `bg`) are UI-only and remain hardcoded in `frontend/app/(app)/explore/page.tsx`.

| ID                           | Name             | Team                              | Rollout status               | Order |
|------------------------------|------------------|-----------------------------------|------------------------------|-------|
| seed-initiative-eremit       | eRemit           | Payments · Built with Verndale    | Live                         | 1     |
| seed-initiative-fieldiq      | FieldIQ          | Field Sales Intelligence · Live   | Live                         | 2     |
| seed-initiative-myhomeprompt | My Home Prompt   | WFG Advisory · AI Homebuyer Guide | In development, launching 2026 | 3   |

Also-in-the-works list (frontend-only, not seeded): Fraud Detection Tools, Intelligence Briefs, AI Toolkit, Title Survey Processing, FAR/BAR Deadline Tracker.

---

## Announcements

| ID                    | Title                                  | Expires        |
|-----------------------|----------------------------------------|----------------|
| seed-announcement-1   | Welcome to WFG Executive Summit 2026!  | 2026-12-31     |

Body: `"Check the Agenda tab for today's sessions. Activities open at 8am. See you in the main hall!"`

---

## Activities

| ID                       | Name              | Type              | Max Points | One-Shot | Open  | Config                                                                  |
|--------------------------|-------------------|-------------------|------------|----------|-------|-------------------------------------------------------------------------|
| seed-activity-trivia     | Summit Trivia     | `trivia`          | 500        | yes      | yes   | `{ pointsPerQuestion: 10 }`                                             |
| seed-activity-prompt     | Prompt Challenge  | `prompt_challenge`| 100        | no       | yes   | `{ pointsCorrect: 20, pointsWrong: 10 }`                                |
| seed-activity-touchpoint | Touchpoint Scans  | `touchpoint`      | 0          | no       | yes   | null                                                                    |
| seed-activity-avatar     | AI Avatar Creator | `avatar`          | 50         | yes      | **no**| null                                                                    |
| seed-activity-golden     | Golden Points     | `golden_points`   | 100        | yes      | yes   | `{ questionText: "How is AI transforming the title & escrow industry…" }`|

> `isOpen: false` on Avatar — it must be manually opened via admin before attendees can participate.
>
> Activity upsert strategy: `update` refreshes `maxPoints`, `isOpen`, and `configJson` on re-runs (unlike most other entities which use `update: {}`).

---

## Trivia Questions

50 questions, all category `Title & Real Estate`, difficulty `easy`.

> Upsert strategy: deletes questions whose IDs are not in the seeded set, then `createMany` with `skipDuplicates: true`.
>
> **Note:** the vast majority have `correctIndex: 1`. Three exceptions:
> - `seed-trivia-04` — "Who typically pays for the lender's title insurance policy?" → `correctIndex: 2`
> - `seed-trivia-15` — "What is an abstract of title?" → `correctIndex: 0`
> - `seed-trivia-24` — "What is a mechanic's lien?" → `correctIndex: 0`

| ID              | Question (abbreviated)                                           | Correct Answer (index)                                           |
|-----------------|------------------------------------------------------------------|------------------------------------------------------------------|
| seed-trivia-01  | What does "title insurance" protect against?                     | Defects in ownership history (1)                                 |
| seed-trivia-02  | What is a "chain of title"?                                      | A chronological list of ownership records (1)                    |
| seed-trivia-03  | What does "clear title" mean?                                    | Free of liens and legal claims (1)                               |
| seed-trivia-04  | Who typically pays for the lender's title insurance policy?      | The buyer (2)                                                    |
| seed-trivia-05  | What is an "easement"?                                           | A right to use another's land for specific purposes (1)          |
| seed-trivia-06  | What is a "lien" on a property?                                  | A legal claim by a creditor (1)                                  |
| seed-trivia-07  | What does "escrow" mean in real estate?                          | A holding account for funds during a transaction (1)             |
| seed-trivia-08  | What is a "quitclaim deed"?                                      | A deed transferring whatever interest the grantor has (1)        |
| seed-trivia-09  | What does "closing" refer to in real estate?                     | The final step where ownership is transferred (1)                |
| seed-trivia-10  | What is "remittance" in the title industry?                      | Payment sent to an underwriter after closing (1)                 |
| seed-trivia-11  | What is a "title search"?                                        | Reviewing public records to confirm legal ownership (1)          |
| seed-trivia-12  | What is "wire fraud" in real estate?                             | Scam redirecting closing funds to fraudulent accounts (1)        |
| seed-trivia-13  | What does a title commitment document show?                      | Conditions under which title insurance will be issued (1)        |
| seed-trivia-14  | What is the difference between ALTA and CLTA policies?           | Geographic scope and coverage breadth (1)                        |
| seed-trivia-15  | What is an "abstract of title"?                                  | A summary of ownership history and legal claims **(0)**          |
| seed-trivia-16  | What does WFG stand for?                                         | Williston Financial Group (1)                                    |
| seed-trivia-17  | Which document transfers property ownership?                     | Deed (1)                                                         |
| seed-trivia-18  | What is "marketable title"?                                      | A title free from reasonable doubts a buyer would accept (1)     |
| seed-trivia-19  | What is a "lis pendens"?                                         | Notice of pending litigation affecting a property (1)            |
| seed-trivia-20  | What does "pro-ration" mean at closing?                          | Dividing ongoing costs like taxes between buyer and seller (1)   |
| seed-trivia-21  | What is RESPA?                                                   | A federal law governing real estate settlement procedures (1)    |
| seed-trivia-22  | What is a "Closing Disclosure"?                                  | A document itemizing all settlement charges and fees (1)         |
| seed-trivia-23  | What does "subrogation" mean in title insurance?                 | The right of the insurer to pursue third-party claims (1)        |
| seed-trivia-24  | What is a "mechanic's lien"?                                     | A claim by an unpaid contractor on a property **(0)**            |
| seed-trivia-25  | What does "vesting" refer to in real estate?                     | How ownership is held and titled on a deed (1)                   |
| seed-trivia-26  | What is a "deed of trust"?                                       | A three-party security instrument used instead of a mortgage (1) |
| seed-trivia-27  | What does "encumbrance" mean in real estate?                     | Any claim, lien, or liability attached to a property (1)         |
| seed-trivia-28  | What is "title defect"?                                          | Any outstanding claim or issue that impairs clear ownership (1)  |
| seed-trivia-29  | What is the purpose of an owner's title insurance policy?        | Protect the buyer's ownership interest against title defects (1) |
| seed-trivia-30  | What is a "notice of default"?                                   | A formal notice that a borrower has missed mortgage payments (1) |
| seed-trivia-31  | What does "recording" mean in real estate?                       | Filing legal documents with the county to create public record (1)|
| seed-trivia-32  | What is a "subordination agreement"?                             | Senior lien holder allows a junior lien to take priority (1)     |
| seed-trivia-33  | What is "constructive notice" in property law?                   | Legal notification implied by public records (1)                 |
| seed-trivia-34  | What does "encroachment" mean?                                   | A structure or improvement crosses a property boundary line (1)  |
| seed-trivia-35  | What is a "warranty deed"?                                       | Grantor guarantees clear title and will defend against claims (1) |
| seed-trivia-36  | What does "title plant" refer to?                                | A title company's proprietary database of local property records (1)|
| seed-trivia-37  | What is a "judgment lien"?                                       | Court-ordered lien placed on a debtor's property (1)             |
| seed-trivia-38  | What does "gap coverage" mean in title insurance?                | Coverage between title search and recording of the deed (1)      |
| seed-trivia-39  | What is "indemnification" in title insurance?                    | Compensating a party for a covered loss or legal liability (1)   |
| seed-trivia-40  | What is a "trustee's deed"?                                      | A deed used to transfer property out of a trust or after foreclosure (1)|
| seed-trivia-41  | What does "rescission" mean in a real estate transaction?        | Canceling or voiding a contract within an allowed timeframe (1)  |
| seed-trivia-42  | What is "adverse possession"?                                    | Claiming ownership after openly occupying land for a set period (1)|
| seed-trivia-43  | What is a "plat map"?                                            | A recorded map dividing land into lots, blocks, and streets (1)  |
| seed-trivia-44  | What does "priority of lien" mean?                               | Order lien holders are paid if a property is sold/foreclosed (1) |
| seed-trivia-45  | What is a "title opinion"?                                       | An attorney's written evaluation of a property's title (1)       |
| seed-trivia-46  | What does "hypothecation" mean in real estate?                   | Pledging property as collateral without giving up possession (1) |
| seed-trivia-47  | What is "straw man" in real estate?                              | Person who takes title temporarily to facilitate a transfer (1)  |
| seed-trivia-48  | What does "cloud on title" mean?                                 | Any outstanding claim that could affect clear ownership (1)      |
| seed-trivia-49  | What is "TRID" in real estate?                                   | Federal rule combining disclosures into Loan Estimate + CD (1)   |
| seed-trivia-50  | What does "reconveyance" mean in real estate?                    | Transfer of legal title back to borrower after payoff (1)        |

---

## Prompt Challenge Questions

5 questions. All have `correctIndex: 0` — the most specific, structured prompt always wins.

> Upsert strategy: deletes questions not in the seeded set, then `createMany` with `skipDuplicates: true`.

| ID          | Category               | Scenario (abbreviated)                                             |
|-------------|------------------------|--------------------------------------------------------------------|
| seed-pc-01  | Underwriting           | Complex easement issue before closing                              |
| seed-pc-02  | Client Communication   | First-time homebuyer confused about title insurance                |
| seed-pc-03  | Fraud Detection        | Suspicious wire instructions with red flags                        |
| seed-pc-04  | Operational Efficiency | Closing day checklist for the team                                 |
| seed-pc-05  | Business Development   | LinkedIn post to build referral relationships with RE agents       |

**Correct option pattern:** Role + specific context + exact constraints + output format + desired outcome. Vague prompts rank last regardless of warmth or length.

---

## Touchpoints

Each touchpoint gets a signed QR token generated at seed time via `signToken(id)`.

| ID          | Name                   | Points | Location Description      |
|-------------|------------------------|--------|---------------------------|
| seed-tp-01  | Main Lobby Check-In    | 25     | Near entrance, Kiosk A    |
| seed-tp-02  | Exhibit Hall Scan      | 25     | Exhibit Hall, Kiosk B     |
| seed-tp-03  | Keynote Room Entry     | 25     | Main ballroom entrance    |
| seed-tp-04  | Networking Lounge      | 25     | Level 2 lounge area       |

> QR tokens are signed JWTs. Re-running seed uses `update: {}` so tokens are **not** regenerated on subsequent runs.

---

## Pre-Launch Checklist

Items in seed data that need real content before the event:

- [ ] Upload sponsor logos to R2 (`npx tsx scripts/upload-sponsor-logos.ts` from `backend/` — needs hotspot or InfoSec whitelist for `*.r2.cloudflarestorage.com`)
- [ ] Confirm or update sponsor tiers (all currently `partner`)
- [ ] Replace placeholder invitees (alice/bob/carol) with real attendee list
- [ ] Open AI Avatar activity (`seed-activity-avatar`) via admin when ready
- [ ] Confirm agenda times and speakers are final
- [ ] Verify touchpoint QR codes printed and placed at correct kiosk locations
