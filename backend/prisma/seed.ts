import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { signToken } from '../src/lib/qr'

const prisma = new PrismaClient()

async function main() {
  // Admin user
  const passwordHash = await bcrypt.hash('AdminPass123!', 10)
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@wfg.com' },
    update: {},
    create: { email: 'admin@wfg.com', passwordHash, role: 'super_admin' },
  })
  console.log('Seeded admin:', admin.email)

  // Invitees
  const invitees = [
    { email: 'alice@wfg.com', name: 'Alice Agent', attendeeType: 'invited' as const },
    { email: 'bob@wfg.com', name: 'Bob Broker', attendeeType: 'invited' as const },
    { email: 'carol@wfg.com', name: 'Carol Manager', attendeeType: 'invited' as const },
  ]
  for (const inv of invitees) {
    await prisma.invitee.upsert({ where: { email: inv.email }, update: {}, create: inv })
  }
  console.log(`Seeded ${invitees.length} invitees`)

  // Agenda events
  const agendaEvents = [
    {
      id: 'seed-agenda-1',
      day: 1,
      name: 'Opening Keynote',
      description: 'Welcome to WFG Executive Summit 2026',
      location: 'Main Hall',
      speaker: 'WFG CEO',
      startsAt: new Date('2026-06-15T09:00:00Z'),
      endsAt: new Date('2026-06-15T10:30:00Z'),
      version: 1,
    },
    {
      id: 'seed-agenda-2',
      day: 1,
      name: 'Technology Deep Dive',
      description: 'Exploring the latest in title technology',
      location: 'Ballroom A',
      speaker: 'CTO Panel',
      startsAt: new Date('2026-06-15T11:00:00Z'),
      endsAt: new Date('2026-06-15T12:30:00Z'),
      version: 1,
    },
    {
      id: 'seed-agenda-3',
      day: 2,
      name: 'Awards Ceremony',
      description: 'Recognizing top performers across the network',
      location: 'Main Hall',
      speaker: null,
      startsAt: new Date('2026-06-16T18:00:00Z'),
      endsAt: new Date('2026-06-16T20:00:00Z'),
      version: 1,
    },
  ]
  for (const event of agendaEvents) {
    await prisma.agendaEvent.upsert({ where: { id: event.id }, update: {}, create: event })
  }
  console.log(`Seeded ${agendaEvents.length} agenda events`)

  // Sponsors
  const sponsors = [
    {
      id: 'seed-sponsor-title',
      name: 'WFG Financial Partners',
      tier: 'title' as const,
      logoUrl: 'https://placehold.co/400x200?text=Title+Sponsor',
      description: 'Our premier event partner',
      displayOrder: 1,
    },
    {
      id: 'seed-sponsor-gold',
      name: 'Summit Gold Co.',
      tier: 'gold' as const,
      logoUrl: 'https://placehold.co/400x200?text=Gold+Sponsor',
      description: 'Gold-level event partner',
      displayOrder: 1,
    },
    {
      id: 'seed-sponsor-silver',
      name: 'Silver Solutions Inc.',
      tier: 'silver' as const,
      logoUrl: 'https://placehold.co/400x200?text=Silver+Sponsor',
      description: 'Silver-level event partner',
      displayOrder: 1,
    },
    {
      id: 'seed-sponsor-partner',
      name: 'Community Partners LLC',
      tier: 'partner' as const,
      logoUrl: 'https://placehold.co/400x200?text=Partner',
      description: 'Supporting partner',
      displayOrder: 1,
    },
  ]
  for (const sponsor of sponsors) {
    await prisma.sponsor.upsert({ where: { id: sponsor.id }, update: {}, create: sponsor })
  }
  console.log(`Seeded ${sponsors.length} sponsors`)

  // Initiatives
  const initiatives = [
    {
      id: 'seed-initiative-1',
      name: 'AgentX Platform',
      team: 'Technology',
      shortDescription: 'AI-powered agent productivity suite',
      whatItDoes: 'Streamlines client management, compliance workflows, and document processing',
      audience: 'Title agents and brokers across the WFG network',
      whyBuilt: 'To reduce manual work by 60% and improve accuracy on high-volume transactions',
      rolloutNotes: 'Piloting with 50 agents in Q3 2026',
      demoUrl: null,
      kioskLocation: 'Kiosk A — Main Lobby',
      splashUrl: null,
      displayOrder: 1,
    },
    {
      id: 'seed-initiative-2',
      name: 'Smart Closing Portal',
      team: 'Product',
      shortDescription: 'Digital closing experience for buyers and sellers',
      whatItDoes: 'Allows fully remote closings with e-signatures and real-time status updates',
      audience: 'Homebuyers, sellers, and real estate agents',
      whyBuilt: 'Remote closings grew 3x post-2020; current process requires 12 manual steps',
      rolloutNotes: 'Available in 8 states, expanding nationwide by end of 2026',
      demoUrl: null,
      kioskLocation: 'Kiosk B — Exhibit Hall',
      splashUrl: null,
      displayOrder: 2,
    },
  ]
  for (const initiative of initiatives) {
    await prisma.initiative.upsert({ where: { id: initiative.id }, update: {}, create: initiative })
  }
  console.log(`Seeded ${initiatives.length} initiatives`)

  // Announcement
  await prisma.announcement.upsert({
    where: { id: 'seed-announcement-1' },
    update: {},
    create: {
      id: 'seed-announcement-1',
      title: 'Welcome to WFG Executive Summit 2026!',
      body: "Check the Agenda tab for today's sessions. Activities open at 8am. See you in the main hall!",
      publishedByAdminId: admin.id,
      expiresAt: new Date('2026-12-31T23:59:59Z'),
    },
  })
  console.log('Seeded 1 announcement')

  // ─── Phase 2 ─────────────────────────────────────────────────────────────

  // Activities
  const activities = [
    { id: 'seed-activity-trivia',     type: 'trivia'           as const, name: 'Summit Trivia',        maxPoints: 200, isOneShot: true,  isOpen: true,  configJson: { pointsPerQuestion: 10 } },
    { id: 'seed-activity-prompt',     type: 'prompt_challenge' as const, name: 'Prompt Challenge',      maxPoints: 100, isOneShot: false, isOpen: true,  configJson: { pointsCorrect: 20, pointsWrong: 10 } },
    { id: 'seed-activity-touchpoint', type: 'touchpoint'       as const, name: 'Touchpoint Scans',      maxPoints: 0,   isOneShot: false, isOpen: true,  configJson: null },
    { id: 'seed-activity-avatar',     type: 'avatar'           as const, name: 'AI Avatar Creator',     maxPoints: 50,  isOneShot: true,  isOpen: false, configJson: null },
    { id: 'seed-activity-golden',     type: 'golden_points'    as const, name: 'Golden Points',         maxPoints: 100, isOneShot: false, isOpen: false, configJson: null },
  ]
  for (const act of activities) {
    const { id, ...data } = act
    await prisma.activity.upsert({ where: { id }, update: { maxPoints: data.maxPoints, configJson: data.configJson }, create: act })
  }
  console.log(`Seeded ${activities.length} activities`)

  // Trivia questions (20 questions from demo — v7 HTML)
  const triviaQuestions = [
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
  ]
  const triviaIds = triviaQuestions.map((q) => q.id)
  await prisma.triviaQuestion.deleteMany({ where: { id: { notIn: triviaIds } } })
  await prisma.triviaQuestion.createMany({
    data: triviaQuestions.map((q) => ({ ...q, isActive: true })),
    skipDuplicates: true,
  })
  console.log(`Seeded ${triviaQuestions.length} trivia questions`)

  // Prompt Challenge questions (5 questions from demo — v7 HTML)
  const pcQuestions = [
    {
      id: 'seed-pc-01',
      category: 'Underwriting',
      scenarioText: 'A title agent needs to quickly understand a complex easement issue on a property. What\'s the best AI prompt?',
      optionsJson: [
        '"Tell me about easements."',
        '"Explain the legal implications of a utility easement on a residential property at 123 Main St where a garage encroaches on the easement area, and outline the steps to resolve it before closing."',
        '"What is a utility easement?"',
        '"Help me with a title issue."',
      ],
      correctIndex: 1,
      explanation: 'Provides full context — property type, specific issue, location details, and a clear goal. The more context you give, the better the AI response.',
      displayOrder: 1,
    },
    {
      id: 'seed-pc-02',
      category: 'Client Communication',
      scenarioText: 'A first-time homebuyer is confused about title insurance. How would you prompt an AI to help explain it?',
      optionsJson: [
        '"Explain title insurance simply."',
        '"Write me a title insurance explainer."',
        '"Write a friendly 3-paragraph explanation of title insurance for a first-time homebuyer who\'s nervous about closing costs, using simple language and a reassuring tone."',
        '"What does title insurance cover?"',
      ],
      correctIndex: 2,
      explanation: 'Specifies the audience (first-time buyer), emotional context (nervous), format (3 paragraphs), and tone (friendly, reassuring).',
      displayOrder: 2,
    },
    {
      id: 'seed-pc-03',
      category: 'Fraud Detection',
      scenarioText: 'You\'ve noticed a suspicious pattern in wire instructions. How do you prompt AI to help you investigate?',
      optionsJson: [
        '"Check if this wire is fraud."',
        '"Here are the wire instructions I received. Analyze them for red flags: last-minute change requested by email, different bank than original, urgent language used. What fraud patterns do these match and what should I do?"',
        '"What is wire fraud?"',
        '"I think someone is committing fraud. Help me."',
      ],
      correctIndex: 1,
      explanation: 'Shares the specific facts, asks for pattern matching against known fraud types, and requests actionable next steps.',
      displayOrder: 3,
    },
    {
      id: 'seed-pc-04',
      category: 'Operational Efficiency',
      scenarioText: 'You want to build a checklist for closing day. How do you prompt AI most effectively?',
      optionsJson: [
        '"Give me a closing checklist."',
        '"What do title agents do at closing?"',
        '"Create a closing checklist."',
        '"Create a detailed closing day checklist for a residential real estate transaction in California. Include pre-closing, day-of, and post-closing steps. Format it as a checklist I can share with my team."',
      ],
      correctIndex: 3,
      explanation: 'Specifies transaction type, jurisdiction, time phases, and a shareable format. Specificity always produces better results.',
      displayOrder: 4,
    },
    {
      id: 'seed-pc-05',
      category: 'Business Development',
      scenarioText: 'You want to write a LinkedIn post about your title services to attract realtor referrals. Which prompt produces the best result?',
      optionsJson: [
        '"Write a LinkedIn post about my title company."',
        '"Write a compelling LinkedIn post for a WFG title agent targeting real estate agents. Highlight fast closing timelines, proactive communication, and local expertise. Keep it under 200 words with a strong call to action."',
        '"Help me market my services."',
        '"Write about title insurance on LinkedIn."',
      ],
      correctIndex: 1,
      explanation: 'Specifies platform, audience, key value props, length, and CTA. These constraints produce a focused, usable post instead of generic content.',
      displayOrder: 5,
    },
  ]
  const pcIds = pcQuestions.map((q) => q.id)
  await prisma.promptChallengeQuestion.deleteMany({ where: { id: { notIn: pcIds } } })
  await prisma.promptChallengeQuestion.createMany({ data: pcQuestions, skipDuplicates: true })
  console.log(`Seeded ${pcQuestions.length} prompt challenge questions`)

  // Touchpoints (4 locations with HMAC-signed QR tokens)
  const touchpointDefs = [
    { id: 'seed-tp-01', name: 'Main Lobby Check-In',  points: 25, locationDescription: 'Near entrance, Kiosk A' },
    { id: 'seed-tp-02', name: 'Exhibit Hall Scan',     points: 25, locationDescription: 'Exhibit Hall, Kiosk B' },
    { id: 'seed-tp-03', name: 'Keynote Room Entry',    points: 25, locationDescription: 'Main ballroom entrance' },
    { id: 'seed-tp-04', name: 'Networking Lounge',     points: 25, locationDescription: 'Level 2 lounge area' },
  ]
  for (const tp of touchpointDefs) {
    const qrToken = signToken(tp.id)
    await prisma.touchpoint.upsert({
      where: { id: tp.id },
      update: {},
      create: { ...tp, qrToken, isActive: true },
    })
    console.log(`  Touchpoint "${tp.name}" qrToken: ${qrToken}`)
  }
  console.log(`Seeded ${touchpointDefs.length} touchpoints`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
