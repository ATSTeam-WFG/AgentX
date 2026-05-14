import Dexie, { type Table } from 'dexie';

export interface CachedAgendaEvent {
  id: string;
  day: number;
  starts_at: string;
  ends_at: string;
  name: string;
  description?: string;
  location?: string;
  speaker?: string;
  version: number;
}

export interface CachedActivity {
  id: string;
  type: string;
  name: string;
  max_points: number;
  is_open: boolean;
  completed?: boolean;
  points_earned?: number;
}

export interface CachedProfile {
  id: string;
  name: string;
  email: string;
  attendee_type: string;
  pending_admin_approval: boolean;
  avatar_url?: string;
  onboarding_interests?: string[];
  total_points?: number;
  rank?: number;
}

export interface CachedAnnouncement {
  id: string;
  title: string;
  body: string;
  published_at: string;
  expires_at?: string;
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
  }
}

export const db = new AgentXDb();
