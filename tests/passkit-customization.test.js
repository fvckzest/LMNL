import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPassOverrides, getWalletPassConfig } from '../api/_lib/services/passkit-customization.js';

test('getWalletPassConfig falls back to event defaults', () => {
  const config = getWalletPassConfig({
    name: 'SPACE',
    location_name: 'LMNL COMPOUND',
    image_url: 'https://cdn.example.com/default-strip.png',
    metadata: {},
  });

  assert.equal(config.stripImageUrl, 'https://cdn.example.com/default-strip.png');
  assert.equal(config.logoText, 'SPACE');
  assert.equal(config.description, 'LMNL Event Ticket');
  assert.equal(config.primaryValue, '');
  assert.equal(config.locationValue, 'LMNL COMPOUND');
});

test('buildPassOverrides prefers per-event wallet metadata', () => {
  const overrides = buildPassOverrides(
    { id: 'ticket_123' },
    {
      name: 'SPACE',
      location_name: 'LMNL COMPOUND',
      metadata: {
        wallet_logo_text: 'SPACE NIGHT',
        wallet_description: 'Invitation Only',
        wallet_background_color: 'rgb(10, 10, 10)',
        wallet_foreground_color: 'rgb(255, 255, 255)',
        wallet_label_color: 'rgb(180, 180, 180)',
        wallet_primary_override: 'MIDNIGHT SESSION',
        wallet_location_override: 'SECRET ROOM',
      },
    },
    { passTypeIdentifier: 'pass.art.lmnl', teamIdentifier: 'TEAM123' }
  );

  assert.deepEqual(overrides, {
    passTypeIdentifier: 'pass.art.lmnl',
    teamIdentifier: 'TEAM123',
    serialNumber: 'ticket_123',
    description: 'Invitation Only',
    logoText: 'SPACE NIGHT',
    backgroundColor: 'rgb(10, 10, 10)',
    foregroundColor: 'rgb(255, 255, 255)',
    labelColor: 'rgb(180, 180, 180)',
  });
});
