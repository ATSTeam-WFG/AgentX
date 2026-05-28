import { afterAll, beforeEach } from 'vitest'
import { prisma } from '../../db'
import { redis } from '../../redis'
import { closeTestApp } from './app'

// Single atomic TRUNCATE with CASCADE — avoids FK violations from pgbouncer
// running individual DELETEs on separate connections. Seed fixtures (Activity,
// TriviaQuestion, Touchpoint, Invitee, etc.) are intentionally omitted so that
// tests which rely on seeded records (e.g. admin-invitees.test.ts) keep working
// across files.
const USER_DATA_TABLES = [
  'TriviaAnswer', 'TouchpointScan', 'PromptChallengeAnswer',
  'GoldenPointsSubmission', 'SponsorImpression', 'EventFeedback', 'AppFeedback',
  'Job', 'ActivityAttempt', 'Submission', 'AuditLog', 'PointAdjustment',
  'UserScore', 'Session', 'User', 'PushSubscription',
  // Announcement is admin-created reference data seeded into the DB;
  // removing it from truncation lets content.test.ts find seeded announcements.
].map((t) => `"${t}"`).join(', ')

// Use CASCADE; no RESTART IDENTITY since all PKs are UUIDs.
const TRUNCATE_SQL = `TRUNCATE TABLE ${USER_DATA_TABLES} CASCADE`

async function truncateWithRetry(attempts = 5): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      // Both statements must be in the same transaction so pgbouncer routes them
      // to the same backend connection — SET LOCAL only applies within the transaction.
      await prisma.$transaction([
        prisma.$executeRawUnsafe(`SET LOCAL lock_timeout = '2s'`),
        prisma.$executeRawUnsafe(TRUNCATE_SQL),
      ])
      return
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? ''
      const isRetryable = msg.includes('deadlock') || msg.includes('lock timeout')
      if (i < attempts - 1 && isRetryable) {
        await new Promise((r) => setTimeout(r, 80 * (i + 1)))
        continue
      }
      throw err
    }
  }
}

beforeEach(async () => {
  await truncateWithRetry()
  try {
    await redis.flushdb()
  } catch {
    // Redis may not be available in all test environments — non-fatal
  }
})

afterAll(async () => {
  await closeTestApp()
  await prisma.$disconnect()
  try {
    await redis.quit()
  } catch {
    // ignore
  }
})
