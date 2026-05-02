import test from 'node:test';
import assert from 'node:assert/strict';
import { approveRequestAndSendCheckout } from '../api/_lib/services/approval.js';

test('approveRequestAndSendCheckout approves only after checkout is created', async () => {
  const steps = [];

  const result = await approveRequestAndSendCheckout('req_1', {
    getRequestById: async () => ({
      id: 'req_1',
      status: 'pending',
      customer_email: 'ada@example.com',
      customer_name: 'Ada Lovelace',
      event_name: 'SPACE',
    }),
    createCheckoutForRequestRecord: async (_request, _payload, deps) => {
      steps.push({ type: 'checkout', persistOrderId: deps.persistOrderId });
      return {
        checkoutUrl: 'https://square.test/checkout',
        orderId: 'order_1',
      };
    },
    approveRequestWithOrderId: async (requestId, orderId) => {
      steps.push({ type: 'approve', requestId, orderId });
      return {
        id: requestId,
        status: 'approved',
        square_order_id: orderId,
        customer_email: 'ada@example.com',
        event_name: 'SPACE',
      };
    },
    sendApprovalEmail: async () => {
      steps.push({ type: 'email' });
    },
  });

  assert.deepEqual(steps, [
    { type: 'checkout', persistOrderId: false },
    { type: 'approve', requestId: 'req_1', orderId: 'order_1' },
    { type: 'email' },
  ]);
  assert.equal(result.status, 'approved');
  assert.equal(result.checkoutUrl, 'https://square.test/checkout');
  assert.equal(result.orderId, 'order_1');
  assert.equal(result.warning, null);
});

test('approveRequestAndSendCheckout still succeeds when email delivery fails', async () => {
  const result = await approveRequestAndSendCheckout('req_2', {
    getRequestById: async () => ({
      id: 'req_2',
      status: 'pending',
      customer_email: 'grace@example.com',
      customer_name: 'Grace Hopper',
      event_name: 'SPACE',
    }),
    createCheckoutForRequestRecord: async () => ({
      checkoutUrl: 'https://square.test/checkout',
      orderId: 'order_2',
    }),
    approveRequestWithOrderId: async (requestId, orderId) => ({
      id: requestId,
      status: 'approved',
      square_order_id: orderId,
      customer_email: 'grace@example.com',
      event_name: 'SPACE',
    }),
    sendApprovalEmail: async () => {
      throw new Error('SMTP temporarily unavailable');
    },
  });

  assert.equal(result.status, 'approved');
  assert.equal(result.emailSent, false);
  assert.match(result.warning, /Invite approved, but the approval email could not be sent/);
  assert.equal(result.checkoutUrl, 'https://square.test/checkout');
});

test('approveRequestAndSendCheckout does not approve when checkout creation fails', async () => {
  let approved = false;

  await assert.rejects(
    approveRequestAndSendCheckout('req_3', {
      getRequestById: async () => ({
        id: 'req_3',
        status: 'pending',
        customer_email: 'katherine@example.com',
        customer_name: 'Katherine Johnson',
        event_name: 'SPACE',
      }),
      createCheckoutForRequestRecord: async () => {
        throw new Error('Square unavailable');
      },
      approveRequestWithOrderId: async () => {
        approved = true;
      },
    }),
    /Square unavailable/
  );

  assert.equal(approved, false);
});
