/* Service Worker do PWA — estratégia "network-first" com fallback em cache.
   Garante que o app funcione offline após a primeira visita. */
const CACHE = 'sistema-academia-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  // Não intercepta chamadas à API do Supabase (sempre online)
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req)
        const copy = fresh.clone()
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        return fresh
      } catch {
        const cached = await caches.match(req)
        if (cached) return cached
        const shell = await caches.match('./index.html')
        if (shell) return shell
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
      }
    })()
  )
})