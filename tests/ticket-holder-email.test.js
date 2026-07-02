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
    listSentTicketHolderEmails: async () => new Set(),
    recordTicketHolderEmailSend: async () => true,
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
      listSentTicketHolderEmails: async () => new Set(),
      recordTicketHolderEmailSend: async () => true,
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
    listSentTicketHolderEmails: async () => new Set(),
    recordTicketHolderEmailSend: async () => true,
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

test('sendTicketHolderEmail skips recipients already logged for the same message', async () => {
  const sent = [];

  const result = await sendTicketHolderEmail({
    eventId: 'event_logged',
    subject: 'Logged update',
    content: 'Already sent should skip.',
  }, {
    getEventById: async () => ({ id: 'event_logged', name: 'Logged Event' }),
    listTicketHolderEmailRecipientsByEvent: async () => [
      { email: 'already@example.org', name: 'Already', sources: ['direct'] },
      { email: 'new@example.org', name: 'New', sources: ['linked_request'] },
    ],
    listSentTicketHolderEmails: async () => new Set(['already@example.org']),
    recordTicketHolderEmailSend: async () => true,
    resendClient: {
      emails: {
        send: async (payload) => {
          sent.push(payload);
          return { data: { id: 'email_new' } };
        },
      },
    },
  });

  assert.equal(result.requestedCount, 2);
  assert.equal(result.sentCount, 1);
  assert.equal(result.skippedPreviouslySentCount, 1);
  assert.deepEqual(sent.map((email) => email.to), ['new@example.org']);
});

test('sendTicketHolderEmail recovery mode skips direct ticket recipients', async () => {
  const sent = [];
  const logged = [];

  const result = await sendTicketHolderEmail({
    eventId: 'event_recovery',
    subject: 'Recovery update',
    content: 'Send the missing group.',
    skipDirectRecipients: true,
  }, {
    getEventById: async () => ({ id: 'event_recovery', name: 'Recovery Event' }),
    listTicketHolderEmailRecipientsByEvent: async () => [
      { email: 'direct@example.org', name: 'Direct', sources: ['direct'] },
      { email: 'linked@example.org', name: 'Linked', sources: ['linked_request'] },
    ],
    listSentTicketHolderEmails: async () => new Set(),
    recordTicketHolderEmailSend: async (payload) => {
      logged.push(payload);
      return true;
    },
    resendClient: {
      emails: {
        send: async (payload) => {
          sent.push(payload);
          return { data: { id: 'email_linked' } };
        },
      },
    },
  });

  assert.equal(result.sentCount, 1);
  assert.equal(result.skippedDirectRecoveryCount, 1);
  assert.equal(result.directCount, 1);
  assert.equal(result.linkedRequestCount, 1);
  assert.deepEqual(sent.map((email) => email.to), ['linked@example.org']);
  assert.deepEqual(logged.map((entry) => entry.recipientEmail).sort(), ['direct@example.org', 'linked@example.org']);
});

test('sendTicketHolderEmail retries transient Resend failures', async () => {
  const sent = [];
  let attempts = 0;

  const result = await sendTicketHolderEmail({
    eventId: 'event_retry',
    subject: 'Retry update',
    content: 'Please keep trying.',
  }, {
    getEventById: async () => ({ id: 'event_retry', name: 'Retry Event' }),
    listTicketHolderEmailRecipientsByEvent: async () => [
      { email: 'retry@example.org', name: 'Retry', sources: ['linked_request'] },
    ],
    listSentTicketHolderEmails: async () => new Set(),
    recordTicketHolderEmailSend: async () => true,
    resendClient: {
      emails: {
        send: async (payload) => {
          attempts += 1;
          if (attempts === 1) {
            const error = new Error('Rate limit');
            error.statusCode = 429;
            throw error;
          }
          sent.push(payload);
          return { data: { id: 'email_retry' } };
        },
      },
    },
  });

  assert.equal(attempts, 2);
  assert.equal(result.sentCount, 1);
  assert.equal(result.failedCount, 0);
  assert.deepEqual(sent.map((email) => email.to), ['retry@example.org']);
});
