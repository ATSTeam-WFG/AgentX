import { prisma } from '../db'
import { scoreGoldenPoints } from '../lib/scoring'
import { sendPushToUser } from '../lib/push'
import { invalidateLeaderboardCache } from '../lib/leaderboard-cache'

export async function handleGoldenPointsScoring(jobId: string, payload: Record<string, unknown>) {
  const { submissionId, questionText } = payload as { submissionId: string; questionText: string }

  const submission = await prisma.goldenPointsSubmission.findUnique({
    where: { id: submissionId },
  })

  if (!submission) {
    console.warn(`[worker:golden-points] submission ${submissionId} not found — skipping job ${jobId}`)
    await prisma.job.update({ where: { id: jobId }, data: { status: 'done', completedAt: new Date() } })
    return
  }

  if (submission.status !== 'pending') {
    console.warn(`[worker:golden-points] submission ${submissionId} already ${submission.status} — skipping job ${jobId}`)
    await prisma.job.update({ where: { id: jobId }, data: { status: 'done', completedAt: new Date() } })
    return
  }

  const result = await scoreGoldenPoints(submission.text, questionText)

  await prisma.$transaction(async (tx) => {
    await tx.goldenPointsSubmission.update({
      where: { id: submissionId },
      data: {
        aiScore: result.aiScore,
        aiFeedback: result.aiFeedback,
        aiScoredAt: new Date(),
        status: result.status,
        pointsAwarded: result.pointsAwarded,
      },
    })

    await tx.userScore.upsert({
      where: { userId: submission.userId },
      update: {
        totalPoints: { increment: result.pointsAwarded },
        activitiesCompleted: { increment: 1 },
      },
      create: {
        userId: submission.userId,
        totalPoints: result.pointsAwarded,
        activitiesCompleted: 1,
      },
    })

    await tx.job.update({
      where: { id: jobId },
      data: { status: 'done', completedAt: new Date() },
    })
  }, { maxWait: 10000, timeout: 15000 })

  invalidateLeaderboardCache()

  // Delay push by 10 s to cover the race where the user clicks "Notify me" while scoring
  // is already in progress — the browser permission + pushManager.subscribe() + POST back
  // to /v1/push/subscribe takes ~3–7 s, so the subscription may not be in the DB yet when
  // the job transaction commits.  Fire-and-forget — never throws, does not block job completion.
  setTimeout(() => {
    sendPushToUser(submission.userId, {
      title: 'Your Golden Points score is in!',
      body:  `You scored ${result.aiScore}/100 and earned ${result.pointsAwarded} pts. Tap to see your feedback.`,
      url:   '/activities/golden-points',
    })?.catch(() => {})
  }, 10_000)

  console.log(
    `[worker:golden-points] scored ${submissionId}: aiScore=${result.aiScore} → ${result.pointsAwarded}pts (${result.status})`,
  )
}
