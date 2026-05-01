import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPassTimingCustomization,
  buildPassOverrides,
  getWalletPassConfig,
} from '../api/_lib/services/passkit-customization.js';

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

test('getWalletPassConfig parses multi-day wallet windows from event metadata', () => {
  const config = getWalletPassConfig({
    event_date: '2026-08-21',
    event_time: '13:00',
    metadata: {
      wallet_time_zone: 'America/Los_Angeles',
      wallet_relevant_dates: '2026-08-21T13:00/2026-08-21T23:00\n2026-08-22T13:00/2026-08-22T23:00',
    },
  });

  assert.deepEqual(config.relevantDates, [
    {
      startDate: '2026-08-21T13:00:00-07:00',
      endDate: '2026-08-21T23:00:00-07:00',
    },
    {
      startDate: '2026-08-22T13:00:00-07:00',
      endDate: '2026-08-22T23:00:00-07:00',
    },
  ]);
  assert.equal(config.expirationDate, '2026-08-22T23:00:00-07:00');
  assert.equal(config.displayDate, '08.21.2026 - 08.22.2026');
  assert.equal(config.isMultiDay, true);
});

test('applyPassTimingCustomization falls back to the single event date/time when no custom windows exist', () => {
  const calls = {
    relevantDates: null,
    expirationDate: null,
  };

  applyPassTimingCustomization(
    {
      setRelevantDates(value) {
        calls.relevantDates = value;
      },
      setExpirationDate(value) {
        calls.expirationDate = value;
      },
    },
    {
      event_date: '2026-09-03',
      event_time: '21:30',
      metadata: {},
    },
  );

  assert.deepEqual(calls.relevantDates, [
    {
      relevantDate: '2026-09-03T21:30:00-07:00',
    },
  ]);
  assert.equal(calls.expirationDate, null);
});
