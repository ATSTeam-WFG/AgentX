import webPush from 'web-push'
import { config } from '../config'
import { prisma } from '../db'

if (config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY && config.VAPID_CONTACT_EMAIL) {
  webPush.setVapidDetails(
    `mailto:${config.VAPID_CONTACT_EMAIL}`,
    config.VAPID_PUBLIC_KEY,
    config.VAPID_PRIVATE_KEY,
  )
} else {
  console.warn('[push] VAPID keys not set — push notifications disabled')
}

export interface PushPayload {
  title: string
  body:  string
  url:   string
}

/**
 * Sends a push notification to all active subscriptions for a user.
 * Fire-and-forget safe — never throws. Deletes stale (410/404) subscriptions.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) return

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 3600 },
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
          console.log(`[push] removed stale subscription ${sub.id} for user ${userId}`)
        } else {
          console.error(`[push] send failed for subscription ${sub.id}:`, err)
        }
      }
    }),
  )
}

/**
 * Sends a push notification to every user with at least one active push subscription.
 * Fire-and-forget safe — never throws.
 */
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  const rows = await prisma.pushSubscription.findMany({
    select: { userId: true },
    distinct: ['userId'],
  })
  await Promise.allSettled(rows.map((r) => sendPushToUser(r.userId, payload)))
}
