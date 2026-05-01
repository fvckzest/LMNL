import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkInTicket,
  extractTicketIdFromScanValue,
  getTicketView,
} from '../api/_lib/services/tickets.js';

test('getTicketView returns ticket and event payload', async () => {
  const result = await getTicketView('ticket_1', {
    getTicketWithEventById: async () => ({
      ticket: { id: 'ticket_1', customer_name: 'Guest' },
      event: { id: 'event_1', name: 'LMNL Event' },
    }),
  });

  assert.equal(result.ticket.id, 'ticket_1');
  assert.equal(result.event.name, 'LMNL Event');
});

test('extractTicketIdFromScanValue reads ticket id from ticket url', () => {
  assert.equal(
    extractTicketIdFromScanValue('https://lmnl.art/ticket/ticket_123?ref=door'),
    'ticket_123',
  );
});

test('checkInTicket marks a valid unused ticket as used from qr payload', async () => {
  const result = await checkInTicket('LMNL-qr-token', {
    getTicketWithEventByQrPayload: async () => ({
      ticket: { id: 'ticket_1', is_used: false },
      event: { id: 'event_1', name: 'LMNL Event' },
    }),
    markTicketAsUsed: async () => ({
      id: 'ticket_1',
      is_used: true,
      used_at: '2026-05-01T12:00:00.000Z',
    }),
  });

  assert.equal(result.status, 'checked_in');
  assert.equal(result.ticket.is_used, true);
  assert.equal(result.event.name, 'LMNL Event');
});

test('checkInTicket reports already used tickets without updating them', async () => {
  let updated = false;
  const result = await checkInTicket('https://lmnl.art/ticket/ticket_2', {
    getTicketWithEventById: async () => ({
      ticket: { id: 'ticket_2', is_used: true, used_at: '2026-05-01T11:00:00.000Z' },
      event: { id: 'event_1', name: 'LMNL Event' },
    }),
    markTicketAsUsed: async () => {
      updated = true;
      return null;
    },
  });

  assert.equal(result.status, 'already_used');
  assert.equal(result.ticket.id, 'ticket_2');
  assert.equal(updated, false);
});
