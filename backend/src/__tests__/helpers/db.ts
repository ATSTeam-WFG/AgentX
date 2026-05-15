import { afterAll, beforeEach } from 'vitest'
import { prisma } from '../../db'
import { redis } from '../../redis'
import { closeTestApp } from './app'

// Single atomic TRUNCATE with CASCADE — avoids FK violations from pgbouncer
// running individual DELETEs on separate connections. Seed fixtures (Activity,
// TriviaQuestion, Touchpoint, etc.) are intentionally omitted.
const USER_DATA_TABLES = [
  'TriviaAnswer', 'TouchpointScan', 'PromptChallengeAnswer',
  'GoldenPointsSubmission', 'SponsorImpression', 'EventFeedback', 'AppFeedback',
  'Job', 'ActivityAttempt', 'Submission', 'AuditLog', 'PointAdjustment',
  'UserScore', 'Session', 'User',
].map((t) => `"${t}"`).join(', ')

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${USER_DATA_TABLES} CASCADE`)
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
