import test from 'node:test';
import assert from 'node:assert/strict';
import { updateEventStatus } from '../api/_lib/repositories/events.js';

test('updateEventStatus archives every invite request for an archived event', async () => {
  const operations = [];
  const supabase = {
    from: (table) => {
      if (table === 'events') {
        return {
          select: (columns) => {
            assert.equal(columns, 'name');
            return {
              eq: (column, value) => {
                assert.equal(column, 'id');
                assert.equal(value, 'event_1');
                return {
                  maybeSingle: async () => ({
                    data: { name: 'SPACE' },
                    error: null,
                  }),
                };
              },
            };
          },
          update: (payload) => {
            operations.push({ table, payload });
            return {
              eq: (column, value) => {
                assert.equal(column, 'id');
                assert.equal(value, 'event_1');
                return {
                  select: () => ({
                    single: async () => ({
                      data: { id: 'event_1', name: 'SPACE', ...payload },
                      error: null,
                    }),
                  }),
                };
              },
            };
          },
        };
      }

      assert.equal(table, 'requests');
      return {
        update: (payload) => {
          operations.push({ table, payload });
          return {
            eq: async (column, value) => {
              assert.equal(column, 'event_name');
              assert.equal(value, 'SPACE');
              return { error: null };
            },
          };
        },
      };
    },
  };

  const event = await updateEventStatus('event_1', 'archived', { supabase });

  assert.equal(event.status, 'archived');
  assert.equal(operations.length, 2);
  assert.equal(operations[0].table, 'requests');
  assert.equal(operations[0].payload.is_archived, true);
  assert.match(operations[0].payload.archived_at, /\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(operations[1], {
    table: 'events',
    payload: { status: 'archived' },
  });
});

test('updateEventStatus does not unarchive invite requests when restoring an event', async () => {
  const operations = [];
  const supabase = {
    from: (table) => {
      assert.equal(table, 'events');
      return {
        update: (payload) => {
          operations.push(payload);
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: { id: 'event_1', name: 'SPACE', ...payload },
                  error: null,
                }),
              }),
            }),
          };
        },
      };
    },
  };

  const event = await updateEventStatus('event_1', 'active', { supabase });

  assert.equal(event.status, 'active');
  assert.deepEqual(operations, [{ status: 'active' }]);
});
