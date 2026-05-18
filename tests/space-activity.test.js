import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpaceTicketActivity } from '../api/_lib/services/space-activity.js';

test('getSpaceTicketActivity returns masked recent purchases for a space event', async () => {
  const result = await getSpaceTicketActivity(
    { eventId: 'event_space', limit: 2 },
    {
      getEventById: async () => ({ id: 'event_space', name: 'SPACE' }),
      countTicketsByEventId: async () => 24,
      listRecentTicketsByEventId: async () => ([
        {
          id: 'ticket_2',
          customer_name: 'Ada Lovelace',
          created_at: '2026-05-18T10:00:00.000Z',
        },
        {
          id: 'ticket_1',
          customer_name: 'Prince',
          created_at: '2026-05-18T09:30:00.000Z',
        },
      ]),
    }
  );

  assert.equal(result.eventId, 'event_space');
  assert.equal(result.soldTickets, 24);
  assert.equal(result.activity.length, 2);
  assert.equal(result.activity[0].customerName, 'Ada L.');
  assert.equal(result.activity[1].customerName, 'Prince');
});
