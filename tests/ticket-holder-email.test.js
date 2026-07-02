import test from 'node:test';
import assert from 'node:assert/strict';
import { sendTicketHolderEmail } from '../api/_lib/services/ticket-holder-email.js';

test('sendTicketHolderEmail sends one email per ticket holder recipient', async () => {
  process.env.SITE_URL = 'https://lmnl.art';
  process.env.RESEND_API_KEY = 're_test';
  const sent = [];

  const result = await sendTicketHolderEmail({
    eventId: 'event_1',
    subject: 'Tonight update',
    content: 'Doors are at 8.',
  }, {
    getEventById: async () => ({ id: 'event_1', name: 'Genesis Opening Night' }),
    listTicketHolderEmailRecipientsByEventId: async () => [
      { email: 'ada@example.org', name: 'Ada' },
      { email: 'grace@example.org', name: 'Grace' },
    ],
    resendClient: {
      emails: {
        send: async (payload) => {
          sent.push(payload);
          return { data: { id: `email_${sent.length}` } };
        },
      },
    },
  });

  assert.equal(result.sentCount, 2);
  assert.equal(result.failedCount, 0);
  assert.equal(sent.length, 2);
  assert.deepEqual(sent.map((email) => email.to), ['ada@example.org', 'grace@example.org']);
  assert.equal(sent[0].from, 'LMNL <tickets@lmnl.art>');
  assert.equal(sent[0].replyTo, 'hi@lmnl.art');
  assert.equal(sent[0].subject, 'Tonight update');
  assert.match(sent[0].html, /Doors are at 8\./);
});

test('sendTicketHolderEmail rejects events with no recipients', async () => {
  await assert.rejects(
    sendTicketHolderEmail({
      eventId: 'event_empty',
      subject: 'Update',
      content: 'Hello',
    }, {
      getEventById: async () => ({ id: 'event_empty', name: 'Empty Event' }),
      listTicketHolderEmailRecipientsByEventId: async () => [],
      resendClient: {
        emails: {
          send: async () => ({ data: { id: 'unused' } }),
        },
      },
    }),
    /No ticket holder emails were found/,
  );
});

test('sendTicketHolderEmail can send plain text without html', async () => {
  const sent = [];

  const result = await sendTicketHolderEmail({
    eventId: 'event_plain',
    subject: 'Plain update',
    content: 'No wrapper please.',
    plainTextOnly: true,
  }, {
    getEventById: async () => ({ id: 'event_plain', name: 'Plain Event' }),
    listTicketHolderEmailRecipientsByEventId: async () => [
      { email: 'plain@example.org', name: 'Plain' },
    ],
    resendClient: {
      emails: {
        send: async (payload) => {
          sent.push(payload);
          return { data: { id: 'email_plain' } };
        },
      },
    },
  });

  assert.equal(result.plainTextOnly, true);
  assert.equal(sent[0].html, undefined);
  assert.match(sent[0].text, /No wrapper please\./);
});
