import test from 'node:test';
import assert from 'node:assert/strict';
import { getTicketView } from '../api/_lib/services/tickets.js';

test('getTicketView returns ticket and event payload', async () => {
  const result = await getTicketView('ticket_1', {
    getTicketWithEventById: async () => ({
      ticket: { id: 'ticket_1', customer_name: 'Guest' },
      event: { id: 'event_1', name: 'LMNL Event' },
    }),
  });

  assert.equal(result.ticket.id, 'ticket_1');
  assert.equal(result.event.name, 'LMNL Event');
});
