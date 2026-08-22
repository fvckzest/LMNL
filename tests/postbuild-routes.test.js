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

test('postbuild leaves public event slugs to the dynamic SEO route', async () => {
  const { routes } = await import('../scripts/postbuild.js');
  const eventRoutes = routes.filter((route) => route.path.startsWith('events/'));

  assert.deepEqual(eventRoutes, []);
});

test('vercel routes every public event slug through dynamic SEO HTML', async () => {
  const { readFile } = await import('node:fs/promises');
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

  assert.deepEqual(config.rewrites[0], {
    source: '/events/:slug',
    destination: '/api/event-page?slug=:slug',
  });
});
