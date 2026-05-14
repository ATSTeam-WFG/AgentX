import { prisma } from '../db'
import { handleAvatarGeneration } from './avatar'
import { handleGoldenPointsScoring } from './golden-points'

const POLL_INTERVAL_MS = 5000
const LOCK_DURATION_MS = 60000
const WORKER_ID = `worker-${process.pid}`

async function processNextJob() {
  const now = new Date()
  const lockUntil = new Date(now.getTime() + LOCK_DURATION_MS)

  const job = await prisma.$queryRaw<{ id: string; type: string; payload_json: unknown }[]>`
    SELECT id, type, payload_json
    FROM "Job"
    WHERE status = 'pending'
      AND (locked_until IS NULL OR locked_until < ${now})
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `

  if (!job.length) return

  const { id, type, payload_json } = job[0]

  await prisma.job.update({
    where: { id },
    data: { status: 'running', lockedBy: WORKER_ID, lockedUntil: lockUntil, attempts: { increment: 1 } },
  })

  try {
    const payload = payload_json as Record<string, unknown>
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

export function startWorker() {
  console.log(`[worker] started (${WORKER_ID}), polling every ${POLL_INTERVAL_MS}ms`)
  setInterval(() => {
    processNextJob().catch((err) => console.error('[worker] poll error:', err))
  }, POLL_INTERVAL_MS)
}
