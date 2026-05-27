import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/sw.js/route.js';

test('Next serves a retiring service worker at /sw.js for old PWA cutover', async () => {
  const response = await GET();
  const script = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/javascript; charset=utf-8');
  assert.equal(response.headers.get('cache-control'), 'no-store, no-cache, must-revalidate');
  assert.equal(response.headers.get('service-worker-allowed'), '/');
  assert.match(script, /self\.addEventListener\('install'/);
  assert.match(script, /self\.skipWaiting\(\)/);
  assert.match(script, /cacheName\.startsWith\('workbox-'\)/);
  assert.match(script, /self\.registration\?\.unregister/);
  assert.doesNotMatch(script, /precacheAndRoute/);
});
