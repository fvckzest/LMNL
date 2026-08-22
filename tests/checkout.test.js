import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCheckoutForDonation,
  createCheckoutForEvent,
  createCheckoutForPreorder,
  createCheckoutForRequest,
} from '../api/_lib/services/checkout.js';

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

test('createCheckoutForDonation creates Square-hosted checkout from donation variation', async () => {
  const checkoutPayloads = [];
  const result = await createCheckoutForDonation(20, {
    resolveDonationVariationId: async () => 'donation_var_20',
    getSquareLocationId: async () => 'loc_1',
    getBaseConfig: () => ({ siteUrl: 'https://lmnl.art' }),
    squareClient: {
      checkout: {
        paymentLinks: {
          create: async (payload) => {
            checkoutPayloads.push(payload);
            return {
              paymentLink: { url: 'https://square.test/donation', orderId: 'order_donation_20' },
            };
          },
        },
      },
    },
  });

  assert.equal(result.checkoutUrl, 'https://square.test/donation');
  assert.equal(result.orderId, 'order_donation_20');
  assert.equal(result.amount, 20);
  assert.equal(result.variationId, 'donation_var_20');
  assert.equal(checkoutPayloads[0].order.lineItems[0].catalogObjectId, 'donation_var_20');
  assert.equal(checkoutPayloads[0].order.metadata.type, 'space_donation');
  assert.equal(checkoutPayloads[0].checkoutOptions.redirectUrl, 'https://lmnl.art/space?donation=success&amount=20');
});

test('createCheckoutForDonation rejects unsupported amounts', async () => {
  await assert.rejects(
    createCheckoutForDonation(15, {}),
    /Invalid donation amount/
  );
});

test('createCheckoutForEvent creates approved request and Square-hosted checkout link', async () => {
  const requestPayloads = [];
  const attached = [];
  const checkoutPayloads = [];
  const result = await createCheckoutForEvent('event_1', {
    purchaseIntentId: '33333333-3333-4333-8333-333333333333',
    buyer: {
      fullName: 'Ada Lovelace',
      email: 'ada@example.org',
    },
  }, {
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
          create: async (payload) => {
            checkoutPayloads.push(payload);
            return {
              paymentLink: { url: 'https://square.test/event', orderId: 'order_event_1' },
            };
          },
        },
      },
    },
  });

  assert.equal(result.checkoutUrl, 'https://square.test/event');
  assert.equal(result.requestId, '33333333-3333-4333-8333-333333333333');
  assert.equal(requestPayloads[0].customer_name, 'Ada Lovelace');
  assert.equal(requestPayloads[0].customer_email, 'ada@example.org');
  assert.equal(attached.length, 0);
  assert.equal(requestPayloads[0].square_order_id, 'order_event_1');
  assert.equal(checkoutPayloads[0].checkoutOptions.redirectUrl, 'https://lmnl.art/success?requestId=33333333-3333-4333-8333-333333333333');
  assert.equal(checkoutPayloads[0].prePopulatedData.buyerEmail, 'ada@example.org');
});

test('createCheckoutForEvent keeps anonymous request correlation without sending a synthetic email to Square', async () => {
  const requestPayloads = [];
  const checkoutPayloads = [];

  const result = await createCheckoutForEvent('event_anon', {}, {
    getEventById: async () => ({
      id: 'event_anon',
      name: 'Shareholder Meeting',
      price: 1000,
      is_private: false,
      square_variation_id: 'var_shareholder',
    }),
    getSquareLocationId: async () => 'loc_1',
    getBaseConfig: () => ({ siteUrl: 'https://lmnl.art' }),
    createAccessRequest: async (payload) => {
      requestPayloads.push(payload);
      return { id: 'req_anon', ...payload };
    },
    attachOrderIdToRequest: async () => {},
    squareClient: {
      checkout: {
        paymentLinks: {
          create: async (payload) => {
            checkoutPayloads.push(payload);
            if (payload.prePopulatedData.buyerEmail?.endsWith('@example.com')) {
              const error = new Error('Invalid email address.');
              error.errors = [{
                code: 'INVALID_EMAIL_ADDRESS',
                field: 'pre_populated_data.buyer_email',
                detail: 'Invalid email address.',
              }];
              throw error;
            }
            return {
              paymentLink: { url: 'https://square.test/anonymous-event', orderId: 'order_anon' },
            };
          },
        },
      },
    },
  });

  assert.equal(result.checkoutUrl, 'https://square.test/anonymous-event');
  assert.match(requestPayloads[0].customer_email, /^guest-.*@example\.com$/);
  assert.equal(checkoutPayloads[0].prePopulatedData.buyerEmail, undefined);
});

test('createCheckoutForEvent does not persist an invite request when Square checkout creation fails', async () => {
  let requestCreated = false;

  await assert.rejects(
    createCheckoutForEvent('event_failed_checkout', {
      purchaseIntentId: '11111111-1111-4111-8111-111111111111',
    }, {
      getEventById: async () => ({
        id: 'event_failed_checkout',
        name: 'Shareholder Meeting',
        price: 1000,
        is_private: false,
        square_variation_id: 'var_shareholder',
      }),
      getSquareLocationId: async () => 'loc_1',
      getBaseConfig: () => ({ siteUrl: 'https://lmnl.art' }),
      createAccessRequest: async () => {
        requestCreated = true;
      },
      squareClient: {
        checkout: {
          paymentLinks: {
            create: async () => {
              throw new Error('Square checkout unavailable');
            },
          },
        },
      },
    }),
    /Square checkout unavailable/
  );

  assert.equal(requestCreated, false);
});

test('createCheckoutForEvent reuses the browser purchase intent for Square and request correlation', async () => {
  const requestPayloads = [];
  const checkoutPayloads = [];
  const purchaseIntentId = '22222222-2222-4222-8222-222222222222';

  const result = await createCheckoutForEvent('event_retry', { purchaseIntentId }, {
    getEventById: async () => ({
      id: 'event_retry',
      name: 'Shareholder Meeting',
      price: 1000,
      is_private: false,
      square_variation_id: 'var_shareholder',
    }),
    getSquareLocationId: async () => 'loc_1',
    getBaseConfig: () => ({ siteUrl: 'https://lmnl.art' }),
    createAccessRequest: async (payload) => {
      requestPayloads.push(payload);
      return payload;
    },
    squareClient: {
      checkout: {
        paymentLinks: {
          create: async (payload) => {
            checkoutPayloads.push(payload);
            return {
              paymentLink: { url: 'https://square.test/retry', orderId: 'order_retry' },
            };
          },
        },
      },
    },
  });

  assert.equal(result.requestId, purchaseIntentId);
  assert.equal(requestPayloads[0].id, purchaseIntentId);
  assert.equal(requestPayloads[0].square_order_id, 'order_retry');
  assert.equal(checkoutPayloads[0].idempotencyKey, purchaseIntentId);
});

test('createCheckoutForRequest creates Square-hosted checkout link for approved invite', async () => {
  const attached = [];
  const checkoutPayloads = [];
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
          create: async (payload) => {
            checkoutPayloads.push(payload);
            return {
              paymentLink: { url: 'https://square.test/request', orderId: 'order_req_1' },
            };
          },
        },
      },
    },
  });

  assert.equal(result.checkoutUrl, 'https://square.test/request');
  assert.equal(result.requestId, 'req_2');
  assert.equal(attached[0].requestId, 'req_2');
  assert.equal(checkoutPayloads[0].checkoutOptions.redirectUrl, 'https://lmnl.art/success?requestId=req_2');
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
