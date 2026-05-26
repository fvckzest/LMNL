import test from 'node:test';
import assert from 'node:assert/strict';
import { countApprovedRequestsByEventName, updateRequestArchiveState } from '../api/_lib/repositories/requests.js';

test('countApprovedRequestsByEventName returns the approved count for an event', async () => {
  const seenFilters = [];
  const count = await countApprovedRequestsByEventName('SPACE', {
    supabase: {
      from: (table) => {
        assert.equal(table, 'requests');

        return {
          select: (_columns, options) => {
            assert.deepEqual(options, { count: 'exact', head: true });

            return {
              eq: (column, value) => {
                seenFilters.push([column, value]);

                if (seenFilters.length === 1) {
                  return {
                    eq: async (nextColumn, nextValue) => {
                      seenFilters.push([nextColumn, nextValue]);
                      return { count: 7, error: null };
                    },
                  };
                }

                throw new Error('Unexpected extra filter call');
              },
            };
          },
        };
      },
    },
  });

  assert.equal(count, 7);
  assert.deepEqual(seenFilters, [
    ['event_name', 'SPACE'],
    ['status', 'approved'],
  ]);
});

test('updateRequestArchiveState persists archive flags without changing request status', async () => {
  const updates = [];

  const archived = await updateRequestArchiveState('req_1', true, {
    supabase: {
      from: (table) => {
        assert.equal(table, 'requests');
        return {
          update: (payload) => {
            updates.push(payload);
            return {
              eq: (_column, value) => {
                assert.equal(value, 'req_1');
                return {
                  select: () => ({
                    single: async () => ({
                      data: { id: 'req_1', ...payload, status: 'approved' },
                      error: null,
                    }),
                  }),
                };
              },
            };
          },
        };
      },
    },
  });

  assert.equal(archived.id, 'req_1');
  assert.equal(archived.is_archived, true);
  assert.equal(archived.status, 'approved');
  assert.match(archived.archived_at, /\d{4}-\d{2}-\d{2}T/);

  const unarchived = await updateRequestArchiveState('req_1', false, {
    supabase: {
      from: () => ({
        update: (payload) => {
          updates.push(payload);
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: { id: 'req_1', ...payload, status: 'approved' },
                  error: null,
                }),
              }),
            }),
          };
        },
      }),
    },
  });

  assert.equal(unarchived.is_archived, false);
  assert.equal(unarchived.archived_at, null);
  assert.deepEqual(updates[1], {
    is_archived: false,
    archived_at: null,
  });
});
