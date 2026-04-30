import test from 'node:test';
import assert from 'node:assert/strict';
import { processSquareOrderUpdate, resolveCustomer, sendTicketEmail } from '../api/_lib/services/webhook-fulfillment.js';

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

test('resolveCustomer falls back to request email when Square provides placeholder recipient email', async () => {
  const customer = await resolveCustomer(
    {
      metadata: { requestId: 'req_4' },
      fulfillments: [{ digitalDetails: { recipient: { displayName: ' ', emailAddress: 'jane.doe@example.com' } } }],
      tenders: [{ id: 'tender_1' }],
    },
    'order_4',
    {
      getRequestCustomerById: async () => ({ customer_name: 'Real Person', customer_email: 'real@example.org' }),
      getRequestCustomerByOrderId: async () => null,
      squareClient: {
        customers: {
          get: async () => ({ customer: null }),
        },
      },
    }
  );

  assert.equal(customer.customerName, 'Real Person');
  assert.equal(customer.customerEmail, 'real@example.org');
});

test('sendTicketEmail falls back to resend onboarding sender when branded sender fails', async () => {
  const resendCalls = [];
  process.env.RESEND_API_KEY = 're_test';
  const resendClient = {
    emails: {
      send: async (payload) => {
        resendCalls.push(payload);
        if (payload.from === 'LMNL <tickets@lmnl.art>') {
          return { error: { message: 'Domain not verified' } };
        }
        return { data: { id: 'email_123' } };
      },
    },
  };

  const result = await sendTicketEmail(
    { id: 'ticket_1' },
    { name: 'Launch' },
    'ada@example.com',
    'Ada',
    {
      resendClient,
      generateTicketPass: async () => ({ kind: 'unavailable', reason: 'skip attachment' }),
    }
  );

  assert.equal(resendCalls.length, 2);
  assert.equal(resendCalls[0].from, 'LMNL <tickets@lmnl.art>');
  assert.equal(resendCalls[1].from, 'onboarding@resend.dev');
  assert.equal(resendCalls[1].to, 'ada@example.com');
  assert.deepEqual(result, { id: 'email_123' });
});
