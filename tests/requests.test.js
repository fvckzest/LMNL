import test from 'node:test';
import assert from 'node:assert/strict';
import { countApprovedRequestsByEventName } from '../api/_lib/repositories/requests.js';

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
