import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentForPreorder, getPreorderCheckoutView, preorderRequiresShipping } from '../api/_lib/services/preorder-checkout.js';

test('preorderRequiresShipping defaults merch items to shipping', () => {
  assert.equal(preorderRequiresShipping({}), true);
  assert.equal(preorderRequiresShipping({ metadata: { requires_shipping: false } }), false);
});

test('getPreorderCheckoutView returns safe checkout config', async () => {
  const result = await getPreorderCheckoutView('pre_1', {
    getPreorderById: async () => ({
      id: 'pre_1',
      item_name: 'Archive Tee',
      description: 'Screen printed',
      price: 5800,
      metadata: { requires_shipping: true },
    }),
    getSquareLocationId: async () => 'loc_1',
    getSquareApplicationId: () => 'app_1',
    squareEnvironment: 'sandbox',
  });

  assert.equal(result.preorderId, 'pre_1');
  assert.equal(result.square.applicationId, 'app_1');
  assert.equal(result.square.locationId, 'loc_1');
  assert.equal(result.requiresShipping, true);
});

test('createPaymentForPreorder creates shipment order and payment', async () => {
  const calls = { orders: [], payments: [] };
  const result = await createPaymentForPreorder(
    'pre_2',
    {
      sourceId: 'cnon:test',
      buyer: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '+14155550123',
      },
      shippingAddress: {
        addressLine1: '123 Main St',
        locality: 'Los Angeles',
        administrativeDistrictLevel1: 'CA',
        postalCode: '90001',
        country: 'US',
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
      getPreorderById: async () => ({
        id: 'pre_2',
        item_name: 'Archive Tee',
        price: 5800,
        square_item_id: 'item_1',
      }),
      getSquareLocationId: async () => 'loc_2',
      getBaseConfig: () => ({ siteUrl: 'https://lmnl.art' }),
      squareClient: {
        orders: {
          create: async (payload) => {
            calls.orders.push(payload);
            return { order: { id: 'order_2' } };
          },
        },
        payments: {
          create: async (payload) => {
            calls.payments.push(payload);
            return { payment: { id: 'payment_2', orderId: 'order_2' } };
          },
        },
      },
    }
  );

  assert.equal(calls.orders.length, 1);
  assert.equal(calls.orders[0].order.fulfillments[0].type, 'SHIPMENT');
  assert.equal(calls.payments[0].orderId, 'order_2');
  assert.equal(result.redirectUrl, 'https://lmnl.art/shop?checkout=success&preorderId=pre_2');
});
