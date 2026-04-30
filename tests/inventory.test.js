import test from 'node:test';
import assert from 'node:assert/strict';
import { __resetInventoryCache, getVariationInventory } from '../api/_lib/services/inventory.js';

test('getVariationInventory returns inventory and price', async () => {
  __resetInventoryCache();
  let batchGetCalls = 0;

  const squareClient = {
    inventory: {
      batchGetCounts: async () => ({
        counts: [{ catalogObjectId: 'var_1', quantity: '4' }],
      }),
    },
    catalog: {
      batchGet: async () => {
        batchGetCalls += 1;
        return {
          objects: [{
            itemVariationData: {
              priceMoney: { amount: 2500 },
            },
          }],
        };
      },
    },
  };

  const first = await getVariationInventory('var_1', { squareClient });
  const second = await getVariationInventory('var_1', { squareClient });

  assert.equal(first.available, 4);
  assert.equal(first.price, 2500);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(batchGetCalls, 1);
});
