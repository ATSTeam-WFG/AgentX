import type { AgendaEvent } from '@/lib/api/agenda';

// Full agenda from AgentX_v7.html — the authoritative schedule for ES 2026
// Day 0 = Wed Jun 3 (Arrivals), Day 1 = Thu Jun 4 (Summit Day One), Day 2 = Fri Jun 5 (Departures)

function toISO(dayKey: 'wed' | 'thu' | 'fri', hh: number, mm: number) {
  const dateMap: Record<string, number> = { wed: 3, thu: 4, fri: 5 };
  return new Date(2026, 5, dateMap[dayKey], hh, mm).toISOString();
}

export const V7_EVENTS: AgendaEvent[] = [
  // Wednesday · June 3 — Arrivals & Welcome Dinner
  { id: 'ev1', day: 0, name: 'Guest Arrivals & Registration',  location: 'Hotel Lobby',        startsAt: toISO('wed',  3,  0), endsAt: toISO('wed',  6,  0), version: 1 },
  { id: 'ev2', day: 0, name: 'Welcome Cocktail Reception',     location: 'Terrace Lounge',     startsAt: toISO('wed',  6, 30), endsAt: toISO('wed',  7, 30), version: 1 },
  { id: 'ev3', day: 0, name: 'Opening Welcome Dinner',         location: 'Grand Ballroom',     startsAt: toISO('wed',  7, 30), endsAt: toISO('wed',  9, 30), version: 1 },
  // Thursday · June 4 — Summit Day One
  { id: 'ev4', day: 1, name: 'Breakfast & Networking',         location: 'Seacrest Terrace',   startsAt: toISO('thu',  7, 30), endsAt: toISO('thu',  9,  0), version: 1 },
  { id: 'ev5', day: 1, name: 'Opening General Session',        location: 'Seacrest Ballroom',  startsAt: toISO('thu',  9,  0), endsAt: toISO('thu', 10,  0), version: 1 },
  { id: 'ev6', day: 1, name: 'Keynote Address',                location: 'Seacrest Ballroom',  startsAt: toISO('thu', 10,  5), endsAt: toISO('thu', 10, 50), version: 1 },
  { id: 'ev7', day: 1, name: 'ATS Innovation Showcase',        location: 'Innovation Hub',     startsAt: toISO('thu', 10, 50), endsAt: toISO('thu', 11, 20), version: 1 },
  { id: 'ev8', day: 1, name: 'Breakout Sessions',              location: 'Breakout Rooms A–D', startsAt: toISO('thu', 11, 30), endsAt: toISO('thu', 12,  0), version: 1 },
  { id: 'ev9', day: 1, name: 'Lunch',                          location: 'Seacrest Terrace',   startsAt: toISO('thu', 12,  0), endsAt: toISO('thu', 13,  0), version: 1 },
  { id: 'evA', day: 1, name: 'Afternoon Breakout Sessions',    location: 'Breakout Rooms A–D', startsAt: toISO('thu', 13,  0), endsAt: toISO('thu', 15,  0), version: 1 },
  { id: 'evB', day: 1, name: 'ATS Kiosk & Demo Zone',          location: 'Innovation Hub',     startsAt: toISO('thu', 15,  0), endsAt: toISO('thu', 17,  0), version: 1 },
  { id: 'evC', day: 1, name: 'Top Agent Awards Pre-Show',      location: 'Seacrest Ballroom',  startsAt: toISO('thu', 17, 30), endsAt: toISO('thu', 18,  0), version: 1 },
  { id: 'evD', day: 1, name: 'Top Agent Awards Ceremony',      location: 'Seacrest Ballroom',  startsAt: toISO('thu', 18,  0), endsAt: toISO('thu', 21,  0), version: 1 },
  { id: 'evE', day: 1, name: 'After Party',                    location: 'Venue TBD',          startsAt: toISO('thu', 21, 30), endsAt: toISO('thu', 23, 30), version: 1 },
  // Friday · June 5 — Departures
  { id: 'evF', day: 2, name: 'Farewell Breakfast',             location: 'Seacrest Terrace',   startsAt: toISO('fri',  7, 30), endsAt: toISO('fri',  9,  0), version: 1 },
];
