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
    { id: 'seed-activity-trivia',     type: 'trivia'           as const, name: 'Summit Trivia',        maxPoints: 500, isOneShot: true,  isOpen: true,  configJson: { pointsPerQuestion: 10 } },
    { id: 'seed-activity-prompt',     type: 'prompt_challenge' as const, name: 'Prompt Challenge',      maxPoints: 100, isOneShot: false, isOpen: true,  configJson: { pointsCorrect: 20, pointsWrong: 10 } },
    { id: 'seed-activity-touchpoint', type: 'touchpoint'       as const, name: 'Touchpoint Scans',      maxPoints: 0,   isOneShot: false, isOpen: true,  configJson: null },
    { id: 'seed-activity-avatar',     type: 'avatar'           as const, name: 'AI Avatar Creator',     maxPoints: 50,  isOneShot: true,  isOpen: false, configJson: null },
    { id: 'seed-activity-golden',     type: 'golden_points'    as const, name: 'Golden Points',         maxPoints: 100, isOneShot: false, isOpen: false, configJson: null },
  ]
  for (const act of activities) {
    const { id, ...data } = act
    await prisma.activity.upsert({ where: { id }, update: { maxPoints: data.maxPoints, isOpen: data.isOpen, configJson: data.configJson }, create: act })
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
  const triviaIds = triviaQuestions.map((q) => q.id)
  await prisma.triviaQuestion.deleteMany({ where: { id: { notIn: triviaIds } } })
  await prisma.triviaQuestion.createMany({
    data: triviaQuestions.map((q) => ({ ...q, isActive: true })),
    skipDuplicates: true,
  })
  console.log(`Seeded ${triviaQuestions.length} trivia questions`)

  // Prompt Challenge questions (5 categories — official content)
  const pcQuestions = [
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
