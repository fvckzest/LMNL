import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheckoutForEvent, createCheckoutForPreorder, createCheckoutForRequest } from '../api/_lib/services/checkout.js';

test('createCheckoutForPreorder builds checkout URL from preorder and variation', async () => {
  const payloads = [];
  const result = await createCheckoutForPreorder('pre_123', {
    getPreorderById: async () => ({ id: 'pre_123', square_item_id: 'item_1' }),
    resolveVariationId: async () => 'var_1',
    getSquareLocationId: async () => 'loc_1',
    getBaseConfig: () => ({ siteUrl: 'https://lmnl.art' }),
    squareClient: {
      checkout: {
        paymentLinks: {
          create: async (payload) => {
            payloads.push(payload);
            return { paymentLink: { url: 'https://square.test/checkout', orderId: 'order_1' } };
          },
        },
      },
    },
  });

  assert.equal(result.checkoutUrl, 'https://square.test/checkout');
  assert.equal(result.orderId, 'order_1');
  assert.equal(result.variationId, 'var_1');
  assert.equal(payloads[0].order.referenceId, 'pre_123');
  assert.equal(payloads[0].order.lineItems[0].catalogObjectId, 'var_1');
  assert.equal(payloads[0].checkoutOptions.enableCoupon, true);
});

test('createCheckoutForPreorder rejects missing preorder', async () => {
  await assert.rejects(
    createCheckoutForPreorder('missing', {
      getPreorderById: async () => null,
    }),
    /Preorder not found/
  );
});

test('createCheckoutForEvent creates approved request and Square-hosted checkout link', async () => {
  const requestPayloads = [];
  const attached = [];
  const result = await createCheckoutForEvent('event_1', {}, {
    getEventById: async () => ({
      id: 'event_1',
      name: 'Open Night',
      price: 1800,
      is_private: false,
      square_variation_id: 'var_event_1',
    }),
    getSquareLocationId: async () => 'loc_1',
    getBaseConfig: () => ({ siteUrl: 'https://lmnl.art' }),
    createAccessRequest: async (payload) => {
      requestPayloads.push(payload);
      return { id: 'req_1', ...payload };
    },
    attachOrderIdToRequest: async (requestId, orderId) => {
      attached.push({ requestId, orderId });
      return { id: requestId, square_order_id: orderId };
    },
    squareClient: {
      checkout: {
        paymentLinks: {
          create: async () => ({
            paymentLink: { url: 'https://square.test/event', orderId: 'order_event_1' },
          }),
        },
      },
    },
  });

  assert.equal(result.checkoutUrl, 'https://square.test/event');
  assert.equal(result.requestId, 'req_1');
  assert.equal(requestPayloads[0].customer_name, 'Guest');
  assert.match(requestPayloads[0].customer_email, /^guest-.*@example\.com$/);
  assert.equal(attached[0].orderId, 'order_event_1');
});

test('createCheckoutForRequest creates Square-hosted checkout link for approved invite', async () => {
  const attached = [];
  const result = await createCheckoutForRequest('req_2', {
    buyer: {
      phone: '+14155550124',
    },
  }, {
    getRequestById: async () => ({
      id: 'req_2',
      status: 'approved',
      customer_name: 'Ada Lovelace',
      customer_email: 'ada@example.com',
      event_name: 'SPACE',
    }),
    getLatestEventByName: async () => ({
      id: 'event_2',
      name: 'SPACE',
      price: 2500,
      square_variation_id: 'var_req_1',
    }),
    getSquareLocationId: async () => 'loc_2',
    getBaseConfig: () => ({ siteUrl: 'https://lmnl.art' }),
    attachOrderIdToRequest: async (requestId, orderId) => {
      attached.push({ requestId, orderId });
      return { id: requestId, square_order_id: orderId };
    },
    squareClient: {
      checkout: {
        paymentLinks: {
          create: async () => ({
            paymentLink: { url: 'https://square.test/request', orderId: 'order_req_1' },
          }),
        },
      },
    },
  });

  assert.equal(result.checkoutUrl, 'https://square.test/request');
  assert.equal(result.requestId, 'req_2');
  assert.equal(attached[0].requestId, 'req_2');
});

test('createCheckoutForRequest reports invalid fallback ticket price clearly', async () => {
  await assert.rejects(
    createCheckoutForRequest('req_3', {}, {
      getRequestById: async () => ({
        id: 'req_3',
        status: 'approved',
        customer_name: 'Ada Lovelace',
        customer_email: 'ada@example.com',
        event_name: 'SPACE',
      }),
      getLatestEventByName: async () => ({
        id: 'event_3',
        name: 'SPACE',
        price: 'not-a-price',
        square_variation_id: '',
      }),
      getSquareLocationId: async () => 'loc_3',
      getBaseConfig: () => ({ siteUrl: 'https://lmnl.art' }),
      squareClient: {
        checkout: {
          paymentLinks: {
            create: async () => {
              throw new Error('should not reach square create');
            },
          },
        },
      },
    }),
    /Invalid ticket price/
  );
});

test('createCheckoutForRequest exposes Square checkout errors', async () => {
  await assert.rejects(
    createCheckoutForRequest('req_4', {}, {
      getRequestById: async () => ({
        id: 'req_4',
        status: 'approved',
        customer_name: 'Grace Hopper',
        customer_email: 'grace@example.com',
        event_name: 'SPACE',
      }),
      getLatestEventByName: async () => ({
        id: 'event_4',
        name: 'SPACE',
        price: 2500,
        square_variation_id: 'var_req_4',
      }),
      getSquareLocationId: async () => 'loc_4',
      getBaseConfig: () => ({ siteUrl: 'https://lmnl.art' }),
      squareClient: {
        checkout: {
          paymentLinks: {
            create: async () => {
              const error = new Error('INVALID_REQUEST_ERROR');
              error.errors = [{ detail: 'Catalog object is not available at this location.' }];
              throw error;
            },
          },
        },
      },
    }),
    /Catalog object is not available at this location/
  );
});
