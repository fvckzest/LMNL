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
      config: { source: 'table', adminUserIds: [], adminUserEmails: [] },
      supabase: {
        auth: {
          getUser: async (token) => ({
            data: { user: { id: `user-for-${token}` } },
            error: null,
          }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { user_id: 'user-for-test-token' },
                error: null,
              }),
            }),
          }),
        }),
      },
    },
  );

  assert.equal(user.id, 'user-for-test-token');
});

test('requireAdminUser denies authenticated users who are not allowlisted', async () => {
  await assert.rejects(
    () => requireAdminUser(
      { headers: { authorization: 'Bearer test-token' } },
      {
        config: { source: 'table', adminUserIds: [], adminUserEmails: [] },
        supabase: {
          auth: {
            getUser: async () => ({
              data: { user: { id: 'community-user', email: 'member@example.com' } },
              error: null,
            }),
          },
          from: () => ({
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        },
      },
    ),
    /Admin access denied/,
  );
});

test('requireAdminUser can fall back to env allowlist when admin_users is not ready', async () => {
  const user = await requireAdminUser(
    { headers: { authorization: 'Bearer test-token' } },
    {
      config: {
        source: 'auto',
        adminUserIds: [],
        adminUserEmails: ['admin@lmnl.art'],
      },
      supabase: {
        auth: {
          getUser: async () => ({
            data: { user: { id: 'user-1', email: 'admin@lmnl.art' } },
            error: null,
          }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: null,
                error: {
                  code: 'PGRST205',
                  message: 'Could not find the table admin_users in the schema cache',
                },
              }),
            }),
          }),
        }),
      },
    },
  );

  assert.equal(user.email, 'admin@lmnl.art');
});
