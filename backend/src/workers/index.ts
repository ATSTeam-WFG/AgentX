import { prisma } from '../db'
import { handleAvatarGeneration } from './avatar'
import { handleGoldenPointsScoring } from './golden-points'
import { deleteObject } from '../lib/storage'
import { broadcastUser } from '../ws-connections'
import { makeWsMessage } from '../ws-events'

const POLL_INTERVAL_MS = 5_000
const LOCK_DURATION_MS = 120000
const BATCH_SIZE = 20
const WORKER_ID = `worker-${process.pid}`

const RETRY_BACKOFF_MS = [5_000, 15_000, 40_000, 90_000]
const MAX_ATTEMPTS = 5

function isTransientError(err: unknown): boolean {
  const e = err as { status?: number; code?: string; $response?: { status?: number }; message?: string }
  const msg = e?.message ?? ''
  const status = e?.status ?? e?.$response?.status
  if (msg.includes('is not configured')) return false
  if ([400, 401, 403, 404].includes(status!)) return false
  if ([408, 429, 500, 502, 503, 504].includes(status!)) return true
  if (/Deserialization error|Expected closing tag|no image in response|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up/i.test(msg)) return true
  return false
}

function retryDelayMs(attempts: number): number | null {
  if (attempts >= MAX_ATTEMPTS) return null
  const base = RETRY_BACKOFF_MS[Math.min(attempts - 1, RETRY_BACKOFF_MS.length - 1)]
  const jitter = base * 0.2 * (Math.random() * 2 - 1)
  return Math.round(base + jitter)
}

async function processSingleJob(id: string, type: string, payload: Record<string, unknown>) {
  try {
    if (type === 'avatar_generation') {
      await handleAvatarGeneration(id, payload)
    } else if (type === 'golden_points_scoring') {
      await handleGoldenPointsScoring(id, payload)
    } else {
      console.warn(`[worker] unknown job type: ${type}`)
      await prisma.job.update({ where: { id }, data: { status: 'done', completedAt: new Date() } })
    }
    const userId = payload.userId as string | undefined
    if (userId) {
      broadcastUser(userId, makeWsMessage({ event: 'jobs.done', data: { jobId: id, type, userId } }))
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const currentJob = await prisma.job.findUnique({ where: { id }, select: { attempts: true, status: true } })
    if (currentJob?.status === 'done') {
      console.warn(`[worker] job ${id} already done — skipping error reset`)
      return
    }
    const transient = isTransientError(err)
    const delay = transient ? retryDelayMs(currentJob?.attempts ?? 0) : null
    if (delay !== null) {
      await prisma.job.update({
        where: { id },
        data: { status: 'pending', lastError: message, lockedBy: null, lockedUntil: new Date(Date.now() + delay) },
      })
      console.warn(`[worker] job ${id} transient error (attempt ${currentJob?.attempts}), retrying in ${delay}ms: ${message}`)
    } else {
      await prisma.job.update({
        where: { id },
        data: { status: 'failed', lastError: message, lockedBy: null, lockedUntil: null },
      })
      console.error(`[worker] job ${id} permanently failed (attempt ${currentJob?.attempts}): ${message}`)
      if (type === 'golden_points_scoring') {
        const submissionId = payload.submissionId as string | undefined
        if (submissionId) {
          prisma.goldenPointsSubmission.update({
            where: { id: submissionId },
            data: { status: 'rejected', aiFeedback: 'Scoring temporarily unavailable. Please see a staff member.' },
          }).catch(() => {})
        }
      } else if (type === 'avatar_generation') {
        const selfieKey = payload.selfieKey as string | undefined
        if (selfieKey) deleteObject(selfieKey).catch(() => {})
      }
    }
  }
}

async function processNextBatch() {
  const now = new Date()
  const lockUntil = new Date(now.getTime() + LOCK_DURATION_MS)

  const jobs = await prisma.$queryRaw<{ id: string; type: string; payloadJson: unknown }[]>`
    SELECT id, type, "payloadJson"
    FROM "Job"
    WHERE status IN ('pending','running')
      AND ("lockedUntil" IS NULL OR "lockedUntil" < ${now})
    ORDER BY "createdAt" ASC
    LIMIT ${BATCH_SIZE}
    FOR UPDATE SKIP LOCKED
  `

  if (!jobs.length) return

  await prisma.job.updateMany({
    where: { id: { in: jobs.map((j) => j.id) } },
    data: { status: 'running', lockedBy: WORKER_ID, lockedUntil: lockUntil, attempts: { increment: 1 } },
  })

  await Promise.allSettled(
    jobs.map((job) => processSingleJob(job.id, job.type, job.payloadJson as Record<string, unknown>)),
  )
}

export function startWorker(): () => Promise<void> {
  let isShuttingDown = false
  let currentBatch: Promise<void> | null = null

  console.log(`[worker] started (${WORKER_ID}), polling every ${POLL_INTERVAL_MS}ms, batch size ${BATCH_SIZE}`)
  const interval = setInterval(() => {
    if (isShuttingDown) return
    currentBatch = processNextBatch().catch((err) => console.error('[worker] poll error:', err))
  }, POLL_INTERVAL_MS)

  return async () => {
    isShuttingDown = true
    clearInterval(interval)
    if (currentBatch) await currentBatch
  }
}
