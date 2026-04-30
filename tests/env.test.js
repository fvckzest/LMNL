import test from 'node:test';
import assert from 'node:assert/strict';
import { getApplePassConfig, getBaseConfig, getResendConfig, getSquareConfig, getSupabaseConfig } from '../api/_lib/env.js';

test('getBaseConfig provides stable defaults', () => {
  delete process.env.SITE_URL;
  delete process.env.SQUARE_WEBHOOK_URL;

  const config = getBaseConfig();
  assert.equal(config.siteUrl, 'https://lmnl.art');
  assert.equal(config.squareWebhookUrl, 'https://lmnl.art/api/square-webhook');
});

test('getSquareConfig reads sandbox token', () => {
  process.env.SQUARE_ENVIRONMENT = 'sandbox';
  process.env.SQUARE_ACCESS_TOKEN = 'sandbox-token';

  const config = getSquareConfig();
  assert.equal(config.environment, 'sandbox');
  assert.equal(config.token, 'sandbox-token');
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

  const config = getApplePassConfig();
  assert.equal(config.passTypeIdentifier, 'pass.type');
  assert.equal(config.teamIdentifier, 'team-id');
  assert.equal(config.certificateBase64, 'base64-cert');
});
