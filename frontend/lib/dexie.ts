import Dexie, { type Table } from 'dexie';

export interface CachedAgendaEvent {
  id: string;
  day: number;
  startsAt: string;
  endsAt: string;
  name: string;
  description?: string;
  location?: string;
  speakerName?: string;
  version: number;
}

export interface CachedActivity {
  id: string;
  type: string;
  name: string;
  maxPoints: number;
  isOpen: boolean;
  isCompleted?: boolean;
  pointsEarned?: number;
}

export interface CachedProfile {
  id: string;
  name: string;
  email: string;
  attendeeType: string;
  pendingAdminApproval: boolean;
  avatarUrl?: string;
  onboardingInterests?: string[];
  totalPoints?: number;
  rank?: number;
}

export interface CachedAnnouncement {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  expiresAt?: string;
}

export interface OutboxEntry {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH';
  body: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  failedAt?: number;
  lastError?: string;
}

class AgentXDb extends Dexie {
  agenda!:        Table<CachedAgendaEvent, string>;
  activities!:    Table<CachedActivity, string>;
  outbox!:        Table<OutboxEntry, string>;
  profile!:       Table<CachedProfile, string>;
  announcements!: Table<CachedAnnouncement, string>;

  constructor() {
    super('agentx-db');
    this.version(1).stores({
      agenda:        'id, day, starts_at',
      activities:    'id, type',
      outbox:        'id, createdAt, attempts',
      profile:       'id',
      announcements: 'id, published_at',
    });
    this.version(2).stores({
      agenda:        'id, day, startsAt',
      activities:    'id, type',
      outbox:        'id, createdAt, attempts',
      profile:       'id',
      announcements: 'id, publishedAt',
    });
  }
}

export const db = new AgentXDb();
