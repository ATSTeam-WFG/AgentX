import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { prisma } from '../../db'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => {
  app = await getTestApp()
  // Ensure walk-in registration is open
  await prisma.appConfig.upsert({
    where: { key: 'checkin_open' },
    update: { value: true },
    create: { key: 'checkin_open', label: 'Check-in Open', description: 'Allow walk-in registration', value: true },
  })
  // Ensure all activities are open at start
  await prisma.activity.updateMany({ data: { isOpen: true } })
})
afterAll(async () => { await closeTestApp() })

describe('Admin management journey — login through analytics', () => {
  it('completes the full admin workflow end-to-end', async () => {
    // --- Step 1: Admin login ---
    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/admin/auth/login',
      payload: { email: 'admin@es26.com', password: 'executiveSum@26' },
    })
    expect(loginRes.statusCode).toBe(200)
    const { token: adminToken } = loginRes.json()
    expect(typeof adminToken).toBe('string')

    // --- Step 2: Sign up a walk-in user ---
    const userEmail = `admin-journey-${Date.now()}@e2e.test`
    const signupRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { name: 'Journey Attendee', email: userEmail },
    })
    expect(signupRes.statusCode).toBe(201)
    const { token: userToken, user: newUser } = signupRes.json()
    expect(newUser.pendingAdminApproval).toBe(true)

    // --- Step 3: Admin sees walk-in user in pending list ---
    const pendingRes = await app.inject({
      method: 'GET',
      url: '/v1/admin/users?pendingOnly=true',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(pendingRes.statusCode).toBe(200)
    const { users: pendingUsers } = pendingRes.json()
    const pendingUser = pendingUsers.find((u: { id: string }) => u.id === newUser.id)
    expect(pendingUser).toBeTruthy()

    // --- Step 4: Admin approves the user ---
    const approveRes = await app.inject({
      method: 'POST',
      url: `/v1/admin/users/${newUser.id}/approve`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(approveRes.statusCode).toBe(200)

    const approvedUser = await prisma.user.findUnique({ where: { id: newUser.id } })
    expect(approvedUser?.pendingAdminApproval).toBe(false)

    // --- Step 5: Admin creates an announcement ---
    const announcementRes = await app.inject({
      method: 'POST',
      url: '/v1/admin/announcements',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: 'Journey Test Announcement',
        body: 'This is a test announcement created during the E2E journey.',
      },
    })
    expect(announcementRes.statusCode).toBe(201)
    const announcement = announcementRes.json()
    expect(announcement.title).toBe('Journey Test Announcement')

    // --- Step 6: Public announcement list includes the new announcement ---
    const publicAnnRes = await app.inject({ method: 'GET', url: '/v1/announcements' })
    expect(publicAnnRes.statusCode).toBe(200)
    const { announcements } = publicAnnRes.json()
    expect(announcements.some((a: { title: string }) => a.title === 'Journey Test Announcement')).toBe(true)

    // --- Step 7: Admin toggles trivia activity closed ---
    const triviaActivity = await prisma.activity.findFirstOrThrow({ where: { type: 'trivia' } })
    const toggleRes = await app.inject({
      method: 'POST',
      url: `/v1/admin/activities/${triviaActivity.id}/toggle`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(toggleRes.statusCode).toBe(200)
    const toggled = toggleRes.json()
    expect(toggled.isOpen).toBe(false)

    // --- Step 8: User cannot start trivia while it's closed ---
    const triviaStartRes = await app.inject({
      method: 'POST',
      url: '/v1/activities/trivia/start',
      headers: { authorization: `Bearer ${userToken}` },
    })
    expect(triviaStartRes.statusCode).toBe(400)

    // --- Step 9: Admin re-opens trivia ---
    const reopenRes = await app.inject({
      method: 'POST',
      url: `/v1/admin/activities/${triviaActivity.id}/toggle`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(reopenRes.statusCode).toBe(200)
    expect(reopenRes.json().isOpen).toBe(true)

    // User can start trivia again
    const triviaStartRes2 = await app.inject({
      method: 'POST',
      url: '/v1/activities/trivia/start',
      headers: { authorization: `Bearer ${userToken}` },
    })
    expect(triviaStartRes2.statusCode).toBe(200)

    // --- Step 10: Analytics reflects new user ---
    const analyticsRes = await app.inject({
      method: 'GET',
      url: '/v1/admin/analytics',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(analyticsRes.statusCode).toBe(200)
    const analytics = analyticsRes.json()
    expect(analytics.presence.totalUsers).toBeGreaterThanOrEqual(1)
    expect(typeof analytics.funnel).toBe('object')
    expect(typeof analytics.activities).toBe('object')
  })
})
