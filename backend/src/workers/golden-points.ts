import { prisma } from '../db'

export async function handleGoldenPointsScoring(jobId: string, payload: Record<string, unknown>) {
  console.log(`[worker:golden-points] processing job ${jobId}`, payload)
  // TODO Phase 3: call LLM, map score to points, update GoldenPointsSubmission
  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'done', completedAt: new Date() },
  })
}
