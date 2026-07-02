import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApprovalEmail, buildTicketEmail, buildTicketHolderBroadcastEmail } from '../shared/emailTemplates.js';

test('buildApprovalEmail includes subject, CTA, and fallback link text', () => {
  const email = buildApprovalEmail({
    eventName: 'PRSM Listening Session',
    checkoutUrl: 'https://checkout.lmnl.art/pay/prsm-session',
  });

  assert.equal(email.subject, "You're approved for PRSM Listening Session");
  assert.match(email.html, /Complete Payment/);
  assert.match(email.html, /checkout\.lmnl\.art\/pay\/prsm-session/);
  assert.match(email.text, /Event: PRSM Listening Session/);
  assert.match(email.html, /meta name="color-scheme" content="light"/);
  assert.match(email.html, /bgcolor="#ffffff"/);
  assert.match(email.html, /border: 2px solid #111111/);
});

test('buildTicketEmail includes guest, event, and ticket link', () => {
  const email = buildTicketEmail({
    eventName: 'Genesis Opening Night',
    ticketUrl: 'https://lmnl.art/ticket/tkt_42A91',
    customerName: 'Ada Lovelace',
  });

  assert.equal(email.subject, 'Your ticket for Genesis Opening Night');
  assert.match(email.html, /Ada Lovelace/);
  assert.match(email.html, /View Ticket/);
  assert.match(email.text, /https:\/\/lmnl\.art\/ticket\/tkt_42A91/);
  assert.doesNotMatch(email.html, /Local Preview/);
});

test('buildTicketHolderBroadcastEmail escapes content and preserves line breaks', () => {
  const email = buildTicketHolderBroadcastEmail({
    eventName: 'PRSM Listening Session',
    subject: 'Important update',
    content: 'Doors move to 8pm\nBring <ID>',
  });

  assert.equal(email.subject, 'Important update');
  assert.match(email.html, /Doors move to 8pm<br \/>Bring &lt;ID&gt;/);
  assert.match(email.html, /PRSM Listening Session/);
  assert.match(email.text, /Bring <ID>/);
});
