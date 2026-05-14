import { createHmac, timingSafeEqual } from 'crypto'
import { config } from '../config'

export function signToken(touchpointId: string): string {
  const payload = `touchpoint:${touchpointId}`
  const sig = createHmac('sha256', config.QR_HMAC_SECRET).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

export function verifyToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const lastColon = decoded.lastIndexOf(':')
    if (lastColon === -1) return null
    const payload = decoded.slice(0, lastColon)
    const sig = decoded.slice(lastColon + 1)
    const expected = createHmac('sha256', config.QR_HMAC_SECRET).update(payload).digest('hex')
    const sigBuf = Buffer.from(sig, 'hex')
    const expectedBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null
    }
    return payload.replace('touchpoint:', '')
  } catch {
    return null
  }
}
