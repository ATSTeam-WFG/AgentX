import type { AgendaEvent } from '@/lib/api/agenda';

// Official 2026 Executive Summit Agenda
// Day 0 = Wed Jun 3 (Women's Leadership Seminar)
// Day 1 = Thu Jun 4 (Summit Day One)
// Day 2 = Fri Jun 5 (Departures)

function toISO(dayKey: 'wed' | 'thu' | 'fri', hh: number, mm: number) {
  const dateMap: Record<string, number> = { wed: 3, thu: 4, fri: 5 };
  return new Date(2026, 5, dateMap[dayKey], hh, mm).toISOString();
}

export const V7_EVENTS: AgendaEvent[] = [

  // ── Wednesday · June 3 ──────────────────────────────────────────────────────
  {
    id: 'ev1', day: 0,
    name: "Women's Leadership Seminar",
    location: 'Opal Grand Resort & Spa · Delray Beach, FL',
    startsAt: toISO('wed', 13, 0), endsAt: toISO('wed', 17, 15),
    description: "Women's Executive Leadership Session\n\nA premier, half-day experience dedicated to empowering women leading the future of title and settlement services.\n\nParticipants will:\n• Engage in advanced discussions on leadership, innovation, and influence.\n• Learn to leverage technology as a catalyst for personal and organizational transformation.\n• Build a strong community of high-impact female leaders championing progress in the industry.",
    version: 1,
  },

  // ── Thursday · June 4 ───────────────────────────────────────────────────────

  // All-day open rooms
  {
    id: 'ev2', day: 1,
    name: 'Registration Desk Open',
    startsAt: toISO('thu', 7, 30), endsAt: toISO('thu', 12, 0),
    version: 1,
  },
  {
    id: 'ev3', day: 1,
    name: 'ATS Demo Room Open',
    startsAt: toISO('thu', 7, 30), endsAt: toISO('thu', 16, 0),
    version: 1,
  },
  {
    id: 'ev4', day: 1,
    name: 'Sponsor Exhibits Open',
    startsAt: toISO('thu', 7, 30), endsAt: toISO('thu', 17, 0),
    version: 1,
  },

  // Morning sessions
  {
    id: 'ev5', day: 1,
    name: 'Breakfast',
    startsAt: toISO('thu', 7, 30), endsAt: toISO('thu', 8, 30),
    version: 1,
  },
  {
    id: 'ev6', day: 1,
    name: 'Opening Remarks',
    startsAt: toISO('thu', 8, 45), endsAt: toISO('thu', 8, 55),
    version: 1,
  },
  {
    id: 'ev7', day: 1,
    name: "What's Next: The Q2 Economic Perspective",
    speakerName: 'Patrick F. Stone · Bill Conerly',
    startsAt: toISO('thu', 9, 0), endsAt: toISO('thu', 9, 45),
    version: 1,
  },
  {
    id: 'ev8', day: 1,
    name: 'Agent 3.0: Amplify Your Edge',
    speakerName: 'Gene Rebadow',
    startsAt: toISO('thu', 9, 50), endsAt: toISO('thu', 10, 0),
    version: 1,
  },
  {
    id: 'ev9', day: 1,
    name: 'Beyond Faster: Turn AI from Commodity into Competitive Advantage',
    speakerName: 'Julie Holmes',
    startsAt: toISO('thu', 10, 5), endsAt: toISO('thu', 10, 50),
    version: 1,
  },
  {
    id: 'evA', day: 1,
    name: 'ATS Team: Custom AI Solutions for Title Agents',
    speakerName: 'Ryan Ozonian, Vedant Upganlawar & Team',
    startsAt: toISO('thu', 10, 50), endsAt: toISO('thu', 11, 20),
    version: 1,
  },
  {
    id: 'evB', day: 1,
    name: 'Real Talk: How Title Agents Actually Use AI Solutions in Their Business',
    speakerName: 'Roxanne Kos, Jaime Kosofsky & Panel',
    startsAt: toISO('thu', 11, 25), endsAt: toISO('thu', 11, 45),
    version: 1,
  },
  {
    id: 'evC', day: 1,
    name: 'Networking Lunch',
    startsAt: toISO('thu', 12, 0), endsAt: toISO('thu', 13, 0),
    version: 1,
  },

  // Afternoon sessions
  {
    id: 'evD', day: 1,
    name: 'The AI Shift: What Title Agents Need to Know',
    speakerName: 'Mo Choumil · Michael Ruder · Wendy Lunt',
    startsAt: toISO('thu', 13, 0), endsAt: toISO('thu', 13, 30),
    version: 1,
  },
  {
    id: 'evE', day: 1,
    name: 'AI Search: Helping You Get Found on AI Platforms',
    speakerName: 'Jeff Lobb',
    startsAt: toISO('thu', 13, 30), endsAt: toISO('thu', 14, 0),
    version: 1,
  },

  // Breakout sessions
  {
    id: 'evF', day: 1,
    name: "Breakout: Don't Get Left Behind: AI for the Modern Title Agent",
    location: 'Beginner/Moderate & Advanced Rooms',
    startsAt: toISO('thu', 14, 15), endsAt: toISO('thu', 15, 0),
    version: 1,
  },
  {
    id: 'evG', day: 1,
    name: 'Breakout: Replace the Busy Work: Automate, Accelerate, Dominate Your Workflow',
    location: 'Beginner/Moderate & Advanced Rooms',
    startsAt: toISO('thu', 15, 0), endsAt: toISO('thu', 15, 45),
    version: 1,
  },
  {
    id: 'evH', day: 1,
    name: 'ATS Demo Room',
    speakerName: 'Vedant Upganlawar · Priyal Katudia · Anish Tatke',
    startsAt: toISO('thu', 14, 15), endsAt: toISO('thu', 15, 35),
    version: 1,
  },

  // Evening
  {
    id: 'evI', day: 1,
    name: 'Top Agent Awards',
    location: 'Seacrest Ballroom',
    startsAt: toISO('thu', 18, 0), endsAt: toISO('thu', 21, 30),
    version: 1,
  },
  {
    id: 'evJ', day: 1,
    name: 'After Party',
    location: 'Seacrest Ballroom',
    startsAt: toISO('thu', 21, 30), endsAt: toISO('thu', 22, 30),
    version: 1,
  },

  // ── Friday · June 5 ─────────────────────────────────────────────────────────
  {
    id: 'evK', day: 2,
    name: 'Departures · Thank You for Joining Us!',
    startsAt: toISO('fri', 8, 0), endsAt: toISO('fri', 12, 0),
    version: 1,
  },
];
