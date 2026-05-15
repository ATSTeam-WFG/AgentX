import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../db'
import { authenticate } from '../../plugins/auth'
import { badRequest, notFound } from '../../lib/errors'

const AnswerBodySchema = z.object({
  questionId: z.string().min(1),
  selectedIndex: z.number().int().min(0).max(3),
  dedupeKey: z.string().min(1).max(200),
})

export async function promptChallengeRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)

  fastify.get('/questions', async (request: FastifyRequest, reply) => {
    const userId = request.user.sub

    const [questions, userAnswers] = await Promise.all([
      prisma.promptChallengeQuestion.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.promptChallengeAnswer.findMany({ where: { userId } }),
    ])

    const answerMap = new Map(userAnswers.map((a) => [a.questionId, a]))

    const result = questions.map((q) => {
      const userAnswer = answerMap.get(q.id)
      if (userAnswer) {
        return {
          id: q.id,
          category: q.category,
          scenarioText: q.scenarioText,
          optionsJson: q.optionsJson,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          userAnswer: {
            selectedIndex: userAnswer.selectedIndex,
            isCorrect: userAnswer.isCorrect,
            pointsAwarded: userAnswer.pointsAwarded,
          },
        }
      }
      return {
        id: q.id,
        category: q.category,
        scenarioText: q.scenarioText,
        optionsJson: q.optionsJson,
        correctIndex: null,
        explanation: null,
        userAnswer: null,
      }
    })

    const totalPoints = userAnswers.reduce((sum, a) => sum + a.pointsAwarded, 0)
    return reply.send({ questions: result, totalPoints })
  })

  fastify.post('/answer', async (request: FastifyRequest, reply) => {
    const userId = request.user.sub
    const parsed = AnswerBodySchema.safeParse(request.body)
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message)
    const { questionId, selectedIndex, dedupeKey } = parsed.data

    // Dedupe check
    const existingSub = await prisma.submission.findUnique({ where: { clientDedupeKey: dedupeKey } })
    if (existingSub) return reply.send(existingSub.payloadJson)

    // Idempotent: already answered
    const existingAnswer = await prisma.promptChallengeAnswer.findUnique({
      where: { userId_questionId: { userId, questionId } },
    })
    if (existingAnswer) {
      const question = await prisma.promptChallengeQuestion.findUnique({ where: { id: questionId } })
      if (!question) throw notFound('Question not found')
      return reply.send({
        isCorrect: existingAnswer.isCorrect,
        pointsAwarded: existingAnswer.pointsAwarded,
        explanation: question.explanation,
        correctIndex: question.correctIndex,
      })
    }

    const [question, activity, totalQuestionCount] = await Promise.all([
      prisma.promptChallengeQuestion.findUnique({ where: { id: questionId } }),
      prisma.activity.findFirst({ where: { type: 'prompt_challenge' } }),
      prisma.promptChallengeQuestion.count(),
    ])
    if (!question) throw notFound('Question not found')
    if (!activity || !activity.isOpen) throw badRequest('Activity is closed')

    const isCorrect = selectedIndex === question.correctIndex
    const configJson = activity.configJson as { pointsCorrect?: number; pointsWrong?: number } | null
    const pointsCorrect = configJson?.pointsCorrect ?? Math.floor(activity.maxPoints / Math.max(totalQuestionCount, 1))
    const pointsWrong = configJson?.pointsWrong ?? 0
    const pointsAwarded = isCorrect ? pointsCorrect : pointsWrong

    const responsePayload = {
      isCorrect,
      pointsAwarded,
      explanation: question.explanation,
      correctIndex: question.correctIndex,
    }

    await prisma.$transaction(async (tx) => {
      await tx.promptChallengeAnswer.create({
        data: { userId, questionId, selectedIndex, isCorrect, pointsAwarded },
      })
      await tx.submission.create({
        data: {
          userId,
          activityId: activity.id,
          kind: 'prompt_challenge_answer',
          payloadJson: responsePayload,
          clientDedupeKey: dedupeKey,
        },
      })
      if (pointsAwarded > 0) {
        await tx.userScore.upsert({
          where: { userId },
          update: { totalPoints: { increment: pointsAwarded } },
          create: { userId, totalPoints: pointsAwarded, activitiesCompleted: 0 },
        })
      }
      // Check if all questions now answered — increment activitiesCompleted
      const answeredCount = await tx.promptChallengeAnswer.count({ where: { userId } })
      if (answeredCount === totalQuestionCount) {
        await tx.userScore.upsert({
          where: { userId },
          update: { activitiesCompleted: { increment: 1 } },
          create: { userId, totalPoints: 0, activitiesCompleted: 1 },
        })
      }
    }, { maxWait: 10000, timeout: 15000 })

    return reply.send(responsePayload)
  })
}
