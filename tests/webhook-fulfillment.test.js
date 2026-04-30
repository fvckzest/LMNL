import test from 'node:test';
import assert from 'node:assert/strict';
import { processSquareOrderUpdate } from '../api/_lib/services/webhook-fulfillment.js';

test('processSquareOrderUpdate returns replay when ticket already exists', async () => {
  const result = await processSquareOrderUpdate(
    {
      type: 'order.updated',
      data: { object: { order_updated: { order_id: 'order_1' } } },
    },
    {},
    {
      verifySignature: () => {},
      findTicketBySquareOrderId: async () => ({ id: 'ticket_1' }),
    }
  );

  assert.deepEqual(result, { replay: true, ticketId: 'ticket_1' });
});

test('processSquareOrderUpdate creates ticket when order is fulfillable', async () => {
  const createdTickets = [];
  const result = await processSquareOrderUpdate(
    {
      type: 'order.updated',
      data: { object: { order_updated: { order_id: 'order_2' } } },
    },
    {},
    {
      verifySignature: () => {},
      findTicketBySquareOrderId: async () => null,
      squareClient: {
        orders: {
          get: async () => ({
            order: {
              id: 'order_2',
              state: 'COMPLETED',
              metadata: { requestId: 'req_1' },
              lineItems: [{ catalogObjectId: 'var_1' }],
              fulfillments: [{ digitalDetails: { recipient: { displayName: 'Ada', emailAddress: 'ada@example.com' } } }],
              tenders: [{ id: 'tender_1' }],
            },
          }),
        },
      },
      fulfillApprovedRequestById: async () => ({ id: 'req_1' }),
      fulfillApprovedRequestByOrderId: async () => null,
      getEventBySquareVariationIds: async () => ({ id: 'event_1', name: 'Launch' }),
      resolveCustomer: async () => ({ customerName: 'Ada', customerEmail: 'ada@example.com' }),
      createTicket: async (payload) => {
        createdTickets.push(payload);
        return { id: 'ticket_new', ...payload };
      },
      sendTicketEmail: async () => {},
    }
  );

  assert.equal(createdTickets.length, 1);
  assert.equal(createdTickets[0].square_order_id, 'order_2');
  assert.deepEqual(result, { success: true, ticketId: 'ticket_new' });
});
