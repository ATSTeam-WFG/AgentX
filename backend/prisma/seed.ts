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
    { id: 'seed-activity-trivia',     type: 'trivia'           as const, name: 'Summit Trivia',        maxPoints: 100, isOneShot: true,  isOpen: true,  configJson: null },
    { id: 'seed-activity-prompt',     type: 'prompt_challenge' as const, name: 'Prompt Challenge',      maxPoints: 50,  isOneShot: false, isOpen: true,  configJson: { pointsPerQuestion: 10 } },
    { id: 'seed-activity-touchpoint', type: 'touchpoint'       as const, name: 'Touchpoint Scans',      maxPoints: 0,   isOneShot: false, isOpen: true,  configJson: null },
    { id: 'seed-activity-avatar',     type: 'avatar'           as const, name: 'AI Avatar Creator',     maxPoints: 50,  isOneShot: true,  isOpen: false, configJson: null },
    { id: 'seed-activity-golden',     type: 'golden_points'    as const, name: 'Golden Points',         maxPoints: 100, isOneShot: false, isOpen: false, configJson: null },
  ]
  for (const act of activities) {
    await prisma.activity.upsert({ where: { id: act.id }, update: {}, create: act })
  }
  console.log(`Seeded ${activities.length} activities`)

  // Trivia questions (60 questions across 4 categories, 2 difficulties)
  const triviaQuestions = [
    // Title Insurance — easy
    { id: 'seed-trivia-01', category: 'Title Insurance', difficulty: 'easy', questionText: 'What does title insurance primarily protect against?', optionsJson: ['Future property damage', 'Past defects in the title', 'Mortgage default', 'Natural disasters'], correctIndex: 1 },
    { id: 'seed-trivia-02', category: 'Title Insurance', difficulty: 'easy', questionText: 'Who typically pays for the lender\'s title insurance policy?', optionsJson: ['The lender', 'The seller', 'The buyer', 'The real estate agent'], correctIndex: 2 },
    { id: 'seed-trivia-03', category: 'Title Insurance', difficulty: 'easy', questionText: 'What is an ALTA policy?', optionsJson: ['A type of homeowner\'s insurance', 'A standard title insurance policy issued by American Land Title Association', 'A federal mortgage guarantee', 'An appraisal method'], correctIndex: 1 },
    { id: 'seed-trivia-04', category: 'Title Insurance', difficulty: 'easy', questionText: 'How long does a title insurance policy last?', optionsJson: ['1 year', '5 years', 'As long as you own the property', '30 years'], correctIndex: 2 },
    { id: 'seed-trivia-05', category: 'Title Insurance', difficulty: 'easy', questionText: 'What is a title search?', optionsJson: ['A review of public records to check for title defects', 'An inspection of the physical property', 'A credit check on the buyer', 'A survey of the land boundaries'], correctIndex: 0 },
    { id: 'seed-trivia-06', category: 'Title Insurance', difficulty: 'easy', questionText: 'What is an owner\'s title insurance policy?', optionsJson: ['Protects the lender\'s interest', 'Protects the homeowner\'s equity interest', 'Covers construction defects', 'Insures against property tax liens only'], correctIndex: 1 },
    { id: 'seed-trivia-07', category: 'Title Insurance', difficulty: 'easy', questionText: 'What does a title company do during closing?', optionsJson: ['Approves the mortgage loan', 'Facilitates the transfer of property and issues title insurance', 'Appraises the property value', 'Conducts home inspections'], correctIndex: 1 },
    { id: 'seed-trivia-08', category: 'Title Insurance', difficulty: 'easy', questionText: 'Which of these is a common title defect?', optionsJson: ['Low appraisal value', 'Unpaid liens from a previous owner', 'High interest rates', 'Poor credit score of buyer'], correctIndex: 1 },
    // Title Insurance — hard
    { id: 'seed-trivia-09', category: 'Title Insurance', difficulty: 'hard', questionText: 'What is a "chain of title"?', optionsJson: ['The physical boundary markers of a property', 'The chronological sequence of ownership transfers for a property', 'The list of all liens on a property', 'The mortgage payment schedule'], correctIndex: 1 },
    { id: 'seed-trivia-10', category: 'Title Insurance', difficulty: 'hard', questionText: 'What is subrogation in title insurance?', optionsJson: ['The process of canceling a policy', 'The insurer\'s right to pursue a third party after paying a claim', 'Transferring coverage to a new owner', 'Reducing the policy amount over time'], correctIndex: 1 },
    { id: 'seed-trivia-11', category: 'Title Insurance', difficulty: 'hard', questionText: 'What does "marketable title" mean?', optionsJson: ['A title that will sell quickly', 'A title free from reasonable doubt or litigation risk', 'A title with the highest appraised value', 'A title held by a licensed agent'], correctIndex: 1 },
    { id: 'seed-trivia-12', category: 'Title Insurance', difficulty: 'hard', questionText: 'What is an "endorsement" in a title insurance policy?', optionsJson: ['A cancellation notice', 'A modification that adds or limits coverage', 'A claim filing form', 'A premium payment receipt'], correctIndex: 1 },
    { id: 'seed-trivia-13', category: 'Title Insurance', difficulty: 'hard', questionText: 'Which party\'s interest does the ALTA lender\'s policy protect?', optionsJson: ['The buyer', 'The seller', 'The mortgage lender', 'The title company'], correctIndex: 2 },
    { id: 'seed-trivia-14', category: 'Title Insurance', difficulty: 'hard', questionText: 'What is a "mechanic\'s lien" and why is it relevant to title insurance?', optionsJson: ['A lien by the DMV for unpaid car taxes', 'A claim by contractors for unpaid work that can cloud title', 'A mortgage held by a mechanics union', 'A lien against machinery on the property'], correctIndex: 1 },
    { id: 'seed-trivia-15', category: 'Title Insurance', difficulty: 'hard', questionText: 'What is the primary difference between CLTA and ALTA policies?', optionsJson: ['CLTA covers lenders; ALTA covers owners', 'ALTA offers broader coverage including survey-related issues', 'They are identical policies from different states', 'CLTA is cheaper because it covers more risks'], correctIndex: 1 },
    // Real Estate Law — easy
    { id: 'seed-trivia-16', category: 'Real Estate Law', difficulty: 'easy', questionText: 'What is escrow in a real estate transaction?', optionsJson: ['A type of mortgage', 'A neutral third-party holding funds until conditions are met', 'The property deed', 'A home inspection report'], correctIndex: 1 },
    { id: 'seed-trivia-17', category: 'Real Estate Law', difficulty: 'easy', questionText: 'What does "closing disclosure" refer to?', optionsJson: ['A document listing all final loan terms and closing costs', 'The seller\'s disclosure of property defects', 'A notice of foreclosure', 'An appraisal report'], correctIndex: 0 },
    { id: 'seed-trivia-18', category: 'Real Estate Law', difficulty: 'easy', questionText: 'What is a deed?', optionsJson: ['A mortgage contract', 'A legal document transferring property ownership', 'A home inspection checklist', 'An insurance certificate'], correctIndex: 1 },
    { id: 'seed-trivia-19', category: 'Real Estate Law', difficulty: 'easy', questionText: 'What is "recording" a deed?', optionsJson: ['Photographing the property', 'Filing the deed with the county to make ownership public record', 'Notarizing the deed', 'Sending the deed to the lender'], correctIndex: 1 },
    { id: 'seed-trivia-20', category: 'Real Estate Law', difficulty: 'easy', questionText: 'What is a "contingency" in a real estate contract?', optionsJson: ['The final sale price', 'A condition that must be met for the sale to proceed', 'A type of mortgage interest rate', 'A property tax adjustment'], correctIndex: 1 },
    { id: 'seed-trivia-21', category: 'Real Estate Law', difficulty: 'easy', questionText: 'What does "joint tenancy" mean in property ownership?', optionsJson: ['Renting a property together', 'Owning property with right of survivorship among co-owners', 'A lease agreement between two tenants', 'A temporary ownership arrangement'], correctIndex: 1 },
    { id: 'seed-trivia-22', category: 'Real Estate Law', difficulty: 'easy', questionText: 'What is a "quitclaim deed"?', optionsJson: ['A deed that guarantees clear title', 'A deed that transfers whatever interest the grantor has without warranties', 'A deed used to cancel a mortgage', 'A deed issued at foreclosure'], correctIndex: 1 },
    { id: 'seed-trivia-23', category: 'Real Estate Law', difficulty: 'easy', questionText: 'What is the "right of first refusal" in real estate?', optionsJson: ['The buyer\'s right to inspect before closing', 'The right to match any offer before a property is sold to another party', 'The seller\'s right to refuse all offers', 'The lender\'s right to foreclose first'], correctIndex: 1 },
    // Real Estate Law — hard
    { id: 'seed-trivia-24', category: 'Real Estate Law', difficulty: 'hard', questionText: 'What is "adverse possession"?', optionsJson: ['Foreclosure by the government', 'Acquiring title by openly occupying another\'s land for a statutory period', 'A hostile takeover of a business property', 'Buying land below market value'], correctIndex: 1 },
    { id: 'seed-trivia-25', category: 'Real Estate Law', difficulty: 'hard', questionText: 'What is an "easement appurtenant"?', optionsJson: ['An easement that expires after one year', 'An easement benefiting a neighboring property and transferring with the land', 'A personal right to use property that cannot be transferred', 'A government-granted access right'], correctIndex: 1 },
    { id: 'seed-trivia-26', category: 'Real Estate Law', difficulty: 'hard', questionText: 'What is a "lis pendens"?', optionsJson: ['A type of property tax', 'A notice that a lawsuit affecting title to real property is pending', 'A lien for unpaid contractor work', 'A deed restriction'], correctIndex: 1 },
    { id: 'seed-trivia-27', category: 'Real Estate Law', difficulty: 'hard', questionText: 'What does RESPA regulate?', optionsJson: ['Property appraisal standards', 'Settlement procedures and kickbacks in real estate transactions', 'Zoning and land use', 'Construction safety standards'], correctIndex: 1 },
    { id: 'seed-trivia-28', category: 'Real Estate Law', difficulty: 'hard', questionText: 'What is a "covenant running with the land"?', optionsJson: ['A temporary lease restriction', 'A deed restriction that binds future owners of the property', 'A verbal agreement between neighbors', 'A property tax covenant'], correctIndex: 1 },
    { id: 'seed-trivia-29', category: 'Real Estate Law', difficulty: 'hard', questionText: 'Under TRID, what is the required waiting period after a Closing Disclosure is issued?', optionsJson: ['24 hours', '3 business days', '7 calendar days', '10 business days'], correctIndex: 1 },
    { id: 'seed-trivia-30', category: 'Real Estate Law', difficulty: 'hard', questionText: 'What is "tenancy in common"?', optionsJson: ['A lease shared by multiple tenants', 'Co-ownership where each owner holds a separate transferable interest without survivorship rights', 'Joint ownership with equal shares only', 'A type of condominium ownership'], correctIndex: 1 },
    // WFG History — easy
    { id: 'seed-trivia-31', category: 'WFG History', difficulty: 'easy', questionText: 'What does WFG stand for?', optionsJson: ['Western Financial Group', 'Williston Financial Group', 'Western Federal Group', 'Worldwide Financial Group'], correctIndex: 1 },
    { id: 'seed-trivia-32', category: 'WFG History', difficulty: 'easy', questionText: 'In what state was WFG founded?', optionsJson: ['California', 'Texas', 'Oregon', 'Florida'], correctIndex: 2 },
    { id: 'seed-trivia-33', category: 'WFG History', difficulty: 'easy', questionText: 'What year was WFG founded?', optionsJson: ['2005', '2010', '2012', '2015'], correctIndex: 2 },
    { id: 'seed-trivia-34', category: 'WFG History', difficulty: 'easy', questionText: 'What type of company is WFG primarily?', optionsJson: ['A mortgage lender', 'A title insurance and settlement services company', 'A real estate brokerage', 'A property management firm'], correctIndex: 1 },
    { id: 'seed-trivia-35', category: 'WFG History', difficulty: 'easy', questionText: 'Who founded WFG?', optionsJson: ['Patrick Stone', 'Warren Buffett', 'Steve Jobs', 'Robert Shiller'], correctIndex: 0 },
    { id: 'seed-trivia-36', category: 'WFG History', difficulty: 'easy', questionText: 'What is WFG\'s headquarters city?', optionsJson: ['Seattle', 'Portland', 'San Francisco', 'Denver'], correctIndex: 1 },
    { id: 'seed-trivia-37', category: 'WFG History', difficulty: 'easy', questionText: 'WFG operates in how many states?', optionsJson: ['All 50 states', '35 states', '25 states', '10 states'], correctIndex: 0 },
    { id: 'seed-trivia-38', category: 'WFG History', difficulty: 'easy', questionText: 'What is WFG\'s primary value proposition?', optionsJson: ['Lowest title insurance rates', 'Agent-centric, technology-forward title and settlement services', 'Fastest mortgage approvals', 'International real estate expertise'], correctIndex: 1 },
    // WFG History — hard
    { id: 'seed-trivia-39', category: 'WFG History', difficulty: 'hard', questionText: 'What does WFG\'s "Agents First" philosophy emphasize?', optionsJson: ['Automated agent replacement', 'Empowering title agents with tools, support, and partnership', 'Reducing agent commissions', 'Centralizing all operations at headquarters'], correctIndex: 1 },
    { id: 'seed-trivia-40', category: 'WFG History', difficulty: 'hard', questionText: 'Which underwriter does WFG use for its title policies?', optionsJson: ['First American', 'Old Republic', 'WFG National Title Insurance Company', 'Fidelity National'], correctIndex: 2 },
    { id: 'seed-trivia-41', category: 'WFG History', difficulty: 'hard', questionText: 'What technology platform does WFG offer agents for order management?', optionsJson: ['TitlePoint', 'WEST', 'MyWFG', 'SoftPro'], correctIndex: 2 },
    { id: 'seed-trivia-42', category: 'WFG History', difficulty: 'hard', questionText: 'WFG was acquired by which parent company?', optionsJson: ['Fidelity National Financial', 'Stewart Information Services', 'Doma Holdings', 'Williston Holding Company'], correctIndex: 3 },
    { id: 'seed-trivia-43', category: 'WFG History', difficulty: 'hard', questionText: 'What is WFG\'s "Emerald" program?', optionsJson: ['A luxury real estate listing service', 'A recognition and rewards program for top-performing agents', 'A green building certification', 'An escrow reserve fund'], correctIndex: 1 },
    { id: 'seed-trivia-44', category: 'WFG History', difficulty: 'hard', questionText: 'Which annual WFG event brings together top agents and executives?', optionsJson: ['WFG Summit', 'Executive Summit', 'Emerald Conference', 'Title Leaders Forum'], correctIndex: 1 },
    { id: 'seed-trivia-45', category: 'WFG History', difficulty: 'hard', questionText: 'What innovation did WFG pioneer in the closing process?', optionsJson: ['Blockchain title recording', 'Digital and remote online notarization (RON) closings', 'Instant title commitments via AI', 'Drone property surveys'], correctIndex: 1 },
    // Industry Trends — easy
    { id: 'seed-trivia-46', category: 'Industry Trends', difficulty: 'easy', questionText: 'What does RON stand for in real estate closings?', optionsJson: ['Real Online Notarization', 'Remote Online Notarization', 'Registered Official Notary', 'Remote Order Network'], correctIndex: 1 },
    { id: 'seed-trivia-47', category: 'Industry Trends', difficulty: 'easy', questionText: 'What is a "digital closing"?', optionsJson: ['A closing conducted entirely in person', 'A closing where some or all documents are signed electronically', 'A closing managed by a robot', 'A closing done via postal mail only'], correctIndex: 1 },
    { id: 'seed-trivia-48', category: 'Industry Trends', difficulty: 'easy', questionText: 'What trend has most impacted title industry technology in recent years?', optionsJson: ['Blockchain replacing all land records', 'Digital closings and remote online notarization', 'Elimination of title insurance requirements', 'Cryptocurrency property purchases'], correctIndex: 1 },
    { id: 'seed-trivia-49', category: 'Industry Trends', difficulty: 'easy', questionText: 'What is "proptech"?', optionsJson: ['Property tax technology', 'Technology innovation applied to the real estate industry', 'Proprietary mortgage technology', 'Property protection software'], correctIndex: 1 },
    { id: 'seed-trivia-50', category: 'Industry Trends', difficulty: 'easy', questionText: 'What does "e-closing" refer to?', optionsJson: ['Email correspondence during closing', 'An electronic or paperless closing process', 'Extended closing timeline', 'Emergency closing procedures'], correctIndex: 1 },
    { id: 'seed-trivia-51', category: 'Industry Trends', difficulty: 'easy', questionText: 'What is the CFPB\'s role in real estate transactions?', optionsJson: ['Insuring mortgages', 'Regulating consumer financial products and protecting homebuyers', 'Setting property values', 'Approving title companies'], correctIndex: 1 },
    { id: 'seed-trivia-52', category: 'Industry Trends', difficulty: 'easy', questionText: 'What does "wire fraud" mean in real estate?', optionsJson: ['Faulty electrical wiring disclosure', 'Fraudulent redirection of closing funds via fake wire instructions', 'Mortgage wire transfer delays', 'Title company fee disputes'], correctIndex: 1 },
    { id: 'seed-trivia-53', category: 'Industry Trends', difficulty: 'easy', questionText: 'What is a "purchase money mortgage"?', optionsJson: ['A mortgage used to buy the property being financed', 'A mortgage for home improvements only', 'A second mortgage after refinancing', 'A government-backed mortgage program'], correctIndex: 0 },
    // Industry Trends — hard
    { id: 'seed-trivia-54', category: 'Industry Trends', difficulty: 'hard', questionText: 'How does AI currently impact title searches?', optionsJson: ['AI replaces all human title examiners', 'AI automates document extraction and risk flagging to speed up searches', 'AI has no current application in title searches', 'AI sets title insurance premiums automatically'], correctIndex: 1 },
    { id: 'seed-trivia-55', category: 'Industry Trends', difficulty: 'hard', questionText: 'What is "instant title" in the modern market?', optionsJson: ['Waiving title insurance entirely', 'An AI-driven process that issues title commitments in minutes instead of days', 'A federal program providing immediate title transfers', 'Title insurance with no waiting period for claims'], correctIndex: 1 },
    { id: 'seed-trivia-56', category: 'Industry Trends', difficulty: 'hard', questionText: 'What challenge does "IPEN" (In-Person Electronic Notarization) address vs RON?', optionsJson: ['IPEN is cheaper than RON', 'IPEN requires physical presence but uses electronic signatures, bridging traditional and digital', 'IPEN is only for commercial properties', 'IPEN does not require a notary'], correctIndex: 1 },
    { id: 'seed-trivia-57', category: 'Industry Trends', difficulty: 'hard', questionText: 'What is the primary cybersecurity risk in a real estate transaction?', optionsJson: ['Title insurance fraud', 'Business email compromise redirecting wire transfers', 'Forged property deeds', 'Unauthorized property access'], correctIndex: 1 },
    { id: 'seed-trivia-58', category: 'Industry Trends', difficulty: 'hard', questionText: 'How has the 2024-2025 interest rate environment affected title volume?', optionsJson: ['Title volume increased significantly due to refinancing', 'Title volume compressed as higher rates reduced purchase and refi transactions', 'Title volume was unaffected', 'Title volume doubled due to cash buyers'], correctIndex: 1 },
    { id: 'seed-trivia-59', category: 'Industry Trends', difficulty: 'hard', questionText: 'What is a "lien release" and why is it critical at closing?', optionsJson: ['A document releasing the buyer from inspection obligations', 'A document confirming all prior liens on the property have been satisfied', 'The seller\'s agreement to release earnest money', 'A waiver of the property survey requirement'], correctIndex: 1 },
    { id: 'seed-trivia-60', category: 'Industry Trends', difficulty: 'hard', questionText: 'What does MISMO stand for and why does it matter?', optionsJson: ['Mortgage Industry Standards Maintenance Organization — it standardizes data exchange in mortgage', 'Multiple Issuer Secured Mortgage Organization — it insures lender pools', 'Minimum Insurance Standards for Mortgage Operations', 'Mortgage Identification and Security Monitoring Office'], correctIndex: 0 },
  ]
  for (const q of triviaQuestions) {
    await prisma.triviaQuestion.upsert({
      where: { id: q.id },
      update: {},
      create: { ...q, isActive: true },
    })
  }
  console.log(`Seeded ${triviaQuestions.length} trivia questions`)

  // Prompt Challenge questions (5 questions, one per category)
  const pcQuestions = [
    {
      id: 'seed-pc-01',
      category: 'Client Communication',
      scenarioText: 'A buyer calls you 2 hours before closing saying they cannot reach their lender and are worried the loan won\'t fund. What is the best prompt to get AI assistance here?',
      optionsJson: [
        '"Tell me something about mortgage loans."',
        '"Draft an urgent escalation email to a mortgage lender\'s closing department requesting immediate confirmation of wire transfer status for a closing in 2 hours."',
        '"What is a mortgage?"',
        '"Write a casual message asking about the loan."',
      ],
      correctIndex: 1,
      explanation: 'Effective AI prompts are specific, include the context (urgency, timeline, goal), and request a concrete output. Vague prompts produce generic, unhelpful responses.',
      displayOrder: 1,
    },
    {
      id: 'seed-pc-02',
      category: 'Compliance',
      scenarioText: 'Your manager asks you to use AI to help review a settlement statement for RESPA compliance issues. Which prompt is most effective?',
      optionsJson: [
        '"Check this document."',
        '"Review this HUD-1 settlement statement and flag any line items that may violate RESPA Section 8 prohibitions on kickbacks or unearned fees, explaining each concern."',
        '"Is this legal?"',
        '"Summarize the document."',
      ],
      correctIndex: 1,
      explanation: 'A good compliance prompt names the specific regulation (RESPA Section 8), the document type (HUD-1), and the desired output (flagged items with explanations).',
      displayOrder: 2,
    },
    {
      id: 'seed-pc-03',
      category: 'Risk Management',
      scenarioText: 'You need AI to help identify potential title risks from a preliminary report with an unusual recorded easement. What is the best prompt?',
      optionsJson: [
        '"What is an easement?"',
        '"Analyze this preliminary title report easement language and identify risks to the buyer\'s intended use of the property as a single-family residence, noting any rights that could limit development or access."',
        '"Is this easement bad?"',
        '"Summarize the easement."',
      ],
      correctIndex: 1,
      explanation: 'Risk-focused prompts specify the intended use of the property, the document to analyze, and the type of risks to look for — giving AI the context to produce actionable analysis.',
      displayOrder: 3,
    },
    {
      id: 'seed-pc-04',
      category: 'Technology',
      scenarioText: 'You want AI to help you write a follow-up email sequence for leads generated at an open house. Which prompt will produce the best results?',
      optionsJson: [
        '"Write emails for my leads."',
        '"Create a 3-email nurture sequence for open house leads in the title insurance industry: email 1 (same day, thank you + value of owner\'s title insurance), email 2 (day 3, educational content on the closing process), email 3 (day 7, call-to-action to discuss their home purchase timeline)."',
        '"What should I say to leads?"',
        '"Make some email templates."',
      ],
      correctIndex: 1,
      explanation: 'Multi-step content prompts need a clear structure (number of pieces, timing, purpose of each), audience context, and topic guidance so each output serves a distinct goal.',
      displayOrder: 4,
    },
    {
      id: 'seed-pc-05',
      category: 'Ethics',
      scenarioText: 'A client asks you to use AI to generate online reviews for your agency. What is the most ethical and professionally responsible response?',
      optionsJson: [
        'Use AI to generate several 5-star reviews with different names',
        'Decline and explain that fake reviews violate FTC guidelines and professional ethics; instead use AI to draft a follow-up email asking satisfied clients to leave honest reviews',
        'Use AI to write one review and post it anonymously',
        'Ask a colleague to post the AI-generated review',
      ],
      correctIndex: 1,
      explanation: 'Generating fake reviews violates FTC regulations on endorsements and deceptive advertising, and most professional codes of conduct. Ethical AI use means using it to facilitate genuine feedback, not fabricate it.',
      displayOrder: 5,
    },
  ]
  for (const q of pcQuestions) {
    await prisma.promptChallengeQuestion.upsert({ where: { id: q.id }, update: {}, create: q })
  }
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
