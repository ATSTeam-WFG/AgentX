import { describe, it, expect } from 'vitest'
import { signToken, verifyToken } from '../../lib/qr'

describe('signToken / verifyToken', () => {
  it('returns a non-empty string', () => {
    expect(signToken('tp-123')).toBeTruthy()
  })

  it('round-trips a touchpoint ID', () => {
    const id = 'seed-tp-01'
    expect(verifyToken(signToken(id))).toBe(id)
  })

  it('returns null for empty string', () => {
    expect(verifyToken('')).toBeNull()
  })

  it('returns null for non-base64 garbage', () => {
    expect(verifyToken('not-valid-token!!')).toBeNull()
  })

  it('returns null when payload is tampered', () => {
    const token = signToken('tp-original')
    // Flip the last character to corrupt the HMAC
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A')
    expect(verifyToken(tampered)).toBeNull()
  })

  it('returns null for a valid base64 string that lacks the HMAC structure', () => {
    const noColon = Buffer.from('nocolon').toString('base64url')
    expect(verifyToken(noColon)).toBeNull()
  })

  it('different IDs produce different tokens', () => {
    expect(signToken('tp-1')).not.toBe(signToken('tp-2'))
  })
})
