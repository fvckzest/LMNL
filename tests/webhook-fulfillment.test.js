import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  fulfillTicketForSquareOrder,
  processSquareOrderUpdate,
  resolveCustomer,
  sendTicketEmail,
} from '../api/_lib/services/webhook-fulfillment.js';

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

test('processSquareOrderUpdate treats concurrent duplicate ticket inserts as replays', async () => {
  let emailSent = false;
  let discordSent = false;
  let lookupCount = 0;
  const result = await processSquareOrderUpdate(
    {
      type: 'payment.updated',
      data: {
        object: {
          payment: {
            order_id: 'order_race',
            status: 'COMPLETED',
          },
        },
      },
    },
    {},
    {
      verifySignature: () => {},
      findTicketBySquareOrderId: async () => {
        lookupCount += 1;
        return lookupCount === 1 ? null : { id: 'ticket_existing' };
      },
      squareClient: {
        orders: {
          get: async () => ({
            order: {
              id: 'order_race',
              state: 'COMPLETED',
              metadata: { requestId: 'req_race' },
              lineItems: [{ catalogObjectId: 'var_race' }],
              tenders: [{ id: 'tender_race' }],
            },
          }),
        },
      },
      fulfillApprovedRequestById: async () => ({ id: 'req_race' }),
      fulfillApprovedRequestByOrderId: async () => null,
      getEventBySquareVariationIds: async () => ({ id: 'event_race', name: 'Race' }),
      resolveCustomer: async () => ({ customerName: 'Ada', customerEmail: 'ada@example.com' }),
      createTicket: async () => {
        const error = new Error('duplicate key value violates unique constraint');
        error.code = '23505';
        throw error;
      },
      sendTicketEmail: async () => {
        emailSent = true;
      },
      sendDiscordTicketNotification: async () => {
        discordSent = true;
      },
    }
  );

  assert.deepEqual(result, { replay: true, ticketId: 'ticket_existing' });
  assert.equal(lookupCount, 2);
  assert.equal(emailSent, false);
  assert.equal(discordSent, false);
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

test('processSquareOrderUpdate falls back to the approved request event name when order metadata cannot resolve the event', async () => {
  const createdTickets = [];
  const result = await processSquareOrderUpdate(
    {
      type: 'order.updated',
      data: { object: { order_updated: { order_id: 'order_request_event' } } },
    },
    {},
    {
      verifySignature: () => {},
      findTicketBySquareOrderId: async () => null,
      squareClient: {
        orders: {
          get: async () => ({
            order: {
              id: 'order_request_event',
              state: 'COMPLETED',
              metadata: { requestId: 'req_request_event' },
              lineItems: [{ name: 'Mystery Access Ticket' }],
              tenders: [{ id: 'tender_request_event' }],
            },
          }),
        },
      },
      fulfillApprovedRequestById: async () => ({
        id: 'req_request_event',
        status: 'fulfilled',
        event_name: 'Launch Night',
      }),
      fulfillApprovedRequestByOrderId: async () => null,
      getEventBySquareVariationIds: async () => null,
      getLatestEventByName: async (name) => ({ id: 'event_from_request', name }),
      resolveCustomer: async () => ({ customerName: 'Ada', customerEmail: 'ada@example.com' }),
      createTicket: async (payload) => {
        createdTickets.push(payload);
        return { id: 'ticket_request_event', ...payload };
      },
      sendTicketEmail: async () => {},
    }
  );

  assert.equal(createdTickets.length, 1);
  assert.equal(createdTickets[0].event_id, 'event_from_request');
  assert.deepEqual(result, { success: true, ticketId: 'ticket_request_event' });
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
      updateRequestCustomer: async () => {},
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

test('resolveCustomer uses the email entered in Square checkout from the associated payment', async () => {
  const customer = await resolveCustomer(
    {
      metadata: { requestId: 'req_square_email' },
      tenders: [{ id: 'payment_square_email' }],
    },
    'order_square_email',
    {
      getRequestCustomerById: async () => ({
        customer_name: 'Guest',
        customer_email: 'guest-placeholder@example.com',
      }),
      getRequestCustomerByOrderId: async () => null,
      squareClient: {
        customers: { get: async () => ({ customer: null }) },
        payments: {
          get: async ({ paymentId }) => ({
            payment: {
              id: paymentId,
              buyerEmailAddress: 'buyer@real-domain.test',
              cardDetails: {
                card: { cardholderName: 'Jordan Lee' },
              },
            },
          }),
        },
      },
    }
  );

  assert.equal(customer.customerName, 'Jordan Lee');
  assert.equal(customer.customerEmail, 'buyer@real-domain.test');
});

test('resolveCustomer preserves the submitted identity for private invite checkout', async () => {
  const customer = await resolveCustomer(
    {
      metadata: { requestId: 'req_private_invite' },
      tenders: [{ id: 'payment_private_invite' }],
    },
    'order_private_invite',
    {
      getRequestCustomerById: async () => ({
        customer_name: 'Mara Rivera',
        customer_email: 'mara@example.org',
      }),
      getRequestCustomerByOrderId: async () => null,
      squareClient: {
        customers: { get: async () => ({ customer: null }) },
        payments: {
          get: async () => ({
            payment: {
              buyerEmailAddress: 'different-card-email@example.org',
              cardDetails: {
                card: { cardholderName: 'Different Cardholder' },
              },
            },
          }),
        },
      },
    }
  );

  assert.deepEqual(customer, {
    customerName: 'Mara Rivera',
    customerEmail: 'mara@example.org',
  });
});

test('resolveCustomer prefers the Square customer profile name over the cardholder fallback', async () => {
  const customer = await resolveCustomer(
    {
      metadata: { requestId: 'req_square_profile' },
      tenders: [{ id: 'payment_square_profile' }],
    },
    'order_square_profile',
    {
      getRequestCustomerById: async () => ({
        customer_name: 'Guest',
        customer_email: 'guest-profile@example.com',
      }),
      getRequestCustomerByOrderId: async () => null,
      squareClient: {
        payments: {
          get: async () => ({
            payment: {
              customerId: 'customer_square_profile',
              buyerEmailAddress: 'profile@example.org',
              cardDetails: {
                card: { cardholderName: 'Cardholder Fallback' },
              },
            },
          }),
        },
        customers: {
          get: async () => ({
            customer: {
              givenName: 'Jordan',
              familyName: 'Lee',
              emailAddress: 'profile@example.org',
            },
          }),
        },
      },
    }
  );

  assert.deepEqual(customer, {
    customerName: 'Jordan Lee',
    customerEmail: 'profile@example.org',
  });
});

test('fulfillTicketForSquareOrder recovers email delivery for an existing placeholder ticket', async () => {
  const emails = [];
  const ticketUpdates = [];
  const requestUpdates = [];

  const result = await fulfillTicketForSquareOrder('order_recover_email', {
    findTicketBySquareOrderId: async () => ({
      id: 'ticket_recover_email',
      event_id: 'event_recover_email',
      square_order_id: 'order_recover_email',
      customer_name: 'Guest',
      customer_email: 'guest-old@example.com',
    }),
    squareClient: {
      orders: {
        get: async () => ({
          order: {
            id: 'order_recover_email',
            state: 'COMPLETED',
            metadata: { requestId: 'req_recover_email', eventId: 'event_recover_email' },
            tenders: [{ id: 'payment_recover_email' }],
          },
        }),
      },
      payments: {
        get: async () => ({
          payment: {
            buyerEmailAddress: 'buyer@real-domain.test',
            cardDetails: {
              card: { cardholderName: 'Jordan Lee' },
            },
          },
        }),
      },
      customers: { get: async () => ({ customer: null }) },
    },
    getRequestCustomerById: async () => ({
      customer_name: 'Guest',
      customer_email: 'guest-old@example.com',
    }),
    getRequestCustomerByOrderId: async () => null,
    getEventById: async () => ({ id: 'event_recover_email', name: 'Shareholder Meeting' }),
    sendTicketEmail: async (ticket, event, email) => {
      emails.push({ ticketId: ticket.id, eventName: event.name, email });
      return { id: 'email_recovered' };
    },
    updateTicketCustomer: async (ticketId, customer) => {
      ticketUpdates.push({ ticketId, customer });
      return { id: ticketId, ...customer };
    },
    updateRequestCustomer: async (requestId, customer) => {
      requestUpdates.push({ requestId, customer });
      return { id: requestId, ...customer };
    },
  });

  assert.deepEqual(result, {
    replay: true,
    recovered: true,
    ticketId: 'ticket_recover_email',
  });
  assert.deepEqual(emails, [{
    ticketId: 'ticket_recover_email',
    eventName: 'Shareholder Meeting',
    email: 'buyer@real-domain.test',
  }]);
  assert.equal(ticketUpdates[0].customer.customer_name, 'Jordan Lee');
  assert.equal(ticketUpdates[0].customer.customer_email, 'buyer@real-domain.test');
  assert.equal(requestUpdates[0].customer.customer_name, 'Jordan Lee');
  assert.equal(requestUpdates[0].customer.customer_email, 'buyer@real-domain.test');
});

test('fulfillTicketForSquareOrder repairs a Guest name without resending an already delivered ticket', async () => {
  let emailSendCount = 0;
  const ticketUpdates = [];
  const requestUpdates = [];

  const result = await fulfillTicketForSquareOrder('order_recover_name', {
    findTicketBySquareOrderId: async () => ({
      id: 'ticket_recover_name',
      event_id: 'event_recover_name',
      square_order_id: 'order_recover_name',
      customer_name: 'Guest',
      customer_email: 'buyer@example.org',
    }),
    squareClient: {
      orders: {
        get: async () => ({
          order: {
            id: 'order_recover_name',
            state: 'COMPLETED',
            metadata: { requestId: 'req_recover_name', eventId: 'event_recover_name' },
            tenders: [{ id: 'payment_recover_name' }],
          },
        }),
      },
      payments: {
        get: async () => ({
          payment: {
            buyerEmailAddress: 'buyer@example.org',
            cardDetails: {
              card: { cardholderName: 'Jordan Lee' },
            },
          },
        }),
      },
      customers: { get: async () => ({ customer: null }) },
    },
    getRequestCustomerById: async () => ({
      customer_name: 'Guest',
      customer_email: 'guest-old@example.com',
    }),
    getRequestCustomerByOrderId: async () => null,
    sendTicketEmail: async () => {
      emailSendCount += 1;
    },
    updateTicketCustomer: async (ticketId, customer) => {
      ticketUpdates.push({ ticketId, customer });
      return { id: ticketId, ...customer };
    },
    updateRequestCustomer: async (requestId, customer) => {
      requestUpdates.push({ requestId, customer });
      return { id: requestId, ...customer };
    },
  });

  assert.deepEqual(result, {
    replay: true,
    recovered: true,
    ticketId: 'ticket_recover_name',
  });
  assert.equal(emailSendCount, 0);
  assert.equal(ticketUpdates[0].customer.customer_name, 'Jordan Lee');
  assert.equal(ticketUpdates[0].customer.customer_email, 'buyer@example.org');
  assert.equal(requestUpdates[0].customer.customer_name, 'Jordan Lee');
});

test('sendTicketEmail keeps the branded sender when retrying a minimal payload', async () => {
  const resendCalls = [];
  process.env.RESEND_API_KEY = 're_test';
  const resendClient = {
    emails: {
      send: async (payload) => {
        resendCalls.push(payload);
        if (payload.html?.includes('<!doctype html>')) {
          return { error: { message: 'Domain not verified' } };
        }
        return { data: { id: 'email_123' } };
      },
    },
  };

  const result = await sendTicketEmail(
    { id: 'ticket_1' },
    { name: 'Launch' },
    'ada@example.org',
    'Ada',
    {
      resendClient,
      generateTicketPass: async () => ({ kind: 'unavailable', reason: 'skip attachment' }),
    }
  );

  assert.equal(resendCalls.length, 2);
  assert.equal(resendCalls[0].from, 'LMNL <tickets@lmnl.art>');
  assert.equal(resendCalls[1].from, 'LMNL <tickets@lmnl.art>');
  assert.equal(resendCalls[1].to, 'ada@example.org');
  assert.equal(resendCalls[0].replyTo, 'hi@lmnl.art');
  assert.deepEqual(result, { id: 'email_123' });
});

test('sendTicketEmail never sends to an internal placeholder address', async () => {
  let sendCount = 0;
  const result = await sendTicketEmail(
    { id: 'ticket_placeholder' },
    { name: 'Shareholder Meeting' },
    'guest-placeholder@example.com',
    'Guest',
    {
      resendClient: {
        emails: {
          send: async () => {
            sendCount += 1;
            return { data: { id: 'should_not_send' } };
          },
        },
      },
    }
  );

  assert.equal(sendCount, 0);
  assert.deepEqual(result, { skipped: true, reason: 'Missing customer email.' });
});

test('sendTicketEmail still sends when pass generation throws', async () => {
  const resendCalls = [];
  process.env.RESEND_API_KEY = 're_test';

  const result = await sendTicketEmail(
    { id: 'ticket_2', square_order_id: 'order_4' },
    { name: 'Launch' },
    'ada@example.org',
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
  assert.equal(resendCalls[0].replyTo, 'hi@lmnl.art');
  assert.deepEqual(result, { id: 'email_456' });
});
