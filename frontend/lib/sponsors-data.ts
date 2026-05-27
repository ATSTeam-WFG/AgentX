export interface SponsorEntry {
  slug: string;
  name: string;
  logo: string;
  dark: boolean;
  website?: string;
  description: string;
}

export const SPONSORS_DATA: SponsorEntry[] = [
  {
    slug: 'qualia',
    name: 'Qualia',
    logo: '/sponsors/logos/Qualia-logo-dark.png',
    dark: false,
    website: 'https://qualia.com',
    description:
      'Qualia is the leading comprehensive digital closing platform used by title, escrow, real estate and mortgage lending professionals to transform home buying and selling into simple, secure, enjoyable experiences for millions of homeowners each year. The Qualia platform provides a secure system of record for the real estate settlement ecosystem through a suite of workflow, accounting, reporting, and collaboration products as well as its expansive product and service integrations.',
  },
  {
    slug: 'closinglock',
    name: 'Closinglock',
    logo: '/sponsors/logos/Closinglock_Logo_Horizontal_Orange_CMYK%20(1).jpg',
    dark: false,
    website: 'https://www.closinglock.com',
    description:
      'Closinglock is building the trusted infrastructure for how money moves in real estate, providing insured digital payments, identity verification, and secure escrow management tools for title companies and law firms in all 50 states.',
  },
  {
    slug: 'bear-printing',
    name: 'Bear Printing',
    logo: '/sponsors/logos/Bear%20Printing%20Logo%20-%20Bricks%20-%20Wide.png',
    dark: false,
    website: 'https://www.bearprinting.com',
    description:
      'Bear Printing is a marketing platform built for agents and the title, escrow, and lending professionals who support them. We combine automated MLS-linked print marketing, AI-powered content creation, and national listing data into one seamless workflow, so agents spend less time on marketing and more time closing deals. Our RepConnect program gives title reps complete visibility into their agents’ marketing activity, co-branded communication, and the ability to act on agents’ behalf, all RESPA-compliant.',
  },
  {
    slug: 'pythonic',
    name: 'Pythonic',
    logo: '/sponsors/logos/Pythonic_logo%20horizontal-gradient.png',
    dark: false,
    description:
      'Pythonic Corporation is at the forefront of AI-driven document understanding technology. We have developed innovative solutions to tackle the unique challenges of processing scanned documents and PDFs. With our focus on the title insurance industry, Pythonic’s mission is to make it simple for our clients to incorporate state-of-the-art document AI capabilities into their systems and workflows.',
  },
  {
    slug: 'capital-bank',
    name: 'Capital Bank, N.A.',
    logo: '/sponsors/logos/Capital%20Bank%20Full%20Color.jpg',
    dark: false,
    website: 'https://capitalbankmd.com',
    description:
      'Capital Bank, N.A. understands the challenges of your market landscape and the risks you face in the industry and meets those challenges head-on with a customized approach. Working with us means you always have someone at your service to make recommendations, tailor solutions and support you, whether it’s our late wire room hours, protecting your accounts from unauthorized transactions, or setting up customized reporting.',
  },
  {
    slug: 'alanna',
    name: 'alanna.ai',
    logo: '/sponsors/logos/alanna-logo-horizontal%401x.png',
    dark: false,
    website: 'https://alanna.ai',
    description:
      'alanna.ai is the developer of the title industry’s only conversational AI technology capable of holding complex conversations with clients in 133 languages via SMS text or web chat. Alanna helps title agencies communicate intelligently and consistently with REALTORS, home buyers and sellers on routine or recurring requests. The technology has been shown to resolve up to 97% of a typical title agency’s inbound emails and phone calls without requiring human involvement and is available to serve clients 24/7.',
  },
  {
    slug: 'datatrace',
    name: 'DataTrace',
    logo: '/sponsors/logos/DataTrace-logo-color.png',
    dark: false,
    website: 'https://www.datatracetitle.com',
    description:
      'DataTrace Information Services LLC, the nation’s largest provider of property and ownership data and title automation solutions, enables title and settlement companies to streamline their processes, increase efficiency and drive growth. The company’s solutions are powered by the industry’s most complete network of geographic title plants and most comprehensive property information data set, including nearly 8.6 billion recorded document images.',
  },
  {
    slug: 'signature-xcel',
    name: 'Signature Xcel',
    logo: '/sponsors/logos/Signature-Xcel-Logo-R-Tag-Lockup-Blue-v2.jpg',
    dark: false,
    website: 'https://www.signaturexcel.com',
    description:
      'Signature Xcel is the premier national notary signing agency with 70k+ approved and vetted notary signing agents providing nationwide coverage. We have integrations with all the major title software. 4.9 of 5 rating in several vendor marketplaces, best-in-class customer service. ALTA Elite Provider, winner of the BBB Torch Award for Ethics and HousingWire Vanguard 100.',
  },
  {
    slug: 'connect',
    name: 'Connect Services',
    logo: '/sponsors/logos/Connect%20Powered%20by%20PLACE.png.svg',
    dark: false,
    website: 'https://connectservices.com',
    description:
      'Connect Services helps title agencies support clients during the move-in process by coordinating utilities and home services. It extends the client experience beyond closing while creating a no-lift revenue opportunity for partner agencies.',
  },
  {
    slug: 'palmagent',
    name: 'PalmAgent',
    logo: '/sponsors/logos/PalmAgent_white%20logo.png',
    dark: true,
    website: 'https://palmagent.com',
    description:
      "PalmAgent is real estate's #1 title sales tool, a white-label platform built for title sales reps and the realtors they work with. We give your team the calculators, estimates, and agent-facing tools they use every day, branded as your company in the realtor's pocket. After 25 years and a 94% client retention rate, we've built the leverage your sales team needs to flip realtors off competitors, keep top producers loyal, and turn passive users into active referrers, all on one platform, priced per market.",
  },
];
