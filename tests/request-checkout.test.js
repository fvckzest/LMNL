import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentForRequest, getRequestCheckoutView } from '../api/_lib/services/request-checkout.js';

test('getRequestCheckoutView returns approved ticket checkout details', async () => {
  const result = await getRequestCheckoutView('req_1', {
    getRequestById: async () => ({
      id: 'req_1',
      status: 'approved',
      customer_name: 'Ada Lovelace',
      customer_email: 'ada@example.com',
      event_name: 'SPACE',
    }),
    getLatestEventByName: async () => ({
      id: 'event_1',
      name: 'SPACE',
      price: 2500,
      description: 'Access ticket',
    }),
    getSquareLocationId: async () => 'loc_1',
    getSquareApplicationId: () => 'app_1',
    squareEnvironment: 'sandbox',
  });

  assert.equal(result.mode, 'request');
  assert.equal(result.requiresShipping, false);
  assert.equal(result.request.customerEmail, 'ada@example.com');
  assert.equal(result.square.locationId, 'loc_1');
});

test('createPaymentForRequest creates order, attaches request id, and returns success redirect', async () => {
  const calls = { orders: [], payments: [], attached: [] };
  const result = await createPaymentForRequest(
    'req_2',
    {
      sourceId: 'cnon:ticket',
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
        square_variation_id: 'var_1',
      }),
      getSquareLocationId: async () => 'loc_2',
      getBaseConfig: () => ({ siteUrl: 'https://lmnl.art' }),
      attachOrderIdToRequest: async (requestId, orderId) => {
        calls.attached.push({ requestId, orderId });
        return { id: requestId, square_order_id: orderId };
      },
      squareClient: {
        orders: {
          create: async (payload) => {
            calls.orders.push(payload);
            return { order: { id: 'order_req_2' } };
          },
        },
        payments: {
          create: async (payload) => {
            calls.payments.push(payload);
            return { payment: { id: 'payment_req_2', orderId: 'order_req_2' } };
          },
        },
      },
    }
  );

  assert.equal(calls.orders.length, 1);
  assert.equal(calls.orders[0].order.metadata.requestId, 'req_2');
  assert.equal(calls.attached[0].orderId, 'order_req_2');
  assert.equal(calls.payments[0].orderId, 'order_req_2');
  assert.equal(result.redirectUrl, 'https://lmnl.art/success?requestId=req_2');
});
