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

test('updateRequestArchiveState falls back to legacy archived status when archive columns are unavailable', async () => {
  const operations = [];

  const archived = await updateRequestArchiveState('req_legacy', true, {
    supabase: {
      from: (table) => {
        assert.equal(table, 'requests');
        return {
          update: (payload) => {
            operations.push({ type: 'update', payload });

            if (payload.is_archived === true) {
              return {
                eq: () => ({
                  select: () => ({
                    single: async () => ({
                      data: null,
                      error: { code: '42703', message: 'column "is_archived" does not exist' },
                    }),
                  }),
                }),
              };
            }

            assert.deepEqual(payload, { status: 'archived' });
            return {
              eq: () => ({
                select: () => ({
                  single: async () => ({
                    data: { id: 'req_legacy', status: 'archived', square_order_id: 'sq_1' },
                    error: null,
                  }),
                }),
              }),
            };
          },
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'req_legacy', status: 'approved', square_order_id: 'sq_1' },
                error: null,
              }),
            }),
          }),
        };
      },
    },
  });

  assert.equal(archived.status, 'archived');
  assert.equal(operations.length, 2);
  assert.equal(operations[0].type, 'update');
  assert.equal(operations[0].payload.is_archived, true);
  assert.match(operations[0].payload.archived_at, /\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(operations[1], {
    type: 'update',
    payload: { status: 'archived' },
  });
});

test('updateRequestArchiveState restores a best-effort legacy status when unarchiving without archive columns', async () => {
  const updates = [];

  const unarchived = await updateRequestArchiveState('req_legacy', false, {
    supabase: {
      from: (table) => {
        if (table === 'tickets') {
          return {
            select: (columns) => {
              assert.equal(columns, 'id');
              return {
                eq: (column, value) => {
                  assert.equal(column, 'square_order_id');
                  assert.equal(value, 'sq_1');
                  return {
                    maybeSingle: async () => ({ data: null, error: null }),
                  };
                },
              };
            },
          };
        }

        return {
          update: (payload) => {
            updates.push(payload);

            if (Object.prototype.hasOwnProperty.call(payload, 'is_archived')) {
              return {
                eq: () => ({
                  select: () => ({
                    single: async () => ({
                      data: null,
                      error: { code: '42703', message: 'column "archived_at" does not exist' },
                    }),
                  }),
                }),
              };
            }

            assert.deepEqual(payload, { status: 'approved' });
            return {
              eq: () => ({
                select: () => ({
                  single: async () => ({
                    data: { id: 'req_legacy', status: 'approved', square_order_id: 'sq_1' },
                    error: null,
                  }),
                }),
              }),
            };
          },
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'req_legacy', status: 'archived', square_order_id: 'sq_1' },
                error: null,
              }),
            }),
          }),
        };
      },
    },
  });

  assert.equal(unarchived.status, 'approved');
  assert.deepEqual(updates[0], {
    is_archived: false,
    archived_at: null,
  });
  assert.deepEqual(updates[1], { status: 'approved' });
});

test('updateRequestArchiveState restores legacy fulfilled status when an issued ticket exists', async () => {
  const updates = [];

  const unarchived = await updateRequestArchiveState('req_fulfilled', false, {
    supabase: {
      from: (table) => {
        if (table === 'tickets') {
          return {
            select: (columns) => {
              assert.equal(columns, 'id');
              return {
                eq: (column, value) => {
                  assert.equal(column, 'square_order_id');
                  assert.equal(value, 'sq_done');
                  return {
                    maybeSingle: async () => ({ data: { id: 'ticket_1' }, error: null }),
                  };
                },
              };
            },
          };
        }

        return {
          update: (payload) => {
            updates.push(payload);

            if (Object.prototype.hasOwnProperty.call(payload, 'is_archived')) {
              return {
                eq: () => ({
                  select: () => ({
                    single: async () => ({
                      data: null,
                      error: { code: '42703', message: 'column "archived_at" does not exist' },
                    }),
                  }),
                }),
              };
            }

            assert.deepEqual(payload, { status: 'fulfilled' });
            return {
              eq: () => ({
                select: () => ({
                  single: async () => ({
                    data: { id: 'req_fulfilled', status: 'fulfilled', square_order_id: 'sq_done' },
                    error: null,
                  }),
                }),
              }),
            };
          },
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'req_fulfilled', status: 'archived', square_order_id: 'sq_done' },
                error: null,
              }),
            }),
          }),
        };
      },
    },
  });

  assert.equal(unarchived.status, 'fulfilled');
  assert.deepEqual(updates[0], {
    is_archived: false,
    archived_at: null,
  });
  assert.deepEqual(updates[1], { status: 'fulfilled' });
});
