import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db'
import { authenticate } from '../../plugins/auth'
import { badRequest, conflict, notFound, forbidden } from '../../lib/errors'

const CompleteBodySchema = z.object({
  attemptId: z.string().uuid(),
  answers: z
    .array(z.object({ questionId: z.string().min(1), selectedIndex: z.number().int().min(0).max(3) }))
    .min(1),
  dedupeKey: z.string().min(1).max(200),
})

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function triviaRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)

  fastify.post('/start', async (request: FastifyRequest, reply) => {
    const userId = request.user.sub

    const activity = await prisma.activity.findFirst({ where: { type: 'trivia' } })
    if (!activity || !activity.isOpen) throw badRequest('Activity is closed')

    const existing = await prisma.activityAttempt.findUnique({
      where: { userId_activityId: { userId, activityId: activity.id } },
    })

    if (existing) {
      if (existing.completedAt !== null) throw conflict('Already completed trivia')
      // Resume: return same questions
      const payload = existing.payloadJson as { questionIds: string[] }
      const questions = await prisma.triviaQuestion.findMany({
        where: { id: { in: payload.questionIds } },
      })
      // Restore original order
      const ordered = payload.questionIds
        .map((id) => questions.find((q) => q.id === id))
        .filter(Boolean) as typeof questions
      return reply.send({
        attemptId: existing.id,
        questions: ordered.map(({ id, questionText, optionsJson, category, difficulty }) => ({
          id, questionText, optionsJson, category, difficulty,
        })),
      })
    }

    const allQuestions = await prisma.triviaQuestion.findMany({ where: { isActive: true } })
    const selected = shuffle(allQuestions).slice(0, Math.min(50, allQuestions.length))
    const questionIds = selected.map((q) => q.id)

    const attempt = await prisma.activityAttempt.create({
      data: { userId, activityId: activity.id, payloadJson: { questionIds } },
    })

    return reply.send({
      attemptId: attempt.id,
      questions: selected.map(({ id, questionText, optionsJson, category, difficulty }) => ({
        id, questionText, optionsJson, category, difficulty,
      })),
    })
  })

  fastify.post('/complete', async (request: FastifyRequest, reply) => {
    const userId = request.user.sub
    const parsed = CompleteBodySchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)
    const { attemptId, answers, dedupeKey } = parsed.data

    // Dedupe check
    const existingSub = await prisma.submission.findUnique({ where: { clientDedupeKey: dedupeKey } })
    if (existingSub) return reply.send(existingSub.payloadJson)

    const [attempt, activity] = await Promise.all([
      prisma.activityAttempt.findUnique({ where: { id: attemptId } }),
      prisma.activity.findFirst({ where: { type: 'trivia' } }),
    ])
    if (!attempt) throw notFound('Attempt not found')
    if (attempt.userId !== userId) throw forbidden('Not your attempt')
    if (!activity) throw badRequest('Trivia activity not configured')

    // Idempotent: already completed
    if (attempt.completedAt !== null) {
      const prevAnswers = await prisma.triviaAnswer.findMany({ where: { attemptId } })
      return reply.send({
        pointsAwarded: attempt.pointsAwarded,
        correctCount: prevAnswers.filter((a) => a.isCorrect).length,
        totalQuestions: prevAnswers.length,
        answers: prevAnswers.map((a) => ({ questionId: a.questionId, isCorrect: a.isCorrect })),
      })
    }

    // Authorize answers against stored question IDs
    const authorizedIds = new Set((attempt.payloadJson as { questionIds: string[] }).questionIds)
    const authorizedAnswers = answers.filter((a) => authorizedIds.has(a.questionId))
    if (authorizedAnswers.length === 0) throw badRequest('No valid answers for this attempt')

    const questions = await prisma.triviaQuestion.findMany({
      where: { id: { in: authorizedAnswers.map((a) => a.questionId) } },
    })
    const questionMap = new Map(questions.map((q) => [q.id, q]))

    const scored = authorizedAnswers
      .filter((a) => questionMap.has(a.questionId))
      .map((a) => ({
        questionId: a.questionId,
        selectedIndex: a.selectedIndex,
        isCorrect: a.selectedIndex === questionMap.get(a.questionId)!.correctIndex,
      }))

    const correctCount = scored.filter((a) => a.isCorrect).length
    const pointsAwarded = Math.round((correctCount / scored.length) * activity.maxPoints)

    const responsePayload = {
      pointsAwarded,
      correctCount,
      totalQuestions: scored.length,
      answers: scored.map(({ questionId, isCorrect }) => ({ questionId, isCorrect })),
    }

    await prisma.$transaction(async (tx) => {
      await tx.triviaAnswer.createMany({
        data: scored.map((a) => ({
          attemptId,
          questionId: a.questionId,
          userId,
          selectedIndex: a.selectedIndex,
          isCorrect: a.isCorrect,
        })),
      })
      await tx.activityAttempt.update({
        where: { id: attemptId },
        data: { completedAt: new Date(), pointsAwarded },
      })
      await tx.submission.create({
        data: {
          userId,
          activityId: activity.id,
          kind: 'trivia_complete',
          payloadJson: responsePayload,
          clientDedupeKey: dedupeKey,
        },
      })
      await tx.userScore.upsert({
        where: { userId },
        update: { totalPoints: { increment: pointsAwarded }, activitiesCompleted: { increment: 1 } },
        create: { userId, totalPoints: pointsAwarded, activitiesCompleted: 1 },
      })
    }, { maxWait: 10000, timeout: 15000 })

    return reply.send(responsePayload)
  })
}
