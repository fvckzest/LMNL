import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildArtistInterestDiscordEmbed,
  buildInquiryDiscordEmbed,
  getRemainingTicketCount,
  sendDiscordIntakeNotification,
  sendDiscordTicketNotification,
} from '../api/_lib/services/discord.js';

test('getRemainingTicketCount prefers Square inventory when variation is present', async () => {
  const remaining = await getRemainingTicketCount(
    { id: 'event_1', capacity: 50, square_variation_id: 'var_1' },
    {
      getVariationInventory: async () => ({ available: 7 }),
      countTicketsByEventId: async () => 49,
    },
  );

  assert.equal(remaining, 7);
});

test('getRemainingTicketCount falls back to event capacity minus issued tickets', async () => {
  const remaining = await getRemainingTicketCount(
    { id: 'event_2', capacity: 80 },
    {
      countTicketsByEventId: async () => 18,
    },
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
    },
  );

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://discord.com/api/v10/channels/channel-456/messages');
  assert.equal(requests[0].options.headers.Authorization, 'Bot bot-token-123');
  assert.match(JSON.parse(requests[0].options.body).content, /Ada bought a ticket for Launch\. 12 tickets left\./);
  assert.equal(result.remainingTickets, 12);
});

test('buildInquiryDiscordEmbed maps general contact inquiries into an embed payload', () => {
  const embed = buildInquiryDiscordEmbed({
    id: 'inq_1',
    name: 'Alex',
    email: 'alex@example.com',
    notes: 'SUBJECT: Partnership\n\nHello there',
    selected_services: ['general'],
    created_at: '2026-05-12T12:00:00.000Z',
  });

  assert.equal(embed.title, 'New Contact Intake');
  assert.equal(embed.color, 0x90e937);
  assert.equal(embed.timestamp, '2026-05-12T12:00:00.000Z');
  assert.deepEqual(embed.fields[2], {
    name: 'Inquiry Type',
    value: 'General contact',
    inline: true,
  });
});

test('buildInquiryDiscordEmbed uses the services page purple for service inquiries', () => {
  const embed = buildInquiryDiscordEmbed({
    id: 'inq_2',
    name: 'Maya',
    email: 'maya@example.com',
    notes: 'Need support for a launch.',
    selected_services: ['DESIGN', 'PRODUCTION'],
    created_at: '2026-05-12T12:30:00.000Z',
  });

  assert.equal(embed.title, 'New Service Inquiry');
  assert.equal(embed.color, 0x7b52d6);
  assert.deepEqual(embed.fields[2], {
    name: 'Inquiry Type',
    value: 'Service inquiry',
    inline: true,
  });
});

test('buildArtistInterestDiscordEmbed maps artist interest submissions into an embed payload', () => {
  const embed = buildArtistInterestDiscordEmbed({
    id: 'artist_1',
    name: 'Nova',
    email: 'nova@example.com',
    project_name: 'Signal',
    location: 'Los Angeles',
    practice: 'Performance art',
    format: 'Live installation',
    links: 'https://example.com',
    notes: 'Current work in progress.',
    created_at: '2026-05-12T13:00:00.000Z',
  });

  assert.equal(embed.title, 'New Artist Interest Submission');
  assert.equal(embed.color, 0xff5bb8);
  assert.equal(embed.timestamp, '2026-05-12T13:00:00.000Z');
  assert.deepEqual(embed.fields[4], {
    name: 'Practice',
    value: 'Performance art',
    inline: false,
  });
});

test('sendDiscordIntakeNotification posts embeds through the configured intake channel', async () => {
  const requests = [];

  const result = await sendDiscordIntakeNotification(
    {
      title: 'New Service Inquiry',
      color: 0x90e937,
      fields: [
        { name: 'Name', value: 'Alex', inline: true },
        { name: 'Email', value: 'alex@example.com', inline: true },
      ],
      footer: { text: 'Inquiry ID: inq_1' },
      timestamp: '2026-05-12T14:00:00.000Z',
    },
    {
      getBaseConfig: () => ({
        discordBotToken: 'bot-token-123',
        discordIntakeChannelId: 'channel-999',
      }),
      fetchImpl: async (url, options) => {
        requests.push({ url, options });
        return { ok: true, status: 200 };
      },
    },
  );

  assert.equal(result.success, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://discord.com/api/v10/channels/channel-999/messages');
  const payload = JSON.parse(requests[0].options.body);
  assert.equal(payload.embeds[0].title, 'New Service Inquiry');
  assert.equal(payload.embeds[0].fields[0].name, 'Name');
  assert.equal(payload.embeds[0].footer.text, 'Inquiry ID: inq_1');
});

test('sendDiscordIntakeNotification times out when Discord does not respond', async () => {
  await assert.rejects(
    () => sendDiscordIntakeNotification(
      {
        title: 'New Service Inquiry',
        color: 0x7b52d6,
        fields: [{ name: 'Name', value: 'Alex', inline: true }],
      },
      {
        getBaseConfig: () => ({
          discordBotToken: 'bot-token-123',
          discordIntakeChannelId: 'channel-999',
        }),
        discordTimeoutMs: 20,
        fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
      },
    ),
    (error) => error?.code === 'DISCORD_BOT_MESSAGE_TIMEOUT',
  );
});
