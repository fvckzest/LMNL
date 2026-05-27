import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST } from '../app/api/[...route]/route.js';

test('Next API adapter preserves catch-all route resolution', async () => {
  const request = new Request('https://lmnl.art/api/create-checkout', {
    method: 'GET',
  });
  const response = await GET(request, {
    params: Promise.resolve({ route: ['create-checkout'] }),
  });
  const payload = await response.json();

  assert.equal(response.status, 405);
  assert.equal(payload.success, false);
  assert.equal(payload.error.code, 'METHOD_NOT_ALLOWED');
});

test('Next API adapter preserves JSON body parsing errors', async () => {
  const request = new Request('https://lmnl.art/api/square-webhook', {
    method: 'POST',
    body: '{"type":',
    headers: {
      'content-type': 'application/json',
    },
  });
  const response = await POST(request, {
    params: Promise.resolve({ route: ['square-webhook'] }),
  });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.success, false);
  assert.equal(payload.error.code, 'INVALID_JSON');
});

test('Next API adapter preserves Square raw body for signature checks', async () => {
  process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = 'webhook-secret';
  process.env.SQUARE_WEBHOOK_URL = 'https://lmnl.art/api/square-webhook';

  try {
    const rawBody = '{\n  "type": "inventory.count.updated"\n}';
    const signature = crypto
      .createHmac('sha256', process.env.SQUARE_WEBHOOK_SIGNATURE_KEY)
      .update(`${process.env.SQUARE_WEBHOOK_URL}${rawBody}`)
      .digest('base64');
    const request = new Request('https://lmnl.art/api/square-webhook', {
      method: 'POST',
      body: rawBody,
      headers: {
        'content-type': 'application/json',
        'x-square-hmacsha256-signature': signature,
      },
    });
    const response = await POST(request, {
      params: Promise.resolve({ route: ['square-webhook'] }),
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.success, true);
    assert.equal(payload.data.ignored, true);
    assert.equal(payload.data.reason, 'Unhandled event type: inventory.count.updated');
  } finally {
    delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    delete process.env.SQUARE_WEBHOOK_URL;
  }
});

test('Next API adapter preserves Apple Wallet unavailable response', async () => {
  const previousAppleEnv = {
    APPLE_PASS_TYPE_IDENTIFIER: process.env.APPLE_PASS_TYPE_IDENTIFIER,
    APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
    APPLE_PASS_CERTIFICATE: process.env.APPLE_PASS_CERTIFICATE,
    APPLE_PASS_CERTIFICATE_PATH: process.env.APPLE_PASS_CERTIFICATE_PATH,
    APPLE_PASS_CERTIFICATE_PASSWORD: process.env.APPLE_PASS_CERTIFICATE_PASSWORD,
  };

  delete process.env.APPLE_PASS_TYPE_IDENTIFIER;
  delete process.env.APPLE_TEAM_ID;
  delete process.env.APPLE_PASS_CERTIFICATE;
  delete process.env.APPLE_PASS_CERTIFICATE_PATH;
  delete process.env.APPLE_PASS_CERTIFICATE_PASSWORD;

  try {
    const request = new Request('https://lmnl.art/api/generate-pass?ticketId=ticket-123', {
      method: 'GET',
    });
    const response = await GET(request, {
      params: Promise.resolve({ route: ['generate-pass'] }),
    });
    const payload = await response.json();

    assert.equal(response.status, 503);
    assert.equal(payload.success, false);
    assert.equal(payload.error.code, 'PASS_UNAVAILABLE');
    assert.match(payload.error.message, /Apple Wallet integration is unavailable/);
    assert.match(payload.error.message, /APPLE_PASS_TYPE_IDENTIFIER/);
    assert.match(payload.error.message, /APPLE_TEAM_ID/);
  } finally {
    for (const [key, value] of Object.entries(previousAppleEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});

test('Next API adapter preserves Discord interaction signature checks', async () => {
  const previousPublicKey = process.env.DISCORD_PUBLIC_KEY;
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  process.env.DISCORD_PUBLIC_KEY = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');

  try {
    const timestamp = String(Date.now());
    const rawBody = '{\n  "type": 1\n}';
    const signature = crypto
      .sign(null, Buffer.from(`${timestamp}${rawBody}`, 'utf8'), privateKey)
      .toString('hex');
    const request = new Request('https://lmnl.art/api/discord-interactions', {
      method: 'POST',
      body: rawBody,
      headers: {
        'content-type': 'application/json',
        'x-signature-ed25519': signature,
        'x-signature-timestamp': timestamp,
      },
    });
    const response = await POST(request, {
      params: Promise.resolve({ route: ['discord-interactions'] }),
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(payload, { type: 1 });
  } finally {
    if (previousPublicKey === undefined) {
      delete process.env.DISCORD_PUBLIC_KEY;
    } else {
      process.env.DISCORD_PUBLIC_KEY = previousPublicKey;
    }
  }
});

test('Next API adapter rejects invalid Discord interaction signatures', async () => {
  const previousPublicKey = process.env.DISCORD_PUBLIC_KEY;
  const { publicKey } = crypto.generateKeyPairSync('ed25519');
  process.env.DISCORD_PUBLIC_KEY = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');

  try {
    const request = new Request('https://lmnl.art/api/discord-interactions', {
      method: 'POST',
      body: '{"type":1}',
      headers: {
        'content-type': 'application/json',
        'x-signature-ed25519': '00',
        'x-signature-timestamp': String(Date.now()),
      },
    });
    const response = await POST(request, {
      params: Promise.resolve({ route: ['discord-interactions'] }),
    });
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.success, false);
    assert.equal(payload.error.code, 'DISCORD_SIGNATURE_INVALID');
  } finally {
    if (previousPublicKey === undefined) {
      delete process.env.DISCORD_PUBLIC_KEY;
    } else {
      process.env.DISCORD_PUBLIC_KEY = previousPublicKey;
    }
  }
});
