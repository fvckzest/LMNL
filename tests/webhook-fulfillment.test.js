import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
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

test('processSquareOrderUpdate prefers order metadata event ID when catalog variation lookup is unavailable', async () => {
  const createdTickets = [];
  const result = await processSquareOrderUpdate(
    {
      type: 'order.updated',
      data: { object: { order_updated: { order_id: 'order_metadata_event' } } },
    },
    {},
    {
      verifySignature: () => {},
      findTicketBySquareOrderId: async () => null,
      squareClient: {
        orders: {
          get: async () => ({
            order: {
              id: 'order_metadata_event',
              state: 'COMPLETED',
              metadata: { requestId: 'req_meta', eventId: 'event_meta' },
              lineItems: [{ name: 'Launch - Access Ticket' }],
              tenders: [{ id: 'tender_meta' }],
            },
          }),
        },
      },
      fulfillApprovedRequestById: async () => ({ id: 'req_meta' }),
      fulfillApprovedRequestByOrderId: async () => null,
      getEventById: async (id) => ({ id, name: 'Launch' }),
      getEventBySquareVariationIds: async () => null,
      resolveCustomer: async () => ({ customerName: 'Ada', customerEmail: 'ada@example.com' }),
      createTicket: async (payload) => {
        createdTickets.push(payload);
        return { id: 'ticket_meta', ...payload };
      },
      sendTicketEmail: async () => {},
    }
  );

  assert.equal(createdTickets.length, 1);
  assert.equal(createdTickets[0].event_id, 'event_meta');
  assert.deepEqual(result, { success: true, ticketId: 'ticket_meta' });
});

test('processSquareOrderUpdate recovers when the request is already fulfilled but the ticket does not exist yet', async () => {
  const createdTickets = [];
  const result = await processSquareOrderUpdate(
    {
      type: 'order.updated',
      data: { object: { order_updated: { order_id: 'order_recover' } } },
    },
    {},
    {
      verifySignature: () => {},
      findTicketBySquareOrderId: async () => null,
      squareClient: {
        orders: {
          get: async () => ({
            order: {
              id: 'order_recover',
              state: 'COMPLETED',
              metadata: { requestId: 'req_recover' },
              lineItems: [{ catalogObjectId: 'var_recover' }],
              tenders: [{ id: 'tender_recover' }],
            },
          }),
        },
      },
      fulfillApprovedRequestById: async () => null,
      fulfillApprovedRequestByOrderId: async () => null,
      getRequestById: async () => ({
        id: 'req_recover',
        status: 'fulfilled',
      }),
      getEventBySquareVariationIds: async () => ({ id: 'event_recover', name: 'Recovery' }),
      resolveCustomer: async () => ({ customerName: 'Ada', customerEmail: 'ada@example.com' }),
      createTicket: async (payload) => {
        createdTickets.push(payload);
        return { id: 'ticket_recover', ...payload };
      },
      sendTicketEmail: async () => {},
    }
  );

  assert.equal(createdTickets.length, 1);
  assert.equal(createdTickets[0].square_order_id, 'order_recover');
  assert.deepEqual(result, { success: true, ticketId: 'ticket_recover' });
});

test('processSquareOrderUpdate fulfills completed payment.updated events', async () => {
  const createdTickets = [];
  const result = await processSquareOrderUpdate(
    {
      type: 'payment.updated',
      data: {
        id: 'payment_1',
        object: {
          payment: {
            id: 'payment_1',
            order_id: 'order_3',
            status: 'COMPLETED',
          },
        },
      },
    },
    {},
    {
      verifySignature: () => {},
      findTicketBySquareOrderId: async () => null,
      squareClient: {
        orders: {
          get: async () => ({
            order: {
              id: 'order_3',
              state: 'COMPLETED',
              metadata: { requestId: 'req_3' },
              lineItems: [{ catalogObjectId: 'var_3' }],
              tenders: [{ id: 'tender_3' }],
            },
          }),
        },
      },
      fulfillApprovedRequestById: async () => ({ id: 'req_3' }),
      fulfillApprovedRequestByOrderId: async () => null,
      getEventBySquareVariationIds: async () => ({ id: 'event_3', name: 'Space' }),
      resolveCustomer: async () => ({ customerName: 'Zest', customerEmail: 'zest@example.org' }),
      createTicket: async (payload) => {
        createdTickets.push(payload);
        return { id: 'ticket_payment', ...payload };
      },
      sendTicketEmail: async () => {},
    }
  );

  assert.equal(createdTickets.length, 1);
  assert.equal(createdTickets[0].square_order_id, 'order_3');
  assert.deepEqual(result, { success: true, ticketId: 'ticket_payment' });
});

test('processSquareOrderUpdate verifies Square signature against the raw request body', async () => {
  process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = 'webhook-secret';
  process.env.SQUARE_WEBHOOK_URL = 'https://lmnl.art/api/square-webhook';

  const rawBody = '{\n  "type": "order.updated",\n  "data": {\n    "object": {\n      "order_updated": {\n        "order_id": "order_raw"\n      }\n    }\n  }\n}';
  const signature = crypto
    .createHmac('sha256', process.env.SQUARE_WEBHOOK_SIGNATURE_KEY)
    .update(`${process.env.SQUARE_WEBHOOK_URL}${rawBody}`)
    .digest('base64');

  const result = await processSquareOrderUpdate(
    {
      type: 'order.updated',
      data: { object: { order_updated: { order_id: 'order_raw' } } },
    },
    {
      'x-square-hmacsha256-signature': signature,
    },
    {
      rawBody,
      findTicketBySquareOrderId: async () => ({ id: 'ticket_raw' }),
    }
  );

  assert.deepEqual(result, { replay: true, ticketId: 'ticket_raw' });
  delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  delete process.env.SQUARE_WEBHOOK_URL;
});

test('processSquareOrderUpdate accepts the actual request URL when it differs only from configured webhook URL', async () => {
  process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = 'webhook-secret';
  process.env.SQUARE_WEBHOOK_URL = 'https://www.lmnl.art/api/square-webhook/';

  const rawBody = '{"type":"order.updated","data":{"object":{"order_updated":{"order_id":"order_request_url"}}}}';
  const requestUrl = 'https://lmnl.art/api/square-webhook';
  const signature = crypto
    .createHmac('sha256', process.env.SQUARE_WEBHOOK_SIGNATURE_KEY)
    .update(`${requestUrl}${rawBody}`)
    .digest('base64');

  const result = await processSquareOrderUpdate(
    {
      type: 'order.updated',
      data: { object: { order_updated: { order_id: 'order_request_url' } } },
    },
    {
      'x-square-hmacsha256-signature': signature,
    },
    {
      rawBody,
      requestUrl,
      findTicketBySquareOrderId: async () => ({ id: 'ticket_request_url' }),
    }
  );

  assert.deepEqual(result, { replay: true, ticketId: 'ticket_request_url' });
  delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  delete process.env.SQUARE_WEBHOOK_URL;
});

test('processSquareOrderUpdate accepts the legacy Square signature header', async () => {
  process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = 'webhook-secret';
  process.env.SQUARE_WEBHOOK_URL = 'https://lmnl.art/api/square-webhook';

  const rawBody = '{"type":"order.updated","data":{"object":{"order_updated":{"order_id":"order_legacy_sig"}}}}';
  const signature = crypto
    .createHmac('sha256', process.env.SQUARE_WEBHOOK_SIGNATURE_KEY)
    .update(`${process.env.SQUARE_WEBHOOK_URL}${rawBody}`)
    .digest('base64');

  const result = await processSquareOrderUpdate(
    {
      type: 'order.updated',
      data: { object: { order_updated: { order_id: 'order_legacy_sig' } } },
    },
    {
      'x-square-signature': signature,
    },
    {
      rawBody,
      findTicketBySquareOrderId: async () => ({ id: 'ticket_legacy_sig' }),
    }
  );

  assert.deepEqual(result, { replay: true, ticketId: 'ticket_legacy_sig' });
  delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  delete process.env.SQUARE_WEBHOOK_URL;
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

test('sendTicketEmail still sends when pass generation throws', async () => {
  const resendCalls = [];
  process.env.RESEND_API_KEY = 're_test';

  const result = await sendTicketEmail(
    { id: 'ticket_2', square_order_id: 'order_4' },
    { name: 'Launch' },
    'ada@example.com',
    'Ada',
    {
      resendClient: {
        emails: {
          send: async (payload) => {
            resendCalls.push(payload);
            return { data: { id: 'email_456' } };
          },
        },
      },
      generateTicketPass: async () => {
        throw new Error('Bad certificate');
      },
    }
  );

  assert.equal(resendCalls.length, 1);
  assert.equal(resendCalls[0].from, 'LMNL <tickets@lmnl.art>');
  assert.equal(resendCalls[0].attachments, undefined);
  assert.deepEqual(result, { id: 'email_456' });
});
