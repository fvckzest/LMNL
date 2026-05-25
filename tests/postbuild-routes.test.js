import test from 'node:test';
import assert from 'node:assert/strict';

test('postbuild route list keeps checkout success as a direct-hit entry point', async () => {
  const { routes } = await import('../scripts/postbuild.js');
  const successRoute = routes.find((route) => route.path === 'success');

  assert.ok(successRoute, 'expected /success to be generated as a static entry point');
  assert.equal(successRoute.indexable, false);
});
