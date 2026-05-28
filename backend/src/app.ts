import Fastify, { type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import websocket from '@fastify/websocket'

import { config } from './config'
import { AppError } from './lib/errors'
import { authenticateAdmin } from './plugins/auth'

import { authRoutes } from './routes/auth'
import { profileRoutes } from './routes/profile'
import { agendaRoutes } from './routes/agenda'
import { initiativesRoutes } from './routes/initiatives'
import { sponsorsRoutes } from './routes/sponsors'
import { announcementsRoutes } from './routes/announcements'
import { leaderboardRoutes } from './routes/leaderboard'
import { feedbackRoutes } from './routes/feedback'
import { syncRoutes } from './routes/sync'
import { jobsRoutes } from './routes/jobs'
import { wsRoutes } from './routes/ws'
import { activitiesRoutes } from './routes/activities/index'
import { triviaRoutes } from './routes/activities/trivia'
import { promptChallengeRoutes } from './routes/activities/prompt-challenge'
import { goldenPointsRoutes } from './routes/activities/golden-points'
import { avatarRoutes } from './routes/activities/avatar'
import { touchpointsRoutes } from './routes/activities/touchpoints'
import { pushRoutes } from './routes/push'
import { adminAuthRoutes } from './routes/admin/auth'
import { adminUsersRoutes } from './routes/admin/users'
import { adminInviteesRoutes } from './routes/admin/invitees'
import { adminGoldenPointsRoutes } from './routes/admin/golden-points'
import { adminAgendaRoutes } from './routes/admin/agenda'
import { adminInitiativesRoutes } from './routes/admin/initiatives'
import { adminSponsorsRoutes } from './routes/admin/sponsors'
import { adminActivitiesRoutes } from './routes/admin/activities'
import { adminAnnouncementsRoutes } from './routes/admin/announcements'
import { adminAuditLogRoutes } from './routes/admin/audit-log'
import { adminDashboardRoutes } from './routes/admin/dashboard'
import { adminSystemRoutes } from './routes/admin/system'
import { adminFeaturesRoutes } from './routes/admin/features'
import { adminAnalyticsRoutes } from './routes/admin/analytics'
import { featuresRoutes } from './routes/features'

export async function buildApp() {
  const app = Fastify({ logger: config.NODE_ENV !== 'test' })

  const corsOrigins = config.CORS_ORIGIN === '*'
    ? '*'
    : config.CORS_ORIGIN.split(',').map(o => o.trim())

  await app.register(cors, {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    strictPreflight: false,
  })

  await app.register(jwt, { secret: config.JWT_SECRET })

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    hook: 'preHandler',
    allowList(request: FastifyRequest) {
      const secret = config.STRESS_BYPASS_SECRET
      return secret !== '' && request.headers['x-stress-bypass'] === secret
    },
    keyGenerator(request: FastifyRequest) {
      const auth = request.headers.authorization
      if (auth?.startsWith('Bearer ')) {
        const parts = auth.slice(7).split('.')
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(
              Buffer.from(parts[1], 'base64url').toString('utf8')
            )
            if (typeof payload.sub === 'string') return `user:${payload.sub}`
          } catch {
            // fall through to IP
          }
        }
      }
      return request.ip
    },
  })

  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  })

  await app.register(websocket)

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.code, message: error.message })
    }
    // Prisma unique constraint violation
    if ((error as { code?: string }).code === 'P2002') {
      return reply.status(409).send({ error: 'CONFLICT', message: 'Resource already exists' })
    }
    // Fastify validation error
    if (error.statusCode === 400) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: error.message })
    }
    app.log.error(error)
    return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Internal server error' })
  })

  // Health check (no auth, used by Railway)
  app.get('/health', async () => ({ status: 'ok', ts: Date.now() }))

  // Public routes
  app.register(authRoutes, { prefix: '/v1/auth' })
  app.register(featuresRoutes, { prefix: '/v1' })
  app.register(agendaRoutes, { prefix: '/v1' })
  app.register(initiativesRoutes, { prefix: '/v1' })
  app.register(announcementsRoutes, { prefix: '/v1' })
  app.register(leaderboardRoutes, { prefix: '/v1' })
  app.register(syncRoutes, { prefix: '/v1' })

  // Mixed auth (some routes require token, see route files)
  app.register(sponsorsRoutes, { prefix: '/v1' })

  // Authenticated user routes
  app.register(profileRoutes, { prefix: '/v1' })
  app.register(feedbackRoutes, { prefix: '/v1' })
  app.register(jobsRoutes, { prefix: '/v1' })
  app.register(wsRoutes, { prefix: '/v1' })
  app.register(activitiesRoutes, { prefix: '/v1' })
  app.register(triviaRoutes, { prefix: '/v1/activities/trivia' })
  app.register(promptChallengeRoutes, { prefix: '/v1/activities/prompt-challenge' })
  app.register(goldenPointsRoutes, { prefix: '/v1/activities/golden-points' })
  app.register(avatarRoutes, { prefix: '/v1/activities/avatar' })
  app.register(touchpointsRoutes, { prefix: '/v1/touchpoints' })
  app.register(pushRoutes, { prefix: '/v1/push' })

  // Admin auth (no preHandler — login is public)
  app.register(adminAuthRoutes, { prefix: '/v1/admin/auth' })

  // All other admin routes require admin JWT
  app.register(
    async (adminApp) => {
      adminApp.addHook('preHandler', authenticateAdmin)
      adminApp.register(adminUsersRoutes, { prefix: '/users' })
      adminApp.register(adminInviteesRoutes, { prefix: '/invitees' })
      adminApp.register(adminGoldenPointsRoutes, { prefix: '/golden-points' })
      adminApp.register(adminAgendaRoutes, { prefix: '/agenda' })
      adminApp.register(adminInitiativesRoutes, { prefix: '/initiatives' })
      adminApp.register(adminSponsorsRoutes, { prefix: '/sponsors' })
      adminApp.register(adminActivitiesRoutes, { prefix: '/activities' })
      adminApp.register(adminAnnouncementsRoutes, { prefix: '/announcements' })
      adminApp.register(adminAuditLogRoutes, { prefix: '/audit-log' })
      adminApp.register(adminDashboardRoutes,  { prefix: '/dashboard'  })
      adminApp.register(adminSystemRoutes,    { prefix: '/system'     })
      adminApp.register(adminFeaturesRoutes,  { prefix: ''            })
      adminApp.register(adminAnalyticsRoutes, { prefix: '/analytics'  })
    },
    { prefix: '/v1/admin' },
  )

  return app
}
