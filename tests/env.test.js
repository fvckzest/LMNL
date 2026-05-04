import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getApplePassConfig, getApplePassConfigMissingFields, getBaseConfig, getResendConfig, getSquareConfig, getSupabaseConfig } from '../api/_lib/env.js';

test('getBaseConfig provides stable defaults', () => {
  delete process.env.SITE_URL;
  delete process.env.SQUARE_WEBHOOK_URL;
  delete process.env.DISCORD_APPLICATION_ID;
  delete process.env.DISCORD_BOT_TOKEN;
  delete process.env.DISCORD_PUBLIC_KEY;
  delete process.env.DISCORD_TICKET_CHANNEL_ID;

  const config = getBaseConfig();
  assert.equal(config.siteUrl, 'https://lmnl.art');
  assert.equal(config.squareWebhookUrl, 'https://lmnl.art/api/square-webhook');
  assert.equal(config.discordApplicationId, '');
  assert.equal(config.discordBotToken, '');
  assert.equal(config.discordPublicKey, '');
  assert.equal(config.discordTicketChannelId, '');
});

test('getSquareConfig reads sandbox token', () => {
  process.env.SQUARE_ENVIRONMENT = 'sandbox';
  process.env.SQUARE_ACCESS_TOKEN = 'sandbox-token';
  process.env.SQUARE_SANDBOX_APPLICATION_ID = 'sandbox-app';

  const config = getSquareConfig();
  assert.equal(config.environment, 'sandbox');
  assert.equal(config.token, 'sandbox-token');
  assert.equal(config.applicationId, 'sandbox-app');
});

test('getSquareConfig throws when application id is missing', () => {
  process.env.SQUARE_ENVIRONMENT = 'production';
  process.env.SQUARE_PROD_ACCESS_TOKEN = 'prod-token';
  delete process.env.SQUARE_PROD_APPLICATION_ID;
  delete process.env.SQUARE_APPLICATION_ID;

  assert.throws(() => getSquareConfig(), /Square application ID is missing/);
});

test('getSupabaseConfig throws when service credentials are missing', () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;

  assert.throws(() => getSupabaseConfig(), /Supabase service credentials are missing/);
});

test('getResendConfig returns API key', () => {
  process.env.RESEND_API_KEY = 're_test';
  assert.equal(getResendConfig().apiKey, 're_test');
});

test('getApplePassConfig reads optional configuration', () => {
  process.env.APPLE_PASS_TYPE_IDENTIFIER = 'pass.type';
  process.env.APPLE_TEAM_ID = 'team-id';
  process.env.APPLE_PASS_CERTIFICATE = 'base64-cert';
  process.env.APPLE_PASS_CERTIFICATE_PASSWORD = 'secret';

  const config = getApplePassConfig();
  assert.equal(config.passTypeIdentifier, 'pass.type');
  assert.equal(config.teamIdentifier, 'team-id');
  assert.equal(config.certificateBase64, 'base64-cert');
  assert.equal(config.certificatePassword, 'secret');
});

test('getApplePassConfig can load certificate contents from a file path', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lmnl-pass-'));
  const certPath = path.join(tempDir, 'wallet-cert.txt');
  fs.writeFileSync(certPath, 'file-based-cert\n');

  delete process.env.APPLE_PASS_CERTIFICATE;
  process.env.APPLE_PASS_CERTIFICATE_PATH = certPath;

  const config = getApplePassConfig();
  assert.equal(config.certificateBase64, 'file-based-cert');
  assert.equal(config.certificatePath, certPath);

  fs.rmSync(tempDir, { recursive: true, force: true });
  delete process.env.APPLE_PASS_CERTIFICATE_PATH;
});

test('getApplePassConfigMissingFields reports the missing wallet inputs', () => {
  delete process.env.APPLE_PASS_TYPE_IDENTIFIER;
  delete process.env.APPLE_TEAM_ID;
  delete process.env.APPLE_PASS_CERTIFICATE;
  delete process.env.APPLE_PASS_CERTIFICATE_PATH;

  assert.deepEqual(getApplePassConfigMissingFields(), [
    'APPLE_PASS_TYPE_IDENTIFIER',
    'APPLE_TEAM_ID',
    'APPLE_PASS_CERTIFICATE or APPLE_PASS_CERTIFICATE_PATH',
  ]);
});
