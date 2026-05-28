import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { createTestUser, signAdminToken } from '../helpers/tokens'
import { prisma } from '../../db'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await closeTestApp() })

describe('GET /v1/leaderboard', () => {
  it('returns leaderboard with currentUser=null when unauthenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/leaderboard' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.leaderboard)).toBe(true)
    expect(body.currentUser).toBeNull()
  })

  it('populates currentUser when authenticated', async () => {
    const { token } = await createTestUser()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/leaderboard',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.currentUser).not.toBeNull()
    expect(typeof body.currentUser.rank).toBe('number')
    expect(typeof body.currentUser.totalPoints).toBe('number')
  })

  it('currentUser is null when admin token is used', async () => {
    const adminLoginRes = await app.inject({
      method: 'POST',
      url: '/v1/admin/auth/login',
      payload: { email: 'admin@es26.com', password: 'executiveSum@26' },
    })
    const adminToken = adminLoginRes.json().token
    const res = await app.inject({
      method: 'GET',
      url: '/v1/leaderboard',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().currentUser).toBeNull()
  })

  it('respects ?limit param', async () => {
    // Create 3 users with different scores
    const users = await Promise.all([
      createTestUser(),
      createTestUser(),
      createTestUser(),
    ])
    for (let i = 0; i < users.length; i++) {
      await prisma.userScore.update({
        where: { userId: users[i].user.id },
        data: { totalPoints: (i + 1) * 10 },
      })
    }

    const res = await app.inject({ method: 'GET', url: '/v1/leaderboard?limit=2' })
    expect(res.statusCode).toBe(200)
    expect(res.json().leaderboard).toHaveLength(2)
  })

  it('leaderboard entries do NOT include userId or email', async () => {
    const { user } = await createTestUser()
    await prisma.userScore.update({ where: { userId: user.id }, data: { totalPoints: 100 } })
    const res = await app.inject({ method: 'GET', url: '/v1/leaderboard' })
    const top = res.json().leaderboard[0]
    expect(top).not.toHaveProperty('userId')
    expect(top).not.toHaveProperty('email')
    expect(top).toHaveProperty('name')
    expect(top).toHaveProperty('totalPoints')
    expect(top).toHaveProperty('rank')
  })

  it('rank ordering: higher points ranked first', async () => {
    const { user: u1 } = await createTestUser()
    const { user: u2 } = await createTestUser()
    await prisma.userScore.update({ where: { userId: u1.id }, data: { totalPoints: 100 } })
    await prisma.userScore.update({ where: { userId: u2.id }, data: { totalPoints: 50 } })

    const { token } = await createTestUser()
    await prisma.userScore.update({ where: { userId: (await createTestUser()).user.id }, data: { totalPoints: 200 } })

    const res = await app.inject({ method: 'GET', url: '/v1/leaderboard?limit=5' })
    const board = res.json().leaderboard
    for (let i = 1; i < board.length; i++) {
      expect(board[i].totalPoints).toBeLessThanOrEqual(board[i - 1].totalPoints)
    }
  })
})
