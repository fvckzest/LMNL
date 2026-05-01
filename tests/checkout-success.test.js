import test from 'node:test';
import assert from 'node:assert/strict';
import { getCheckoutSuccessView, getCheckoutSuccessViewByTicketId } from '../api/_lib/services/checkout-success.js';

test('getCheckoutSuccessView returns request, ticket, and event details', async () => {
  process.env.SITE_URL = 'https://lmnl.art';

  const result = await getCheckoutSuccessView('req_1', {
    getRequestById: async () => ({
      id: 'req_1',
      event_name: 'SPACE',
      customer_name: 'Zest',
      customer_email: 'zest@example.org',
      status: 'fulfilled',
      square_order_id: 'order_1',
      created_at: '2026-05-01T00:00:00.000Z',
    }),
    findTicketBySquareOrderId: async () => ({
      id: 'ticket_1',
      event_id: 'event_1',
      customer_name: 'Zest',
      customer_email: 'zest@example.org',
      created_at: '2026-05-01T00:05:00.000Z',
      is_used: false,
    }),
    getEventById: async () => ({
      id: 'event_1',
      name: 'SPACE',
      event_date: '2026-05-15',
      event_time: '9:00 PM',
      location_name: 'LMNL Space',
      price: 2000,
    }),
    getLatestEventByName: async () => null,
  });

  assert.equal(result.request.squareOrderId, 'order_1');
  assert.equal(result.ticket.url, 'https://lmnl.art/ticket/ticket_1');
  assert.equal(result.event.locationName, 'LMNL Space');
});

test('getCheckoutSuccessViewByTicketId builds summary without request id', async () => {
  process.env.SITE_URL = 'https://lmnl.art';

  const result = await getCheckoutSuccessViewByTicketId('ticket_2', {
    getTicketWithEventById: async () => ({
      ticket: {
        id: 'ticket_2',
        event_id: 'event_2',
        customer_name: 'Past Guest',
        customer_email: 'past@example.org',
        square_order_id: 'order_2',
        created_at: '2026-04-28T10:00:00.000Z',
        is_used: false,
      },
      event: {
        id: 'event_2',
        name: 'SPACE',
        event_date: '2026-04-28',
        event_time: '8:00 PM',
        location_name: 'LMNL Space',
        price: 1500,
      },
    }),
    getRequestByOrderId: async () => null,
  });

  assert.equal(result.ticket.id, 'ticket_2');
  assert.equal(result.request.status, 'issued');
  assert.equal(result.request.customerEmail, 'past@example.org');
  assert.equal(result.event.name, 'SPACE');
});
