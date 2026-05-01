import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentForEvent, getEventCheckoutView } from '../api/_lib/services/event-checkout.js';

test('getEventCheckoutView returns public event checkout details', async () => {
  const result = await getEventCheckoutView('event_1', {
    getEventById: async () => ({
      id: 'event_1',
      name: 'Open Night',
      price: 1800,
      is_private: false,
    }),
    getSquareLocationId: async () => 'loc_1',
    getSquareApplicationId: () => 'app_1',
    squareEnvironment: 'sandbox',
  });

  assert.equal(result.mode, 'event');
  assert.equal(result.requiresShipping, false);
  assert.equal(result.event.id, 'event_1');
  assert.equal(result.price, 1800);
});

test('createPaymentForEvent creates approved request, order, payment, and success redirect', async () => {
  const calls = { requests: [], attach: [], orders: [], payments: [] };
  const result = await createPaymentForEvent(
    'event_2',
    {
      sourceId: 'cnon:event',
      buyer: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
      },
      billingAddress: {
        addressLine1: '123 Main St',
        locality: 'Los Angeles',
        administrativeDistrictLevel1: 'CA',
        postalCode: '90001',
        country: 'US',
      },
    },
    {
      getEventById: async () => ({
        id: 'event_2',
        name: 'Open Night',
        price: 1800,
        is_private: false,
        square_variation_id: 'var_2',
      }),
      getSquareLocationId: async () => 'loc_2',
      getBaseConfig: () => ({ siteUrl: 'https://lmnl.art' }),
      createAccessRequest: async (payload) => {
        calls.requests.push(payload);
        return { id: 'req_public_1', ...payload };
      },
      attachOrderIdToRequest: async (requestId, orderId) => {
        calls.attach.push({ requestId, orderId });
        return { id: requestId, square_order_id: orderId };
      },
      squareClient: {
        orders: {
          create: async (payload) => {
            calls.orders.push(payload);
            return { order: { id: 'order_public_1' } };
          },
        },
        payments: {
          create: async (payload) => {
            calls.payments.push(payload);
            return { payment: { id: 'payment_public_1', orderId: 'order_public_1' } };
          },
        },
      },
    }
  );

  assert.equal(calls.requests[0].status, 'approved');
  assert.equal(calls.orders[0].order.metadata.requestId, 'req_public_1');
  assert.equal(calls.attach[0].orderId, 'order_public_1');
  assert.equal(Number(calls.payments[0].amountMoney.amount), 1800);
  assert.equal(result.redirectUrl, 'https://lmnl.art/success?requestId=req_public_1');
});
