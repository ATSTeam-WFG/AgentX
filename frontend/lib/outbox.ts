import { db, type OutboxEntry } from './dexie';
import { apiFetch } from './api';

const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_MS = 1000;

let flushing = false;

export async function enqueue(
  endpoint: string,
  method: 'POST' | 'PATCH',
  body: Record<string, unknown>,
): Promise<string> {
  const id = crypto.randomUUID();
  await db.outbox.add({ id, endpoint, method, body, createdAt: Date.now(), attempts: 0 });
  return id;
}

export async function flushOutbox(): Promise<void> {
  if (flushing) return;
  flushing = true;

  try {
    const entries = await db.outbox
      .filter(e => !e.failedAt && e.attempts < MAX_ATTEMPTS)
      .sortBy('createdAt');

    for (const entry of entries) {
      await processEntry(entry);
    }
  } finally {
    flushing = false;
  }
}

async function processEntry(entry: OutboxEntry): Promise<void> {
  try {
    await apiFetch(entry.endpoint, {
      method: entry.method,
      body: JSON.stringify({ ...entry.body, dedupeKey: entry.id }),
    });
    await db.outbox.delete(entry.id);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;

    if (status === 409) {
      await db.outbox.delete(entry.id);
      return;
    }

    const attempts = entry.attempts + 1;
    if (attempts >= MAX_ATTEMPTS || (status && status >= 400 && status < 500)) {
      await db.outbox.update(entry.id, {
        failedAt: Date.now(),
        lastError: String(err),
        attempts,
      });
    } else {
      await db.outbox.update(entry.id, { attempts });
      const delay = BACKOFF_BASE_MS * Math.pow(2, attempts - 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

export function initOutboxListeners(): () => void {
  const handler = () => flushOutbox();
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
