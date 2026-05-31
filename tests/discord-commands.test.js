import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  completeDeferredDiscordInteraction,
  createDeferredDiscordResponse,
  discordCommandDefinitions,
  handleDiscordInteraction,
  shouldDeferDiscordInteraction,
  verifyDiscordInteractionSignature,
} from '../api/_lib/services/discord-commands.js';
import { AppError } from '../api/_lib/errors.js';

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
    ['ping', 'help', 'rate', 'tickets-left', 'ticket', 'test-intake', 'approve', 'deny'],
  );

  const approveCommand = discordCommandDefinitions.find((command) => command.name === 'approve');
  assert.equal(approveCommand.default_member_permissions, '32');
  assert.equal(approveCommand.dm_permission, false);
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
  assert.match(response.data.content, /\/rate/);
  assert.match(response.data.content, /\/tickets-left/);
  assert.match(response.data.content, /\/ticket/);
  assert.match(response.data.content, /\/approve/);
  assert.match(response.data.content, /\/deny/);
});

test('handleDiscordInteraction rates a tagged user with a random number', async () => {
  const response = await handleDiscordInteraction(
    {
      type: 2,
      data: {
        name: 'rate',
        options: [{ name: 'name', value: '1234567890' }],
      },
    },
    {
      randomImpl: () => 0.73,
    },
  );

  assert.equal(response.type, 4);
  assert.equal(response.data.content, '<@1234567890> gets a 73');
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

test('handleDiscordInteraction approves invite requests by id', async () => {
  const calls = [];
  const response = await handleDiscordInteraction(
    {
      type: 2,
      data: {
        name: 'approve',
        options: [{ name: 'request_id', value: 'req_approve' }],
      },
    },
    {
      approveRequestAndSendCheckout: async (requestId) => {
        calls.push(requestId);
        return {
          status: 'approved',
          checkoutUrl: 'https://checkout.example.com',
          request: { customer_name: 'Jordan Ellis' },
        };
      },
    },
  );

  assert.equal(response.type, 4);
  assert.equal(response.data.flags, undefined);
  assert.equal(response.data.content, 'Approved Jordan Ellis.');
  assert.deepEqual(calls, ['req_approve']);
});

test('approve commands are deferred and update the original Discord response', async () => {
  const requests = [];
  const interaction = {
    application_id: 'app_1',
    token: 'token_1',
    type: 2,
    data: {
      name: 'approve',
      options: [{ name: 'request_id', value: 'req_approve' }],
    },
  };

  assert.equal(shouldDeferDiscordInteraction(interaction), true);
  assert.deepEqual(createDeferredDiscordResponse(), { type: 5 });

  await completeDeferredDiscordInteraction(interaction, {
    approveRequestAndSendCheckout: async () => ({
      status: 'approved',
      request: { customer_name: 'Jordan Ellis' },
    }),
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, status: 200 };
    },
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://discord.com/api/v10/webhooks/app_1/token_1/messages/@original');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    content: 'Approved Jordan Ellis.',
  });
});

test('deferred approve failures include safe app error messages', async () => {
  const requests = [];
  const interaction = {
    application_id: 'app_1',
    token: 'token_1',
    type: 2,
    data: {
      name: 'approve',
      options: [{ name: 'request_id', value: 'missing_request' }],
    },
  };

  await completeDeferredDiscordInteraction(interaction, {
    approveRequestAndSendCheckout: async () => {
      throw new AppError('Request not found.', {
        status: 404,
        expose: true,
      });
    },
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, status: 200 };
    },
  });

  assert.equal(requests.length, 1);
  assert.equal(
    JSON.parse(requests[0].options.body).content,
    'Approval failed. Request not found. Please try again or approve from the admin dashboard.',
  );
});

test('deferred approve recovers when the request was approved before an error', async () => {
  const requests = [];
  const interaction = {
    application_id: 'app_1',
    token: 'token_1',
    type: 2,
    data: {
      name: 'approve',
      options: [{ name: 'request_id', value: 'req_approved' }],
    },
  };

  await completeDeferredDiscordInteraction(interaction, {
    approveRequestAndSendCheckout: async () => {
      throw new AppError('Discord response update failed.', {
        status: 502,
        expose: true,
      });
    },
    getRequestById: async (requestId) => ({
      id: requestId,
      status: 'approved',
      customer_name: 'Jordan Ellis',
    }),
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, status: 200 };
    },
  });

  assert.equal(requests.length, 1);
  assert.equal(
    JSON.parse(requests[0].options.body).content,
    'Approved Jordan Ellis.',
  );
});

test('handleDiscordInteraction denies invite requests by id', async () => {
  const calls = [];
  const response = await handleDiscordInteraction(
    {
      type: 2,
      data: {
        name: 'deny',
        options: [{ name: 'request_id', value: 'req_deny' }],
      },
    },
    {
      updateRequestStatus: async (requestId, status) => {
        calls.push([requestId, status]);
        return { id: requestId, status, customer_name: 'Maya Chen' };
      },
    },
  );

  assert.equal(response.type, 4);
  assert.equal(response.data.flags, 64);
  assert.equal(response.data.content, 'Denied Maya Chen.');
  assert.deepEqual(calls, [['req_deny', 'rejected']]);
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

test('handleDiscordInteraction previews the invite request intake embed', async () => {
  const response = await handleDiscordInteraction({
    type: 2,
    data: {
      name: 'test-intake',
      options: [{ name: 'form', value: 'invite' }],
    },
  });

  assert.equal(response.type, 4);
  assert.equal(response.data.flags, undefined);
  assert.match(response.data.content, /event invite request intake embed/i);
  assert.equal(response.data.embeds[0].title, 'New Event Invite Request');
});
