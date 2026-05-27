import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { signToken } from './qr'

// ── Admin ──────────────────────────────────────────────────────────────────

export async function seedAdmin(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash('executiveSum@26', 10)
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@es26.com' },
    update: {},
    create: { email: 'admin@es26.com', passwordHash, role: 'super_admin' },
  })
  return admin
}

// ── Invitees ───────────────────────────────────────────────────────────────

export async function seedInvitees(prisma: PrismaClient) {
  const invitees = [
    { email: 'alice@wfg.com', name: 'Alice Agent', attendeeType: 'invited' as const },
    { email: 'bob@wfg.com', name: 'Bob Broker', attendeeType: 'invited' as const },
    { email: 'carol@wfg.com', name: 'Carol Manager', attendeeType: 'invited' as const },
  ]
  for (const inv of invitees) {
    await prisma.invitee.upsert({ where: { email: inv.email }, update: {}, create: inv })
  }
  return invitees.length
}

// ── Agenda ─────────────────────────────────────────────────────────────────
// All times are stored as UTC. The event is in Delray Beach, FL (EDT = UTC−4).
// Day 1 = June 3 (Women's Leadership Seminar)
// Day 2 = June 4 (Main event)
// Day 3 = June 5 (Departures)

export async function seedAgenda(prisma: PrismaClient) {
  const events = [
    // ── Day 1 — Wednesday, June 3 ─────────────────────────────────────────
    {
      id: 'seed-agenda-d1-wls',
      day: 1,
      name: "Women's Leadership Seminar",
      description:
        "A premier half-day experience dedicated to empowering women leading the future of title and settlement services. The seminar brings together high-impact female leaders for advanced discussions on leadership, innovation, and influence — with a focus on leveraging technology as a catalyst for personal and organizational transformation. Attendees build meaningful peer relationships with other women championing progress across the industry.\n\nKeynote Speaker: Amy Franko — Growth Strategist, Keynote Speaker, Author, Board Director, Angel Investor",
      location: 'Opal Grand Resort',
      speaker: 'Amy Franko',
      startsAt: new Date('2026-06-03T17:00:00Z'), // 1:00 PM EDT
      endsAt:   new Date('2026-06-03T21:15:00Z'), // 5:15 PM EDT
      version: 1,
    },

    // ── Day 2 — Thursday, June 4 ──────────────────────────────────────────
    {
      id: 'seed-agenda-d2-breakfast',
      day: 2,
      name: 'Breakfast',
      description:
        'An informal networking breakfast before the day\'s program begins. Attendees connect across companies and roles over a full breakfast spread. Sponsor exhibits and the ATS Demo Room open at this time.',
      location: 'Main Hall',
      speaker: null,
      startsAt: new Date('2026-06-04T11:30:00Z'), // 7:30 AM EDT
      endsAt:   new Date('2026-06-04T12:30:00Z'), // 8:30 AM EDT
      version: 1,
    },
    {
      id: 'seed-agenda-d2-opening-remarks',
      day: 2,
      name: 'Opening Remarks',
      description:
        'The official start of the WFG Executive Summit 2026. WFG leadership welcomes attendees, sets the tone for the day, and previews the key themes and sessions ahead.',
      location: 'Main Hall',
      speaker: 'WFG Leadership',
      startsAt: new Date('2026-06-04T12:45:00Z'), // 8:45 AM EDT
      endsAt:   new Date('2026-06-04T12:55:00Z'), // 8:55 AM EDT
      version: 1,
    },
    {
      id: 'seed-agenda-d2-q2-economic',
      day: 2,
      name: "What's Next: The Q2 Economic Perspective",
      description:
        "A data-driven look at the current economic landscape and its direct implications for the real estate and title industry. Patrick F. Stone and economist Bill Conerly examine interest rate trends, housing market conditions, and what title agents should realistically expect through the remainder of 2026. Attendees leave with a clear-eyed view of the macro environment and what it means for their business strategy.",
      location: 'Main Hall',
      speaker: 'Patrick F. Stone · Bill Conerly',
      startsAt: new Date('2026-06-04T13:00:00Z'), // 9:00 AM EDT
      endsAt:   new Date('2026-06-04T13:45:00Z'), // 9:45 AM EDT
      version: 1,
    },
    {
      id: 'seed-agenda-d2-agent30',
      day: 2,
      name: 'Agent 3.0: Amplify Your Edge',
      description:
        "An overview of WFG's Agent 3.0 platform — the next generation of tools and resources available to independent WFG title agents. Gene Rebadow walks through new capabilities, operational improvements, and the competitive advantages now available to agents within the WFG network.",
      location: 'Main Hall',
      speaker: 'Gene Rebadow',
      startsAt: new Date('2026-06-04T13:50:00Z'), // 9:50 AM EDT
      endsAt:   new Date('2026-06-04T14:00:00Z'), // 10:00 AM EDT
      version: 1,
    },
    {
      id: 'seed-agenda-d2-beyond-faster',
      day: 2,
      name: 'Beyond Faster: Turn AI from Commodity into Competitive Advantage',
      description:
        'AI tools are widely available — but most businesses are using them interchangeably, which erases any competitive edge. This keynote challenges attendees to move beyond speed and efficiency gains and instead position AI as a strategic differentiator that is hard to replicate and tied directly to revenue. Julie Holmes lays out a practical framework for shifting AI from a commodity tool to a genuine business advantage.',
      location: 'Main Hall',
      speaker: 'Julie Holmes',
      startsAt: new Date('2026-06-04T14:05:00Z'), // 10:05 AM EDT
      endsAt:   new Date('2026-06-04T14:50:00Z'), // 10:50 AM EDT
      version: 1,
    },
    {
      id: 'seed-agenda-d2-ats-team',
      day: 2,
      name: 'ATS Team: Custom AI Solutions for Title Agents',
      description:
        "The WFG Advanced Technology Solutions (ATS) team presents the suite of AI-powered tools built specifically for title agents. The session covers real-world deployments, live demonstrations, and a forward look at the AI-assisted title operations roadmap — spanning document processing, client communication, workflow automation, and more. Presented by the engineers and strategists who built the tools.",
      location: 'Main Hall',
      speaker: 'Ryan Ozonian · Vedant Upganlawar · Priyal Katudia · Anish Tatke · Wendy Lunt',
      startsAt: new Date('2026-06-04T14:50:00Z'), // 10:50 AM EDT
      endsAt:   new Date('2026-06-04T15:20:00Z'), // 11:20 AM EDT
      version: 1,
    },
    {
      id: 'seed-agenda-d2-real-talk',
      day: 2,
      name: 'Real Talk: How Title Agents Actually Use AI Solutions in Their Business',
      description:
        "A candid panel of working title agents share their first-hand experiences adopting AI in day-to-day operations. Expect honest takeaways on which tools made a real impact, what didn't work as advertised, how their teams adapted, and what they wish they'd known before getting started. This is a practitioner perspective — not a vendor pitch.",
      location: 'Main Hall',
      speaker: 'Roxanne Kos · Jaime Kosofsky · Hope Ottovini · Leo Fousekis',
      startsAt: new Date('2026-06-04T15:25:00Z'), // 11:25 AM EDT
      endsAt:   new Date('2026-06-04T15:45:00Z'), // 11:45 AM EDT
      version: 1,
    },
    {
      id: 'seed-agenda-d2-networking-lunch',
      day: 2,
      name: 'Networking Lunch',
      description:
        'A structured lunch break designed for peer connection. Open seating; attendees are encouraged to mix across companies and roles. Sponsor exhibits and the ATS Demo Room remain available during this time.',
      location: 'Main Hall',
      speaker: null,
      startsAt: new Date('2026-06-04T16:00:00Z'), // 12:00 PM EDT
      endsAt:   new Date('2026-06-04T17:00:00Z'), //  1:00 PM EDT
      version: 1,
    },
    {
      id: 'seed-agenda-d2-ai-shift',
      day: 2,
      name: 'The AI Shift: What Title Agents Need to Know',
      description:
        'A business-focused panel examining what the widespread adoption of AI means for title agency operations, client relationships, and competitive positioning over the next 12–24 months. Panelists share how AI is reshaping their companies today and what agents who haven\'t yet committed to AI should do — and when.',
      location: 'Main Hall',
      speaker: 'Mo Choumli · Michael Ruder · Wendy Lunt',
      startsAt: new Date('2026-06-04T17:00:00Z'), // 1:00 PM EDT
      endsAt:   new Date('2026-06-04T17:30:00Z'), // 1:30 PM EDT
      version: 1,
    },
    {
      id: 'seed-agenda-d2-ai-search',
      day: 2,
      name: 'AI Search: Helping You Get Found on AI Platforms',
      description:
        'As consumers increasingly turn to AI assistants and ChatGPT to find service providers, traditional SEO is no longer sufficient for visibility. Jeff Lobb breaks down how title agents can optimize their digital presence for AI-driven discovery — what signals matter, how AI platforms surface recommendations, and what steps agents can take now to stay visible in a rapidly changing search landscape.',
      location: 'Main Hall',
      speaker: 'Jeff Lobb',
      startsAt: new Date('2026-06-04T17:30:00Z'), // 1:30 PM EDT
      endsAt:   new Date('2026-06-04T18:00:00Z'), // 2:00 PM EDT
      version: 1,
    },
    {
      id: 'seed-agenda-d2-breakout-ai-101',
      day: 2,
      name: "Don't Get Left Behind: AI for the Modern Title Agent",
      description:
        'An accessible, hands-on session covering the AI tools most relevant to title agents in 2026. Attendees choose their track — Beginner/Moderate or Advanced — so every participant can engage at the right level. The session covers practical tool selection, real use cases in title work, and how to get started without disrupting existing operations.',
      location: 'Main Hall — Breakout Rooms',
      speaker: null,
      startsAt: new Date('2026-06-04T18:15:00Z'), // 2:15 PM EDT
      endsAt:   new Date('2026-06-04T19:00:00Z'), // 3:00 PM EDT
      version: 1,
    },
    {
      id: 'seed-agenda-d2-breakout-workflow',
      day: 2,
      name: 'Replace the Busy Work: Automate, Accelerate, Dominate Your Workflow',
      description:
        'A practical deep-dive into identifying and automating the administrative and repetitive tasks that consume title agents\' time. Attendees walk away with concrete automation strategies and workflows they can implement in their own operations — from document handling to client follow-up to order status updates. Available in both Beginner/Moderate and Advanced tracks.',
      location: 'Main Hall — Breakout Rooms',
      speaker: null,
      startsAt: new Date('2026-06-04T19:00:00Z'), // 3:00 PM EDT
      endsAt:   new Date('2026-06-04T19:45:00Z'), // 3:45 PM EDT
      version: 1,
    },
    {
      id: 'seed-agenda-d2-ats-demo',
      day: 2,
      name: 'ATS Demo Room — Hands-On AI Demos',
      description:
        "Small-group, hands-on demos of WFG's AI solutions, run by the ATS engineering and strategy team. This parallel track runs simultaneously with the breakout sessions and gives attendees direct access to the live tools through guided walkthroughs and open Q&A. Ideal for agents who want to go beyond slides and interact directly with the product.",
      location: 'ATS Demo Room',
      speaker: 'Vedant Upganlawar · Priyal Katudia · Anish Tatke',
      startsAt: new Date('2026-06-04T18:15:00Z'), // 2:15 PM EDT
      endsAt:   new Date('2026-06-04T19:35:00Z'), // 3:35 PM EDT
      version: 1,
    },
    {
      id: 'seed-agenda-d2-awards',
      day: 2,
      name: 'Top Agent Awards',
      description:
        "The flagship evening event honoring WFG's highest-performing title agents of the year. The ceremony recognizes excellence in production, innovation, and client service across the WFG national network.",
      location: 'Seacrest Ballroom',
      speaker: 'WFG Leadership',
      startsAt: new Date('2026-06-04T22:00:00Z'), // 6:00 PM EDT
      endsAt:   new Date('2026-06-05T01:30:00Z'), // 9:30 PM EDT (crosses midnight UTC)
      version: 1,
    },
    {
      id: 'seed-agenda-d2-after-party',
      day: 2,
      name: 'After Party',
      description:
        'An informal celebration following the Top Agent Awards. Open to all summit attendees. The Seacrest Ballroom transitions into the after party immediately following the conclusion of the awards ceremony.',
      location: 'Seacrest Ballroom',
      speaker: null,
      startsAt: new Date('2026-06-05T01:30:00Z'), // 9:30 PM EDT
      endsAt:   new Date('2026-06-05T02:30:00Z'), // 10:30 PM EDT
      version: 1,
    },

    // ── Day 3 — Friday, June 5 ────────────────────────────────────────────
    {
      id: 'seed-agenda-d3-departures',
      day: 3,
      name: 'Departures',
      description:
        'Checkout and travel day. No formal programming. Thank you for joining us at the WFG Executive Summit 2026 — safe travels!',
      location: 'Opal Grand Resort',
      speaker: null,
      startsAt: new Date('2026-06-05T11:00:00Z'), // 7:00 AM EDT
      endsAt:   new Date('2026-06-05T16:00:00Z'), // 12:00 PM EDT
      version: 1,
    },
  ]

  const ids = events.map((e) => e.id)
  await prisma.agendaEvent.deleteMany({ where: { id: { notIn: ids } } })
  for (const event of events) {
    await prisma.agendaEvent.upsert({ where: { id: event.id }, update: {}, create: event })
  }
  return events.length
}

// ── Sponsors ───────────────────────────────────────────────────────────────
// Tiers are all 'partner' by default — update individually in the DB or via
// admin once tier assignments are confirmed.
// Logos are served from Cloudflare R2 CDN. Run scripts/upload-sponsor-logos.ts
// to upload assets before seeding in production.

const CDN = 'https://pub-9849080621014a8e9c12e5989f01a96e.r2.dev'

export async function seedSponsors(prisma: PrismaClient) {
  const sponsors = [
    {
      id: 'seed-sponsor-qualia',
      name: 'Qualia',
      tier: 'partner' as const,
      logoUrl: `${CDN}/sponsors/qualia-logo.png`,
      description: 'Qualia is the leading comprehensive digital closing platform used by title, escrow, real estate and mortgage lending professionals to transform home buying and selling into simple, secure, enjoyable experiences for millions of homeowners each year.',
      displayOrder: 1,
    },
    {
      id: 'seed-sponsor-closinglock',
      name: 'Closinglock',
      tier: 'partner' as const,
      logoUrl: `${CDN}/sponsors/closinglock-logo.jpg`,
      description: 'Closinglock is building the trusted infrastructure for how money moves in real estate, providing insured digital payments, identity verification, and secure escrow management tools for title companies and law firms in all 50 states.',
      displayOrder: 2,
    },
    {
      id: 'seed-sponsor-bear-printing',
      name: 'Bear Printing',
      tier: 'partner' as const,
      logoUrl: `${CDN}/sponsors/bear-printing-logo.png`,
      description: 'Bear Printing is a marketing platform built for agents and the title, escrow, and lending professionals who support them. We combine automated MLS-linked print marketing, AI-powered content creation, and national listing data into one seamless workflow.',
      displayOrder: 3,
    },
    {
      id: 'seed-sponsor-pythonic',
      name: 'Pythonic',
      tier: 'partner' as const,
      logoUrl: `${CDN}/sponsors/pythonic-logo.png`,
      description: "Pythonic Corporation is at the forefront of AI-driven document understanding technology. With our focus on the title insurance industry, Pythonic's mission is to make it simple for our clients to incorporate state-of-the-art document AI capabilities into their systems and workflows.",
      displayOrder: 4,
    },
    {
      id: 'seed-sponsor-capital-bank',
      name: 'Capital Bank, N.A.',
      tier: 'partner' as const,
      logoUrl: `${CDN}/sponsors/capital-bank-logo.jpg`,
      description: 'Capital Bank, N.A. understands the challenges of your market landscape and meets those challenges head-on with a customized approach — late wire room hours, protecting your accounts from unauthorized transactions, and customized reporting.',
      displayOrder: 5,
    },
    {
      id: 'seed-sponsor-alanna',
      name: 'alanna.ai',
      tier: 'partner' as const,
      logoUrl: `${CDN}/sponsors/alanna-logo.png`,
      description: "alanna.ai is the developer of the title industry's only conversational AI technology capable of holding complex conversations with clients in 133 languages via SMS text or web chat, resolving up to 97% of inbound emails and phone calls without human involvement.",
      displayOrder: 6,
    },
    {
      id: 'seed-sponsor-datatrace',
      name: 'DataTrace',
      tier: 'partner' as const,
      logoUrl: `${CDN}/sponsors/datatrace-logo.png`,
      description: "DataTrace Information Services LLC, the nation's largest provider of property and ownership data and title automation solutions, enables title and settlement companies to streamline their processes, increase efficiency and drive growth.",
      displayOrder: 7,
    },
    {
      id: 'seed-sponsor-signature-xcel',
      name: 'Signature Xcel',
      tier: 'partner' as const,
      logoUrl: `${CDN}/sponsors/signature-xcel-logo.jpg`,
      description: 'Signature Xcel is the premier national notary signing agency with 70k+ approved and vetted notary signing agents providing nationwide coverage. ALTA Elite Provider, winner of the BBB Torch Award for Ethics and HousingWire Vanguard 100.',
      displayOrder: 8,
    },
    {
      id: 'seed-sponsor-connect',
      name: 'Connect Services',
      tier: 'partner' as const,
      logoUrl: `${CDN}/sponsors/connect-logo.svg`,
      description: 'Connect Services helps title agencies support clients during the move-in process by coordinating utilities and home services. It extends the client experience beyond closing while creating a no-lift revenue opportunity for partner agencies.',
      displayOrder: 9,
    },
    {
      id: 'seed-sponsor-palmagent',
      name: 'PalmAgent',
      tier: 'partner' as const,
      logoUrl: `${CDN}/sponsors/palmagent-logo.png`,
      description: "PalmAgent is real estate's #1 title sales tool — a white-label platform built for title sales reps and the realtors they work with, giving your team the calculators, estimates, and agent-facing tools they use every day, branded as your company.",
      displayOrder: 10,
    },
  ]

  const ids = sponsors.map((s) => s.id)
  await prisma.sponsor.deleteMany({ where: { id: { notIn: ids } } })
  for (const sponsor of sponsors) {
    await prisma.sponsor.upsert({ where: { id: sponsor.id }, update: {}, create: sponsor })
  }
  return sponsors.length
}

// ── Initiatives ────────────────────────────────────────────────────────────

export async function seedInitiatives(prisma: PrismaClient) {
  const initiatives = [
    {
      id: 'seed-initiative-eremit',
      name: 'eRemit',
      team: 'Payments · Built with Verndale',
      shortDescription: 'Digital remittance payments for title agents. No manual steps, no back-and-forth.',
      whatItDoes: 'A platform that lets title agents pay their remittances directly to WFG, eliminating manual wire transfers and reducing errors.',
      audience: 'Title agents and office managers processing monthly remittances.',
      whyBuilt: 'Manual remittance processes are error-prone, time-consuming, and frustrating. eRemit automates the entire workflow.',
      rolloutNotes: 'Live and in use. Visit the ATS kiosk for a walkthrough demo.',
      demoUrl: null,
      kioskLocation: null,
      splashUrl: null,
      displayOrder: 1,
    },
    {
      id: 'seed-initiative-fieldiq',
      name: 'FieldIQ',
      team: 'Field Sales Intelligence · Live',
      shortDescription: 'AI-powered tracking for every field activity: lunches, pop-bys, CE classes, and more.',
      whatItDoes: 'Captures and analyzes every field activity that title agents perform. Relationship work that never got tracked before now becomes actionable data.',
      audience: 'Title agents and sales representatives doing field business development.',
      whyBuilt: 'Field sales activities are invisible to management and hard to correlate with results. FieldIQ changes that.',
      rolloutNotes: 'Live. Ask the ATS team for a demo at the Innovation Hub kiosk.',
      demoUrl: null,
      kioskLocation: null,
      splashUrl: null,
      displayOrder: 2,
    },
    {
      id: 'seed-initiative-myhomeprompt',
      name: 'My Home Prompt',
      team: 'WFG Advisory · AI Homebuyer Guide',
      shortDescription: 'AI-guided support for homebuyers through every step of a real estate transaction.',
      whatItDoes: 'Gives homebuyers and real estate agents AI-guided assistance through the full transaction lifecycle, from offer to close.',
      audience: 'Homebuyers, real estate agents, and title companies using WFG.',
      whyBuilt: 'The homebuying process is confusing. My Home Prompt makes it transparent, guided, and human.',
      rolloutNotes: 'In development. Launching 2026.',
      demoUrl: null,
      kioskLocation: null,
      splashUrl: null,
      displayOrder: 3,
    },
  ]

  const ids = initiatives.map((i) => i.id)
  await prisma.initiative.deleteMany({ where: { id: { notIn: ids } } })
  for (const initiative of initiatives) {
    await prisma.initiative.upsert({ where: { id: initiative.id }, update: {}, create: initiative })
  }
  return initiatives.length
}

// ── Announcements ──────────────────────────────────────────────────────────

export async function seedAnnouncements(prisma: PrismaClient, adminId: string) {
  await prisma.announcement.upsert({
    where: { id: 'seed-announcement-1' },
    update: {},
    create: {
      id: 'seed-announcement-1',
      title: 'Welcome to WFG Executive Summit 2026!',
      body: "Check the Agenda tab for today's sessions. Activities open at 8am. See you in the main hall!",
      publishedByAdminId: adminId,
      expiresAt: new Date('2026-12-31T23:59:59Z'),
    },
  })
}

// ── Activities ─────────────────────────────────────────────────────────────

export async function seedActivities(prisma: PrismaClient) {
  const activities = [
    { id: 'seed-activity-trivia',     type: 'trivia'           as const, name: 'Summit Trivia',        maxPoints: 500, isOneShot: true,  isOpen: true,  configJson: { pointsPerQuestion: 10 } },
    { id: 'seed-activity-prompt',     type: 'prompt_challenge' as const, name: 'Prompt Challenge',      maxPoints: 100, isOneShot: false, isOpen: true,  configJson: { pointsCorrect: 20, pointsWrong: 10 } },
    { id: 'seed-activity-touchpoint', type: 'touchpoint'       as const, name: 'Touchpoint Scans',      maxPoints: 0,   isOneShot: false, isOpen: true,  configJson: Prisma.JsonNull },
    { id: 'seed-activity-avatar',     type: 'avatar'           as const, name: 'AI Avatar Creator',     maxPoints: 50,  isOneShot: true,  isOpen: false, configJson: Prisma.JsonNull },
    { id: 'seed-activity-golden',     type: 'golden_points'    as const, name: 'Golden Points',         maxPoints: 100, isOneShot: true,  isOpen: true,  configJson: { questionText: "How is AI transforming the title & escrow industry, and what excites you most about WFG's use of technology at this summit?" } },
  ]
  for (const act of activities) {
    const { id, ...data } = act
    await prisma.activity.upsert({ where: { id }, update: { maxPoints: data.maxPoints, isOpen: data.isOpen, configJson: data.configJson }, create: act })
  }
  return activities.length
}

// ── Trivia Questions ───────────────────────────────────────────────────────

export async function seedTriviaQuestions(prisma: PrismaClient) {
  const questions = [
    { id: 'seed-trivia-01', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "title insurance" protect against?', optionsJson: ['Natural disasters', 'Defects in ownership history', 'Property tax increases', 'Zoning changes'], correctIndex: 1 },
    { id: 'seed-trivia-02', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is a "chain of title"?', optionsJson: ['A lock for property gates', 'A chronological list of ownership records', 'A type of mortgage', 'A legal boundary dispute'], correctIndex: 1 },
    { id: 'seed-trivia-03', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "clear title" mean?', optionsJson: ['Recently repainted property', 'Free of liens and legal claims', 'Includes a pool', 'Has no easements'], correctIndex: 1 },
    { id: 'seed-trivia-04', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'Who typically pays for the lender\'s title insurance policy?', optionsJson: ['The seller', 'The real estate agent', 'The buyer', 'The city'], correctIndex: 2 },
    { id: 'seed-trivia-05', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is an "easement"?', optionsJson: ['A type of mortgage', 'A right to use another\'s land for specific purposes', 'A property tax reduction', 'A building permit'], correctIndex: 1 },
    { id: 'seed-trivia-06', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is a "lien" on a property?', optionsJson: ['A boundary marker', 'A legal claim by a creditor', 'A type of deed', 'A zoning category'], correctIndex: 1 },
    { id: 'seed-trivia-07', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "escrow" mean in real estate?', optionsJson: ['A type of fence', 'A holding account for funds during a transaction', 'A property appraisal', 'A title search'], correctIndex: 1 },
    { id: 'seed-trivia-08', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is a "quitclaim deed"?', optionsJson: ['A deed that guarantees title', 'A deed transferring whatever interest the grantor has', 'A deed for commercial property', 'A deed from a court'], correctIndex: 1 },
    { id: 'seed-trivia-09', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "closing" refer to in real estate?', optionsJson: ['Listing a property for sale', 'The final step where ownership is transferred', 'A property inspection', 'An open house event'], correctIndex: 1 },
    { id: 'seed-trivia-10', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is "remittance" in the title industry?', optionsJson: ['A form of title insurance', 'Payment sent to an underwriter after closing', 'A property survey', 'A notary fee'], correctIndex: 1 },
    { id: 'seed-trivia-11', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is a "title search"?', optionsJson: ['An online property listing search', 'Reviewing public records to confirm legal ownership', 'A home inspection', 'An MLS database query'], correctIndex: 1 },
    { id: 'seed-trivia-12', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is "wire fraud" in real estate?', optionsJson: ['Problems with electrical wiring', 'Scam redirecting closing funds to fraudulent accounts', 'Illegal recording of conversations', 'A mortgage fraud scheme'], correctIndex: 1 },
    { id: 'seed-trivia-13', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does a title commitment document show?', optionsJson: ['Property market value', 'Conditions under which title insurance will be issued', 'Home inspection results', 'Mortgage interest rates'], correctIndex: 1 },
    { id: 'seed-trivia-14', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is the difference between ALTA and CLTA policies?', optionsJson: ['Coverage amount', 'Geographic scope and coverage breadth', 'Who the insurer is', 'Policy duration'], correctIndex: 1 },
    { id: 'seed-trivia-15', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is an "abstract of title"?', optionsJson: ['A summary of ownership history and legal claims', 'An architectural drawing', 'A property tax record', 'A mortgage statement'], correctIndex: 0 },
    { id: 'seed-trivia-16', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does WFG stand for?', optionsJson: ['Western Federal Group', 'Williston Financial Group', 'World Finance Group', 'Western Financial Guarantee'], correctIndex: 1 },
    { id: 'seed-trivia-17', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'Which document transfers property ownership?', optionsJson: ['Mortgage note', 'Deed', 'Title commitment', 'Survey map'], correctIndex: 1 },
    { id: 'seed-trivia-18', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is "marketable title"?', optionsJson: ['A title that can be sold quickly', 'A title free from reasonable doubts that a buyer would accept', 'A highly valued property', 'A titled property near markets'], correctIndex: 1 },
    { id: 'seed-trivia-19', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is a "lis pendens"?', optionsJson: ['A type of deed', 'Notice of pending litigation affecting a property', 'A tax lien', 'A construction permit'], correctIndex: 1 },
    { id: 'seed-trivia-20', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "pro-ration" mean at closing?', optionsJson: ['Property renovation costs', 'Dividing ongoing costs like taxes between buyer and seller', 'Agent commission calculation', 'Appraisal fee splitting'], correctIndex: 1 },
    { id: 'seed-trivia-21', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is RESPA?', optionsJson: ['A state-level title licensing exam', 'A federal law governing real estate settlement procedures', 'A national appraisal standards body', 'A mortgage insurance product'], correctIndex: 1 },
    { id: 'seed-trivia-22', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is a "Closing Disclosure"?', optionsJson: ['A federal housing grant document', 'A document itemizing all settlement charges and fees', 'A property inspection report', 'A deed transfer authorization'], correctIndex: 1 },
    { id: 'seed-trivia-23', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "subrogation" mean in title insurance?', optionsJson: ['A policy upgrade process', "The right of the insurer to pursue third-party claims on the insured's behalf", 'A title search technique', 'A legal property description method'], correctIndex: 1 },
    { id: 'seed-trivia-24', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is a "mechanic\'s lien"?', optionsJson: ['A claim by an unpaid contractor on a property', 'A court-ordered property seizure', 'A mortgage lien placed by a bank', 'A zoning restriction on renovations'], correctIndex: 0 },
    { id: 'seed-trivia-25', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "vesting" refer to in real estate?', optionsJson: ['A property valuation method', 'How ownership is held and titled on a deed', 'A type of real estate investment trust', 'A mortgage underwriting term'], correctIndex: 1 },
    { id: 'seed-trivia-26', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is a "deed of trust"?', optionsJson: ['A gift deed for family transfers', 'A three-party security instrument used instead of a mortgage', 'A court-ordered title transfer', 'A deed used only in commercial real estate'], correctIndex: 1 },
    { id: 'seed-trivia-27', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "encumbrance" mean in real estate?', optionsJson: ['A type of property insurance', 'Any claim, lien, or liability attached to a property', 'A zoning restriction on height', 'A title search methodology'], correctIndex: 1 },
    { id: 'seed-trivia-28', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is "title defect"?', optionsJson: ['A printing error on a deed', 'Any outstanding claim or issue that impairs clear ownership', "A problem with a property's foundation", 'An expired building permit'], correctIndex: 1 },
    { id: 'seed-trivia-29', category: 'Title & Real Estate', difficulty: 'easy', questionText: "What is the purpose of an owner's title insurance policy?", optionsJson: ['To cover the lender against loss', "To protect the buyer's ownership interest against title defects", "To insure the property's physical structure", 'To guarantee the appraised value'], correctIndex: 1 },
    { id: 'seed-trivia-30', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is a "notice of default"?', optionsJson: ["A letter from a homeowner's association", 'A formal notice that a borrower has missed mortgage payments', 'A zoning violation warning', 'A title commitment expiration notice'], correctIndex: 1 },
    { id: 'seed-trivia-31', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "recording" mean in real estate?', optionsJson: ['Photographing the property', 'Filing legal documents with the county to create public record', 'Videotaping the final walkthrough', 'Documenting the inspection findings'], correctIndex: 1 },
    { id: 'seed-trivia-32', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is a "subordination agreement"?', optionsJson: ["A buyer's waiver of inspection rights", 'An agreement where a senior lien holder allows a junior lien to take priority', "A title company's liability waiver", "A seller's disclosure form"], correctIndex: 1 },
    { id: 'seed-trivia-33', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is "constructive notice" in property law?', optionsJson: ['A written warning from a title company', 'Legal notification implied by public records anyone could have searched', 'A formal notice delivered in person', 'A notice posted on the property'], correctIndex: 1 },
    { id: 'seed-trivia-34', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "encroachment" mean?', optionsJson: ['Unauthorized entry into a building', 'When a structure or improvement crosses a property boundary line', 'A failure to pay property taxes', 'A zoning code violation'], correctIndex: 1 },
    { id: 'seed-trivia-35', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is a "warranty deed"?', optionsJson: ['A deed with no ownership guarantees', 'A deed where the grantor guarantees clear title and will defend against claims', 'A deed used only in foreclosure', 'A temporary title transfer document'], correctIndex: 1 },
    { id: 'seed-trivia-36', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "title plant" refer to in the title industry?', optionsJson: ['A physical office location', "A title company's proprietary database of local property records", 'Greenery required by local building codes', 'The printing equipment for deeds'], correctIndex: 1 },
    { id: 'seed-trivia-37', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is a "judgment lien"?', optionsJson: ['A lien placed by a title company', "A court-ordered lien placed on a debtor's property after a lawsuit", 'A lien filed by a mortgage lender', 'A voluntary lien created at closing'], correctIndex: 1 },
    { id: 'seed-trivia-38', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "gap coverage" mean in title insurance?', optionsJson: ['Insurance for vacant land', 'Coverage for the time between the title search and the recording of the deed', 'Coverage for gaps in a fence line', 'Protection for expired easements'], correctIndex: 1 },
    { id: 'seed-trivia-39', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is "indemnification" in title insurance?', optionsJson: ['Canceling a policy', 'Compensating a party for a loss or legal liability covered by the policy', 'Verifying the property title', 'Transferring insurance coverage'], correctIndex: 1 },
    { id: 'seed-trivia-40', category: 'Title & Real Estate', difficulty: 'easy', questionText: "What is a \"trustee's deed\"?", optionsJson: ['A deed issued to a homebuyer at closing', 'A deed used to transfer property out of a trust or after foreclosure', 'A deed only used for commercial property', 'A deed from one family member to another'], correctIndex: 1 },
    { id: 'seed-trivia-41', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "rescission" mean in a real estate transaction?', optionsJson: ['Accepting a purchase offer', 'Canceling or voiding a contract within a legally allowed timeframe', 'Renegotiating the sale price', 'Extending the closing date'], correctIndex: 1 },
    { id: 'seed-trivia-42', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is "adverse possession"?', optionsJson: ["A buyer's right to inspect a property", 'A legal process where someone can claim ownership after openly occupying land for a set period', 'A court order to sell a property', 'A zoning variance approval'], correctIndex: 1 },
    { id: 'seed-trivia-43', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is a "plat map"?', optionsJson: ["A map showing a property's interior layout", 'A recorded map dividing land into lots, blocks, and streets within a subdivision', 'A satellite image of a property', 'A utility easement diagram'], correctIndex: 1 },
    { id: 'seed-trivia-44', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "priority of lien" mean?', optionsJson: ['The interest rate on a mortgage', 'The order in which lien holders are paid if a property is sold or foreclosed', 'The size of a lien relative to property value', "A lien's geographic scope"], correctIndex: 1 },
    { id: 'seed-trivia-45', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is a "title opinion"?', optionsJson: ['A customer satisfaction survey', "A licensed attorney's written evaluation of the condition of a property's title", "A title company's marketing document", "A notary's certification statement"], correctIndex: 1 },
    { id: 'seed-trivia-46', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "hypothecation" mean in real estate?', optionsJson: ['Selling a property below market value', 'Pledging property as collateral for a loan without giving up possession', 'Transferring title to a trust', 'Releasing a lien after payoff'], correctIndex: 1 },
    { id: 'seed-trivia-47', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is "straw man" in the context of real estate transactions?', optionsJson: ['A fake property listing', 'A person who takes title temporarily to facilitate a transfer, then conveys to the real buyer', 'A real estate agent acting as a buyer', 'A title company acting as guarantor'], correctIndex: 1 },
    { id: 'seed-trivia-48', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "cloud on title" mean?', optionsJson: ['Unclear property photographs', 'Any outstanding claim, lien, or encumbrance that could affect clear ownership', 'Fog near a coastal property', 'An unresolved building code issue'], correctIndex: 1 },
    { id: 'seed-trivia-49', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What is "TRID" in real estate?', optionsJson: ['A title insurance rating index', 'A federal rule combining mortgage disclosure forms into the Loan Estimate and Closing Disclosure', 'A type of property deed', 'A title search database system'], correctIndex: 1 },
    { id: 'seed-trivia-50', category: 'Title & Real Estate', difficulty: 'easy', questionText: 'What does "reconveyance" mean in real estate?', optionsJson: ['Selling a property a second time', 'The transfer of legal title back to the borrower after a mortgage is fully paid off', 'Conveying a property to a trust', 'Recording a new easement agreement'], correctIndex: 1 },
  ]
  const ids = questions.map((q) => q.id)
  await prisma.triviaQuestion.deleteMany({ where: { id: { notIn: ids } } })
  await prisma.triviaQuestion.createMany({ data: questions.map((q) => ({ ...q, isActive: true })), skipDuplicates: true })
  return questions.length
}

// ── Prompt Challenge Questions ─────────────────────────────────────────────

export async function seedPromptChallengeQuestions(prisma: PrismaClient) {
  const questions = [
    {
      id: 'seed-pc-01',
      category: 'Underwriting',
      scenarioText: 'A title agent needs to quickly understand a complex easement issue before closing. What\'s the most effective AI prompt?',
      optionsJson: [
        "I'm a title agent reviewing a residential property where a utility easement runs along the back 10 feet. The seller's garage encroaches by 3 feet. Explain the legal implications and outline three options to resolve this before closing next week.",
        "I work in title insurance and have a closing coming up. There's an easement on the property that might cause a problem with the garage. Can you help me think through the legal side and what I should do to handle it?",
        "I need help with a real estate matter involving an easement and an encroachment on a property I'm handling. Please explain the legal issues and suggest a resolution path I can present to the parties.",
        "I have a title issue at work — an easement is creating a problem and I need to understand the legal implications and figure out how to fix it before we close. Please give me a thorough explanation and some next steps.",
      ],
      correctIndex: 0,
      explanation: 'Option A specifies the role (title agent), property type (residential), exact measurements (10 ft / 3 ft), the encroachment detail, a deadline (next week), and asks for a numbered list of options. Every piece of context produces sharper output.',
      displayOrder: 1,
    },
    {
      id: 'seed-pc-02',
      category: 'Client Communication',
      scenarioText: 'A first-time homebuyer is confused and anxious about title insurance. You want AI to help you explain it clearly.',
      optionsJson: [
        "Write a clear explanation of title insurance for a client. They've never bought a home before and are worried about unexpected costs. Use a conversational tone, avoid jargon, keep it under 200 words, and end with a reassuring closing sentence.",
        "I need to explain title insurance to a nervous first-time homebuyer in a way that feels friendly and simple. Please write something I can send by email that covers the basics without overwhelming them or using too much legal language.",
        "Can you write a simple explainer about title insurance? My client is a first-time buyer who is nervous, so please make it easy to understand, warm in tone, and short enough that they will actually read it and feel better afterward.",
        "Write a short, friendly explanation of title insurance for a first-time homebuyer who is anxious about closing. Keep it under 200 words, use plain English throughout, and make sure the last line is reassuring and confident.",
      ],
      correctIndex: 0,
      explanation: "Option A specifies audience (first-time buyer), emotional state (worried), output format (under 200 words), tone (conversational, avoid jargon), and a structural requirement (reassuring closing). Every constraint narrows the AI toward what you actually need.",
      displayOrder: 2,
    },
    {
      id: 'seed-pc-03',
      category: 'Fraud Detection',
      scenarioText: "You've received suspicious wire instructions with some red flags. You want AI to help you think through the risk.",
      optionsJson: [
        "I received wire instructions last night for a closing tomorrow. The account number changed from the original. The email requesting the change came from a Gmail address, not the agent's domain. Identify which fraud patterns these match and list three specific verification steps I should take before wiring.",
        "I'm a title agent and I just got new wire instructions for a closing happening soon. The bank account is different from before and the email looks slightly off. I'm worried this could be fraud — can you help me figure out what to look for and what I should do next?",
        "Help me evaluate whether these wire instructions might be fraudulent. The account changed, the email seems suspicious, and the timing is urgent. I need to know what fraud patterns this matches and what verification steps to follow before I process anything.",
        "I think I might have received fraudulent wire instructions before a closing. The bank account number changed, the email address looks wrong, and the request feels rushed. Tell me what fraud indicators these are and give me the exact steps to verify before I send any funds.",
      ],
      correctIndex: 0,
      explanation: 'Option A provides concrete facts (account number changed, Gmail address, closing tomorrow), asks for pattern matching against known fraud types, and requests a numbered verification checklist. Specificity gives AI the right frame to reason from.',
      displayOrder: 3,
    },
    {
      id: 'seed-pc-04',
      category: 'Operational Efficiency',
      scenarioText: 'You want to create a closing day checklist for your team that covers every stage of the process.',
      optionsJson: [
        "I'm a title agent in California handling residential transactions. Create a closing day checklist with three sections: pre-closing (day before), day-of closing, and post-closing (within 48 hours). Format as a numbered checklist. Include document verification, wire confirmation, notary prep, and recording steps.",
        "Please create a detailed closing day checklist for a residential real estate transaction. I need it organized by time — before closing, during closing, and after closing — and formatted as a list my team can follow step by step during a busy day.",
        "Build me a thorough checklist for closing day in real estate. I work in title insurance, so I need it to cover everything a title agent would be responsible for: documents, funds, timing, recording, and follow-up tasks after the closing is done.",
        "I need a professional closing day checklist for my title office that I can share with my team. It should cover all the key steps from the day before closing all the way through post-closing, and be formatted so it's easy to follow during a real transaction.",
      ],
      correctIndex: 0,
      explanation: "Option A specifies jurisdiction (California), transaction type (residential), three named time phases, exact format (numbered checklist), and specific items to include. This eliminates guesswork and produces a checklist you can actually use without heavy editing.",
      displayOrder: 4,
    },
    {
      id: 'seed-pc-05',
      category: 'Business Development',
      scenarioText: 'You want to write a LinkedIn post to build relationships with real estate agents and generate referrals.',
      optionsJson: [
        "Act as a WFG title agent in [City] building a referral network. Write a LinkedIn post targeting real estate agents. Highlight fast 3-day turnaround, proactive status updates, and local market expertise. Under 180 words. End with a question that invites a comment or DM.",
        "Help me write a LinkedIn post to attract real estate agent referrals. I'm a title agent who values communication, speed, and local knowledge. It should feel professional but not stiff, be around 150–200 words, and close with something that makes people want to respond.",
        "I'm a title agent and I want to write a LinkedIn post that will attract real estate agents who are looking for a title partner. Please highlight my best qualities — speed, communication, and expertise — and make it sound genuine, around 180 words, with a call to action.",
        "Write a LinkedIn post for a title agent trying to build relationships with real estate agents. Focus on fast closings, great communication, and local market knowledge. Keep it under 200 words, use a warm but professional tone, and end with something that encourages engagement.",
      ],
      correctIndex: 0,
      explanation: "Option A uses role framing ('Act as'), names specific differentiators (3-day turnaround, status updates, local expertise), sets a word limit (180), and specifies an engagement action (question for comments or DMs). Role + specifics + structure + outcome = highly targeted copy.",
      displayOrder: 5,
    },
  ]
  const ids = questions.map((q) => q.id)
  await prisma.promptChallengeQuestion.deleteMany({ where: { id: { notIn: ids } } })
  await prisma.promptChallengeQuestion.createMany({ data: questions, skipDuplicates: true })
  return questions.length
}

// ── Touchpoints ────────────────────────────────────────────────────────────

export async function seedTouchpoints(prisma: PrismaClient) {
  const defs = [
    { id: 'seed-tp-01', name: 'Main Lobby Check-In',  points: 25, locationDescription: 'Near entrance, Kiosk A' },
    { id: 'seed-tp-02', name: 'Exhibit Hall Scan',     points: 25, locationDescription: 'Exhibit Hall, Kiosk B' },
    { id: 'seed-tp-03', name: 'Keynote Room Entry',    points: 25, locationDescription: 'Main ballroom entrance' },
    { id: 'seed-tp-04', name: 'Networking Lounge',     points: 25, locationDescription: 'Level 2 lounge area' },
  ]
  const results = []
  for (const tp of defs) {
    const qrToken = signToken(tp.id)
    await prisma.touchpoint.upsert({
      where: { id: tp.id },
      update: {},
      create: { ...tp, qrToken, isActive: true },
    })
    results.push({ name: tp.name, qrToken })
  }
  return results
}

// ── App Config (Feature Flags) ─────────────────────────────────────────────

export async function seedAppConfig(prisma: PrismaClient) {
  const configs = [
    {
      key: 'activities_open',
      label: 'Activities',
      description: 'Master switch — enables the entire Activities tab and all 5 activities. Flip on ~1 hour before the event.',
      value: false,
    },
    {
      key: 'leaderboard_open',
      label: 'Leaderboard',
      description: 'Show or hide the leaderboard rankings in the Explore tab. Open once there is meaningful score data.',
      value: false,
    },
    {
      key: 'checkin_open',
      label: 'Check-in / Walk-ins',
      description: 'Allow walk-in attendees to self-register. Close after doors close on Day 1.',
      value: true,
    },
    {
      key: 'feedback_open',
      label: 'Session Feedback',
      description: 'Enable session feedback submission cards on the Home screen. Open after the first session concludes.',
      value: false,
    },
    {
      key: 'explore_open',
      label: 'Explore Section',
      description: 'Kill-switch for the entire Explore tab — initiatives, sponsors, and leaderboard.',
      value: true,
    },
    {
      key: 'golden_points_open',
      label: 'Golden Points',
      description: 'Whether Golden Points submissions are accepted. Independent of the activities master switch.',
      value: false,
    },
  ]
  for (const cfg of configs) {
    await prisma.appConfig.upsert({
      where: { key: cfg.key },
      update: { label: cfg.label, description: cfg.description },
      create: cfg,
    })
  }
  return configs.length
}

// ── Full Seed ──────────────────────────────────────────────────────────────

export async function runFullSeed(prisma: PrismaClient) {
  const admin = await seedAdmin(prisma)
  const invitees = await seedInvitees(prisma)
  const agenda = await seedAgenda(prisma)
  const sponsors = await seedSponsors(prisma)
  const initiatives = await seedInitiatives(prisma)
  await seedAnnouncements(prisma, admin.id)
  const activities = await seedActivities(prisma)
  const trivia = await seedTriviaQuestions(prisma)
  const pc = await seedPromptChallengeQuestions(prisma)
  const touchpoints = await seedTouchpoints(prisma)
  const appConfig = await seedAppConfig(prisma)
  return { admin: 1, invitees, agenda, sponsors, initiatives, announcements: 1, activities, trivia, promptChallenge: pc, touchpoints: touchpoints.length, appConfig }
}
