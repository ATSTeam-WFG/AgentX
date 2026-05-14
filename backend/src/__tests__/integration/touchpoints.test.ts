import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { createTestUser } from '../helpers/tokens'
import { prisma } from '../../db'
import { signToken } from '../../lib/qr'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => { app = await getTestApp() })
afterAll(async () => { await closeTestApp() })

async function scan(token: string, qrToken: string, dedupeKey: string) {
  return app.inject({
    method: 'POST',
    url: '/v1/touchpoints/scan',
    headers: { authorization: `Bearer ${token}` },
    payload: { qrToken, dedupeKey },
  })
}

describe('POST /v1/touchpoints/scan', () => {
  it('awards points on valid scan and returns touchpoint info', async () => {
    const { token, user } = await createTestUser()
    const qrToken = signToken('seed-tp-01')
    const res = await scan(token, qrToken, 'tp-scan-1')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.pointsAwarded).toBe(25)
    expect(body.touchpoint.name).toBeTruthy()
    expect(body.touchpoint.locationDescription).toBeTruthy()

    const score = await prisma.userScore.findUnique({ where: { userId: user.id } })
    expect(score?.totalPoints).toBe(25)
  })

  it('does NOT increment activitiesCompleted for touchpoint scans', async () => {
    const { token, user } = await createTestUser()
    await scan(token, signToken('seed-tp-01'), 'tp-noact-1')
    const score = await prisma.userScore.findUnique({ where: { userId: user.id } })
    expect(score?.activitiesCompleted).toBe(0)
  })

  it('dedupe: same dedupeKey returns identical response without new TouchpointScan row', async () => {
    const { token } = await createTestUser()
    const qrToken = signToken('seed-tp-02')
    const first = await scan(token, qrToken, 'tp-dedup-1')
    const scanCountBefore = await prisma.touchpointScan.count()

    const second = await scan(token, qrToken, 'tp-dedup-1')
    const scanCountAfter = await prisma.touchpointScan.count()

    expect(second.statusCode).toBe(200)
    expect(second.json()).toEqual(first.json())
    expect(scanCountAfter).toBe(scanCountBefore)
  })

  it('one-shot: second scan of same touchpoint (different dedupeKey) returns 409', async () => {
    const { token } = await createTestUser()
    await scan(token, signToken('seed-tp-03'), 'tp-shot-1')
    const second = await scan(token, signToken('seed-tp-03'), 'tp-shot-2')
    expect(second.statusCode).toBe(409)
    expect(second.json().error).toBe('CONFLICT')
  })

  it('different users can scan the same touchpoint', async () => {
    const { token: tokenA } = await createTestUser()
    const { token: tokenB } = await createTestUser()
    const resA = await scan(tokenA, signToken('seed-tp-04'), 'tp-multi-A')
    const resB = await scan(tokenB, signToken('seed-tp-04'), 'tp-multi-B')
    expect(resA.statusCode).toBe(200)
    expect(resB.statusCode).toBe(200)
  })

  it('returns 400 for invalid QR token', async () => {
    const { token } = await createTestUser()
    const res = await scan(token, 'bad-token-value', 'tp-bad-1')
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('BAD_REQUEST')
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/touchpoints/scan',
      payload: { qrToken: 'x', dedupeKey: 'y' },
    })
    expect(res.statusCode).toBe(401)
  })
})
