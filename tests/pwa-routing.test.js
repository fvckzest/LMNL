import test from 'node:test';
import assert from 'node:assert/strict';

test('public event navigations bypass the cached app-shell fallback', async () => {
  const { navigationFallbackDenylist } = await import('../vite.config.js');

  const isDenied = (pathname) => navigationFallbackDenylist.some((pattern) => pattern.test(pathname));

  assert.equal(isDenied('/events'), true);
  assert.equal(isDenied('/events/shareholder-meeting'), true);
  assert.equal(isDenied('/events/space'), true);
  assert.equal(isDenied('/about'), false);
});
