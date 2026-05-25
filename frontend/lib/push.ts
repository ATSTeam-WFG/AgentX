import { subscribePush } from './api/push'

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)))
}

export type PushState = 'unsupported' | 'default' | 'granted' | 'denied'

/** Returns current push permission state, or 'unsupported' if the browser lacks PushManager. */
export function getPushState(): PushState {
  if (typeof window === 'undefined') return 'unsupported'
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
  return Notification.permission as PushState
}

/**
 * Requests push permission, creates a subscription, and saves it to the backend.
 * Safe to call multiple times — re-uses an existing subscription if one already exists.
 */
export async function requestAndSubscribe(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (getPushState() === 'unsupported') return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) {
    console.warn('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set')
    return 'unsupported'
  }

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
  }

  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    console.error('[push] Incomplete subscription object from browser')
    return 'unsupported'
  }

  await subscribePush({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  })

  return 'granted'
}
