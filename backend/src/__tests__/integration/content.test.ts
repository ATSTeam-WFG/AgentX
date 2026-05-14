import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../helpers/app'
import { createTestUser } from '../helpers/tokens'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let authToken: string

beforeAll(async () => { app = await getTestApp() })
// Re-create user after each beforeEach truncation
beforeEach(async () => {
  const { token } = await createTestUser()
  authToken = token
})
afterAll(async () => { await closeTestApp() })

describe('GET /v1/agenda', () => {
  it('returns seeded agenda events', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/agenda' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.events)).toBe(true)
    expect(body.events.length).toBeGreaterThanOrEqual(3)
  })

  it('returns all events with since=0', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/agenda?since=0' })
    expect(res.statusCode).toBe(200)
    expect(res.json().events.length).toBeGreaterThan(0)
  })

  it('returns no events with since=large version number', async () => {
    // since is a version counter (INT), not epoch ms — seed data has version=1
    const res = await app.inject({ method: 'GET', url: '/v1/agenda?since=9999' })
    expect(res.statusCode).toBe(200)
    expect(res.json().events.length).toBe(0)
  })
})

describe('GET /v1/sponsors', () => {
  it('returns sponsors in tier order: title, gold, silver, partner', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/sponsors' })
    expect(res.statusCode).toBe(200)
    const sponsors = res.json().sponsors
    expect(sponsors.length).toBeGreaterThanOrEqual(4)
    const tiers = sponsors.map((s: { tier: string }) => s.tier)
    const titleIdx = tiers.indexOf('title')
    const goldIdx = tiers.indexOf('gold')
    const silverIdx = tiers.indexOf('silver')
    const partnerIdx = tiers.indexOf('partner')
    expect(titleIdx).toBeLessThan(goldIdx)
    expect(goldIdx).toBeLessThan(silverIdx)
    expect(silverIdx).toBeLessThan(partnerIdx)
  })

  it('POST /v1/sponsors/:id/impression records impression (requires auth + surface)', async () => {
    const listRes = await app.inject({ method: 'GET', url: '/v1/sponsors' })
    const sponsorId = listRes.json().sponsors[0].id
    const res = await app.inject({
      method: 'POST',
      url: `/v1/sponsors/${sponsorId}/impression`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { surface: 'home' },
    })
    expect(res.statusCode).toBe(201)
  })

  it('POST impression returns 404 for unknown sponsor', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/sponsors/nonexistent-id/impression',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { surface: 'home' },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('GET /v1/initiatives', () => {
  it('returns seeded initiatives in displayOrder', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/initiatives' })
    expect(res.statusCode).toBe(200)
    const initiatives = res.json().initiatives
    expect(initiatives.length).toBeGreaterThanOrEqual(2)
    // Verify ascending displayOrder
    for (let i = 1; i < initiatives.length; i++) {
      expect(initiatives[i].displayOrder).toBeGreaterThanOrEqual(initiatives[i - 1].displayOrder)
    }
  })
})

describe('GET /v1/announcements', () => {
  it('returns active seeded announcement', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/announcements' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.announcements)).toBe(true)
    expect(body.announcements.length).toBeGreaterThanOrEqual(1)
  })
})

describe('GET /v1/sync', () => {
  it('returns all collections on full load (no since)', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/sync' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.agenda)).toBe(true)
    expect(Array.isArray(body.announcements)).toBe(true)
    expect(Array.isArray(body.initiatives)).toBe(true)
    expect(Array.isArray(body.sponsors)).toBe(true)
    expect(body.serverTime).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(body.initiatives.length).toBeGreaterThan(0)
    expect(body.sponsors.length).toBeGreaterThan(0)
  })

  it('returns empty initiatives and sponsors when since is provided', async () => {
    const since = Date.now() - 1000 * 60 * 60 // 1 hour ago
    const res = await app.inject({ method: 'GET', url: `/v1/sync?since=${since}` })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.initiatives).toEqual([])
    expect(body.sponsors).toEqual([])
  })
})
