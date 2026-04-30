import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheckoutForPreorder } from '../api/_lib/services/checkout.js';

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
});

test('createCheckoutForPreorder rejects missing preorder', async () => {
  await assert.rejects(
    createCheckoutForPreorder('missing', {
      getPreorderById: async () => null,
    }),
    /Preorder not found/
  );
});
