import { apiFetch } from '../api'

export interface PushSubscribeBody {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export const subscribePush = (body: PushSubscribeBody) =>
  apiFetch<{ ok: boolean }>('/v1/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const unsubscribePush = (endpoint: string) =>
  apiFetch<{ ok: boolean }>('/v1/push/subscribe', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  })
