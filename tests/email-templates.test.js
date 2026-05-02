import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApprovalEmail, buildTicketEmail } from '../shared/emailTemplates.js';

test('buildApprovalEmail includes subject, CTA, and fallback link text', () => {
  const email = buildApprovalEmail({
    eventName: 'PRSM Listening Session',
    checkoutUrl: 'https://checkout.lmnl.art/pay/prsm-session',
  });

  assert.equal(email.subject, 'APPROVED: PRSM Listening Session');
  assert.match(email.html, /Complete Payment/);
  assert.match(email.html, /checkout\.lmnl\.art\/pay\/prsm-session/);
  assert.match(email.text, /Event: PRSM Listening Session/);
});

test('buildTicketEmail includes guest, event, and ticket link', () => {
  const email = buildTicketEmail({
    eventName: 'Genesis Opening Night',
    ticketUrl: 'https://lmnl.art/ticket/tkt_42A91',
    customerName: 'Ada Lovelace',
  });

  assert.equal(email.subject, 'Genesis Opening Night TICKET');
  assert.match(email.html, /Ada Lovelace/);
  assert.match(email.html, /View Ticket/);
  assert.match(email.text, /https:\/\/lmnl\.art\/ticket\/tkt_42A91/);
});
