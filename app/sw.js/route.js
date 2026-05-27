const RETIRE_SERVICE_WORKER_SCRIPT = `
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if ('caches' in self) {
      const cacheNames = await self.caches.keys();
      await Promise.all(cacheNames
        .filter((cacheName) => cacheName.startsWith('workbox-'))
        .map((cacheName) => self.caches.delete(cacheName)));
    }

    if (self.registration?.unregister) {
      await self.registration.unregister();
    }

    if (self.clients?.claim) {
      await self.clients.claim();
    }
  })());
});
`;

export function GET() {
  return new Response(RETIRE_SERVICE_WORKER_SCRIPT.trimStart(), {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  });
}
