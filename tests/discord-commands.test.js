import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  discordCommandDefinitions,
  handleDiscordInteraction,
  verifyDiscordInteractionSignature,
} from '../api/_lib/services/discord-commands.js';

test('verifyDiscordInteractionSignature accepts a valid Ed25519 signature', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const rawPublicKey = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
  const timestamp = String(Date.now());
  const rawBody = JSON.stringify({ type: 1 });
  const signature = crypto.sign(null, Buffer.from(`${timestamp}${rawBody}`), privateKey).toString('hex');

  const isValid = verifyDiscordInteractionSignature({
    signature,
    timestamp,
    rawBody,
    publicKey: rawPublicKey,
  });

  assert.equal(isValid, true);
});

test('discord command definitions include the default LMNL slash commands', () => {
  assert.deepEqual(
    discordCommandDefinitions.map((command) => command.name),
    ['ping', 'help', 'tickets-left', 'ticket', 'test-intake'],
  );
});

test('handleDiscordInteraction responds to ping commands', async () => {
  const response = await handleDiscordInteraction({
    type: 2,
    data: { name: 'ping' },
  });

  assert.equal(response.type, 4);
  assert.match(response.data.content, /Pong/);
});

test('handleDiscordInteraction lists commands in help', async () => {
  const response = await handleDiscordInteraction({
    type: 2,
    data: { name: 'help' },
  });

  assert.match(response.data.content, /\/ping/);
  assert.match(response.data.content, /\/tickets-left/);
  assert.match(response.data.content, /\/ticket/);
});

test('handleDiscordInteraction resolves remaining tickets for an event', async () => {
  const response = await handleDiscordInteraction(
    {
      type: 2,
      data: {
        name: 'tickets-left',
        options: [{ name: 'event', value: 'Launch' }],
      },
    },
    {
      getLatestEventByName: async () => ({ id: 'event_1', name: 'Launch' }),
      getRemainingTicketCount: async () => 12,
    },
  );

  assert.equal(response.type, 4);
  assert.match(response.data.content, /Launch: 12 tickets left/);
});

test('handleDiscordInteraction resolves tickets sold for an event title', async () => {
  const response = await handleDiscordInteraction(
    {
      type: 2,
      data: {
        name: 'ticket',
        options: [{ name: 'event_title', value: 'Launch' }],
      },
    },
    {
      getLatestEventByName: async () => ({ id: 'event_1', name: 'Launch' }),
      countTicketsByEventId: async () => 34,
    },
  );

  assert.equal(response.type, 4);
  assert.match(response.data.content, /Launch: 34 tickets sold/);
});

test('handleDiscordInteraction previews the contact intake embed', async () => {
  const response = await handleDiscordInteraction({
    type: 2,
    data: {
      name: 'test-intake',
      options: [{ name: 'form', value: 'contact' }],
    },
  });

  assert.equal(response.type, 4);
  assert.equal(response.data.flags, undefined);
  assert.match(response.data.content, /contact form intake embed/i);
  assert.equal(response.data.embeds[0].title, 'New Contact Intake');
});

test('handleDiscordInteraction previews the service intake embed', async () => {
  const response = await handleDiscordInteraction({
    type: 2,
    data: {
      name: 'test-intake',
      options: [{ name: 'form', value: 'service' }],
    },
  });

  assert.equal(response.type, 4);
  assert.equal(response.data.flags, undefined);
  assert.equal(response.data.embeds[0].title, 'New Service Inquiry');
});

test('handleDiscordInteraction previews the artist intake embed', async () => {
  const response = await handleDiscordInteraction({
    type: 2,
    data: {
      name: 'test-intake',
      options: [{ name: 'form', value: 'artist' }],
    },
  });

  assert.equal(response.type, 4);
  assert.equal(response.data.flags, undefined);
  assert.equal(response.data.embeds[0].title, 'New Artist Interest Submission');
});
