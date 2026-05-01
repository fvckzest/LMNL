import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAdminUser } from '../api/_lib/auth.js';

test('requireAdminUser throws when no bearer token is present', async () => {
  await assert.rejects(
    () => requireAdminUser({ headers: {} }),
    /Admin authentication required/,
  );
});

test('requireAdminUser returns the authenticated user', async () => {
  const user = await requireAdminUser(
    { headers: { authorization: 'Bearer test-token' } },
    {
      supabase: {
        auth: {
          getUser: async (token) => ({
            data: { user: { id: `user-for-${token}` } },
            error: null,
          }),
        },
      },
    },
  );

  assert.equal(user.id, 'user-for-test-token');
});
