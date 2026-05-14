import { prisma } from '../db'

export async function handleAvatarGeneration(jobId: string, payload: Record<string, unknown>) {
  console.log(`[worker:avatar] processing job ${jobId}`, payload)
  // TODO Phase 3: call AI provider, store result in object storage, update user.avatarUrl
  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'done', completedAt: new Date() },
  })
}
