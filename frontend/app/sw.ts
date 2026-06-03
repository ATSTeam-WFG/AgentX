import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, Serwist } from "serwist";

// Cache CDN images (Cloudflare R2) with CacheFirst so they survive offline.
// Next.js proxies remote images through /_next/image?url=<encoded-CDN-url>, so
// we match on the same-origin proxy path rather than the CDN hostname directly.
const r2ImageCache = {
  matcher: ({ url }: { url: URL }) =>
    url.pathname === '/_next/image' &&
    (url.searchParams.get('url') ?? '').includes('r2.dev'),
  handler: new CacheFirst({
    cacheName: 'agentx-cdn-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  }),
};

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const self: any;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [r2ImageCache, ...defaultCache],
});

// ── Offline fallback ─────────────────────────────────────────────────────────
// Must be registered BEFORE serwist.addEventListeners() — SW fetch handlers run
// in registration order and only the first respondWith() call wins per request.

const OFFLINE_PAGE = '/offline.html'

// Cache offline.html during SW install, independent of Serwist's precache.
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open('agentx-offline-v1').then((cache: Cache) => cache.add(OFFLINE_PAGE)),
  )
})

// Intercept navigation (document) fetches only. If the network is unreachable,
// serve the cached offline page. API/asset requests are not intercepted here —
// Serwist's runtime cache handles them.
self.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open('agentx-offline-v1')
      return (await cache.match(OFFLINE_PAGE)) ?? new Response('Offline', { status: 503 })
    }),
  )
})

// ─────────────────────────────────────────────────────────────────────────────

serwist.addEventListeners();

// Push notification: show OS notification when a push arrives
// eslint-disable-next-line @typescript-eslint/no-explicit-any
self.addEventListener('push', (event: any) => {
  let data: { title?: string; body?: string; url?: string } = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { body: event.data?.text() ?? '' }
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'AgentX', {
      body:     data.body ?? '',
      icon:     '/icons/icon-192.png',
      badge:    '/icons/icon-192.png',
      tag:      'gp-score',
      renotify: false,
      data:     { url: data.url ?? '/activities/avatar' },
    }),
  )
})

// Notification click: focus app or open new window at the target URL
// eslint-disable-next-line @typescript-eslint/no-explicit-any
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close()
  const url = (event.notification.data?.url as string) ?? '/activities/golden-points'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients: any[]) => {
        const existing = clients.find((c: any) => c.url.startsWith(self.location.origin))
        if (existing) {
          existing.focus()
          return existing.navigate(url)
        }
        return self.clients.openWindow(url)
      }),
  )
})
