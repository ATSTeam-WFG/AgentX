import { prisma } from '../db'
import { handleAvatarGeneration } from './avatar'
import { handleGoldenPointsScoring } from './golden-points'

const POLL_INTERVAL_MS = 5000
const LOCK_DURATION_MS = 60000
const BATCH_SIZE = 5
const WORKER_ID = `worker-${process.pid}`

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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const currentJob = await prisma.job.findUnique({ where: { id }, select: { attempts: true } })
    const failed = (currentJob?.attempts ?? 0) >= 3
    await prisma.job.update({
      where: { id },
      data: {
        status: failed ? 'failed' : 'pending',
        lastError: message,
        lockedBy: null,
        lockedUntil: null,
      },
    })
    console.error(`[worker] job ${id} failed (attempt ${currentJob?.attempts}): ${message}`)
  }
}

async function processNextBatch() {
  const now = new Date()
  const lockUntil = new Date(now.getTime() + LOCK_DURATION_MS)

  const jobs = await prisma.$queryRaw<{ id: string; type: string; payloadJson: unknown }[]>`
    SELECT id, type, "payloadJson"
    FROM "Job"
    WHERE status = 'pending'
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

export function startWorker() {
  console.log(`[worker] started (${WORKER_ID}), polling every ${POLL_INTERVAL_MS}ms, batch size ${BATCH_SIZE}`)
  setInterval(() => {
    processNextBatch().catch((err) => console.error('[worker] poll error:', err))
  }, POLL_INTERVAL_MS)
}
