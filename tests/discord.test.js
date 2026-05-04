import test from 'node:test';
import assert from 'node:assert/strict';
import { getRemainingTicketCount, sendDiscordTicketNotification } from '../api/_lib/services/discord.js';

test('getRemainingTicketCount prefers Square inventory when variation is present', async () => {
  const remaining = await getRemainingTicketCount(
    { id: 'event_1', capacity: 50, square_variation_id: 'var_1' },
    {
      getVariationInventory: async () => ({ available: 7 }),
      countTicketsByEventId: async () => 49,
    }
  );

  assert.equal(remaining, 7);
});

test('getRemainingTicketCount falls back to event capacity minus issued tickets', async () => {
  const remaining = await getRemainingTicketCount(
    { id: 'event_2', capacity: 80 },
    {
      countTicketsByEventId: async () => 18,
    }
  );

  assert.equal(remaining, 62);
});

test('sendDiscordTicketNotification posts buyer name and remaining tickets through the Discord bot API', async () => {
  const requests = [];

  const result = await sendDiscordTicketNotification(
    { id: 'ticket_5', customer_name: 'Ada' },
    { id: 'event_5', name: 'Launch', square_variation_id: 'var_launch' },
    'Ada',
    {
      getBaseConfig: () => ({
        discordBotToken: 'bot-token-123',
        discordTicketChannelId: 'channel-456',
      }),
      getVariationInventory: async () => ({ available: 12 }),
      fetchImpl: async (url, options) => {
        requests.push({ url, options });
        return { ok: true, status: 204 };
      },
    }
  );

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://discord.com/api/v10/channels/channel-456/messages');
  assert.equal(requests[0].options.headers.Authorization, 'Bot bot-token-123');
  assert.match(JSON.parse(requests[0].options.body).content, /Ada bought a ticket for Launch\. 12 tickets left\./);
  assert.equal(result.remainingTickets, 12);
});
