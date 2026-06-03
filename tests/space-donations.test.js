import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpaceDonationActivity } from '../api/_lib/services/space-donations.js';

test('getSpaceDonationActivity returns completed feed the horse Square orders', async () => {
  const activity = await getSpaceDonationActivity(4, {
    disableCache: true,
    searchCompletedSquareOrders: async () => ([
      {
        id: 'order_feed_20',
        state: 'COMPLETED',
        closedAt: '2026-05-31T20:00:00.000Z',
        totalMoney: { amount: 2000, currency: 'USD' },
        lineItems: [
          {
            name: 'Feed the Horse - Donation',
          },
        ],
      },
      {
        id: 'order_ticket',
        state: 'COMPLETED',
        closedAt: '2026-05-31T19:00:00.000Z',
        totalMoney: { amount: 2500, currency: 'USD' },
        lineItems: [
          {
            name: 'SPACE - Access Ticket',
          },
        ],
      },
    ]),
  });

  assert.equal(activity.length, 1);
  assert.equal(activity[0].id, 'square-donation-order_feed_20');
  assert.equal(activity[0].customerName, 'Anonymous supporter');
  assert.equal(activity[0].activityLabel, 'horse fed $20');
  assert.equal(activity[0].createdAt, '2026-05-31T20:00:00.000Z');
});
