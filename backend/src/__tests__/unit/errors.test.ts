import { describe, it, expect } from 'vitest'
import { AppError, notFound, forbidden, conflict, badRequest, unauthorized } from '../../lib/errors'

describe('AppError factories', () => {
  it('notFound produces 404 NOT_FOUND', () => {
    const e = notFound()
    expect(e).toBeInstanceOf(AppError)
    expect(e.statusCode).toBe(404)
    expect(e.code).toBe('NOT_FOUND')
  })

  it('notFound accepts a custom message', () => {
    expect(notFound('custom').message).toBe('custom')
  })

  it('conflict produces 409 CONFLICT', () => {
    const e = conflict()
    expect(e.statusCode).toBe(409)
    expect(e.code).toBe('CONFLICT')
  })

  it('badRequest produces 400 BAD_REQUEST', () => {
    const e = badRequest('bad input')
    expect(e.statusCode).toBe(400)
    expect(e.code).toBe('BAD_REQUEST')
    expect(e.message).toBe('bad input')
  })

  it('forbidden produces 403 FORBIDDEN', () => {
    const e = forbidden()
    expect(e.statusCode).toBe(403)
    expect(e.code).toBe('FORBIDDEN')
  })

  it('unauthorized produces 401 UNAUTHORIZED', () => {
    const e = unauthorized()
    expect(e.statusCode).toBe(401)
    expect(e.code).toBe('UNAUTHORIZED')
  })

  it('AppError is an instance of Error', () => {
    expect(notFound()).toBeInstanceOf(Error)
  })
})
