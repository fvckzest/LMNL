import test from 'node:test';
import assert from 'node:assert/strict';

test('postbuild route list keeps checkout success as a direct-hit entry point', async () => {
  const { routes } = await import('../scripts/postbuild.js');
  const successRoute = routes.find((route) => route.path === 'success');

  assert.ok(successRoute, 'expected /success to be generated as a static entry point');
  assert.equal(successRoute.indexable, false);
});

test('postbuild route list keeps password reset as a direct-hit entry point', async () => {
  const { routes } = await import('../scripts/postbuild.js');
  const resetRoute = routes.find((route) => route.path === 'reset-password');

  assert.ok(resetRoute, 'expected /reset-password to be generated as a static entry point');
  assert.equal(resetRoute.indexable, false);
});

test('postbuild route list keeps the Space event page as a direct-hit entry point', async () => {
  const { routes } = await import('../scripts/postbuild.js');
  const eventRoute = routes.find((route) => route.path === 'events/space');

  assert.ok(eventRoute, 'expected /events/space to be generated as a static entry point');
  assert.equal(eventRoute.indexable, true);
});

test('postbuild route list keeps the shareholder meeting as a direct-hit entry point', async () => {
  const { routes } = await import('../scripts/postbuild.js');
  const eventRoute = routes.find((route) => route.path === 'events/shareholder-meeting');

  assert.ok(eventRoute, 'expected /events/shareholder-meeting to be generated as a static entry point');
  assert.equal(eventRoute.title, 'LMNL | 2026 ANNUAL SHAREHOLDER MEETING');
  assert.equal(eventRoute.image, '/seo/shareholder-meeting.png');
  assert.equal(eventRoute.indexable, true);
});
