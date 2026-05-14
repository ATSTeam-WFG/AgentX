import { afterAll, beforeEach } from 'vitest'
import { prisma } from '../../db'
import { redis } from '../../redis'
import { closeTestApp } from './app'

// Truncate in FK-safe order (children before parents); seed fixtures preserved
const TRUNCATE_TABLES = [
  'TriviaAnswer',
  'TouchpointScan',
  'PromptChallengeAnswer',
  'GoldenPointsSubmission',
  'SponsorImpression',
  'EventFeedback',
  'AppFeedback',
  'Job',
  'ActivityAttempt',
  'Submission',
  'AuditLog',
  'PointAdjustment',
  'UserScore',
  'Session',
  'User',
]

beforeEach(async () => {
  for (const table of TRUNCATE_TABLES) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`)
  }
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
