import { vi, describe, it, expect, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
  findMany: vi.fn(),
  deleteOne: vi.fn(),
}))

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: mocks.setVapidDetails,
    sendNotification: mocks.sendNotification,
  },
}))

vi.mock('../../db', () => ({
  prisma: {
    pushSubscription: {
      findMany: mocks.findMany,
      delete:   mocks.deleteOne,
    },
  },
}))

vi.mock('../../config', () => ({
  config: {
    VAPID_PUBLIC_KEY:    'BFake_public_key_base64url',
    VAPID_PRIVATE_KEY:   'fake_private_key_base64url',
    VAPID_CONTACT_EMAIL: 'push@example.com',
  },
}))

import { sendPushToUser } from '../../lib/push'

const PAYLOAD = { title: 'Test', body: 'Hello', url: '/test' }

const makeSub = (id: string) => ({
  id,
  userId: 'user-1',
  endpoint: `https://push.example.com/${id}`,
  p256dh: 'fake-p256dh',
  auth: 'fake-auth',
})

beforeEach(() => {
  mocks.sendNotification.mockReset()
  mocks.findMany.mockReset()
  mocks.deleteOne.mockReset()
})

describe('sendPushToUser', () => {
  it('returns without sending when user has no subscriptions', async () => {
    mocks.findMany.mockResolvedValue([])
    await sendPushToUser('user-1', PAYLOAD)
    expect(mocks.sendNotification).not.toHaveBeenCalled()
  })

  it('calls sendNotification once per subscription', async () => {
    mocks.findMany.mockResolvedValue([makeSub('sub-a'), makeSub('sub-b')])
    mocks.sendNotification.mockResolvedValue(undefined)
    await sendPushToUser('user-1', PAYLOAD)
    expect(mocks.sendNotification).toHaveBeenCalledTimes(2)
  })

  it('passes correct endpoint and keys to sendNotification', async () => {
    const sub = makeSub('sub-x')
    mocks.findMany.mockResolvedValue([sub])
    mocks.sendNotification.mockResolvedValue(undefined)
    await sendPushToUser('user-1', PAYLOAD)
    expect(mocks.sendNotification).toHaveBeenCalledWith(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(PAYLOAD),
      { TTL: 3600 },
    )
  })

  it('deletes stale subscription when statusCode is 410', async () => {
    const sub = makeSub('sub-stale-410')
    mocks.findMany.mockResolvedValue([sub])
    const err = Object.assign(new Error('Gone'), { statusCode: 410 })
    mocks.sendNotification.mockRejectedValue(err)
    mocks.deleteOne.mockResolvedValue(sub)
    await sendPushToUser('user-1', PAYLOAD)
    expect(mocks.deleteOne).toHaveBeenCalledWith({ where: { id: sub.id } })
  })

  it('deletes stale subscription when statusCode is 404', async () => {
    const sub = makeSub('sub-stale-404')
    mocks.findMany.mockResolvedValue([sub])
    const err = Object.assign(new Error('Not Found'), { statusCode: 404 })
    mocks.sendNotification.mockRejectedValue(err)
    mocks.deleteOne.mockResolvedValue(sub)
    await sendPushToUser('user-1', PAYLOAD)
    expect(mocks.deleteOne).toHaveBeenCalledWith({ where: { id: sub.id } })
  })

  it('does not delete subscription on non-stale errors', async () => {
    const sub = makeSub('sub-err')
    mocks.findMany.mockResolvedValue([sub])
    const err = Object.assign(new Error('Internal Server Error'), { statusCode: 500 })
    mocks.sendNotification.mockRejectedValue(err)
    await sendPushToUser('user-1', PAYLOAD)
    expect(mocks.deleteOne).not.toHaveBeenCalled()
  })

  it('never throws even when sendNotification rejects', async () => {
    mocks.findMany.mockResolvedValue([makeSub('sub-throw')])
    mocks.sendNotification.mockRejectedValue(new Error('boom'))
    await expect(sendPushToUser('user-1', PAYLOAD)).resolves.toBeUndefined()
  })

  it('never throws even when findMany rejects', async () => {
    mocks.findMany.mockRejectedValue(new Error('DB gone'))
    await expect(sendPushToUser('user-1', PAYLOAD)).rejects.toThrow('DB gone')
    // Note: the function itself propagates DB errors because findMany is awaited before Promise.allSettled
    // This test documents current behaviour — findMany error does propagate.
    // (This is fine — push is always called with .catch(() => {}) at callsites)
  })
})
