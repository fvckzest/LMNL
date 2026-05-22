import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPassVisualCustomization,
  applyPassTimingCustomization,
  buildPassOverrides,
  getWalletPassConfig,
} from '../api/_lib/services/passkit-customization.js';

test('getWalletPassConfig does not use the event image as wallet strip art by default', () => {
  const config = getWalletPassConfig({
    name: 'SPACE',
    location_name: 'LMNL COMPOUND',
    address: '123 Main St, Los Angeles, CA 90012',
    image_url: 'https://cdn.example.com/default-strip.png',
    metadata: {},
  });

  assert.equal(config.stripImageUrl, '');
  assert.equal(config.logoText, 'SPACE');
  assert.equal(config.description, 'LMNL Event Ticket');
  assert.equal(config.locationValue, 'LMNL COMPOUND');
  assert.equal(config.entranceCoordinatesValue, '123 Main St, Los Angeles, CA 90012');
  assert.equal(config.entranceValueLabel, 'ADDRESS');
});

test('getWalletPassConfig uses an explicit wallet strip image when configured', () => {
  const config = getWalletPassConfig({
    name: 'SPACE',
    metadata: {
      wallet_strip_image_url: 'https://cdn.example.com/custom-strip.png',
    },
  });

  assert.equal(config.stripImageUrl, 'https://cdn.example.com/custom-strip.png');
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
  assert.equal(config.displayDate, 'August 21-22 2026');
  assert.equal(config.isMultiDay, true);
});

test('getWalletPassConfig formats single-day event dates as m.dd.yy', () => {
  const config = getWalletPassConfig({
    event_date: '2026-08-03',
    event_time: '13:00',
    metadata: {},
  });

  assert.equal(config.displayDate, '8.3.26');
  assert.equal(config.isMultiDay, false);
});

test('getWalletPassConfig formats structured event addresses for the wallet location field', () => {
  const config = getWalletPassConfig({
    location_name: 'LMNL COMPOUND',
    metadata: {},
    address: {
      addressLine1: '123 Main St',
      addressLine2: 'Suite B',
      locality: 'Los Angeles',
      administrativeDistrictLevel1: 'CA',
      postalCode: '90012',
      country: 'US',
    },
  });

  assert.equal(config.locationValue, 'LMNL COMPOUND');
  assert.equal(config.entranceCoordinatesValue, '123 Main St\nSuite B\nLos Angeles, CA, 90012\nUS');
  assert.equal(config.entranceValueLabel, 'ADDRESS');
});

test('getWalletPassConfig exposes optional entrance coordinates metadata when valid', () => {
  const config = getWalletPassConfig({
    name: 'SPACE',
    metadata: {
      wallet_latitude: '34.052235',
      wallet_longitude: '-118.243683',
      wallet_relevant_text: 'Use the east entrance.',
      wallet_maps_label: 'SPACE Entrance',
    },
  });

  assert.equal(config.entranceCoordinatesLabel, 'COORDS');
  assert.equal(config.entranceCoordinatesValue, '34.052235, -118.243683');
  assert.equal(config.entranceValueLabel, 'COORDS');
  assert.equal(
    config.entranceMapsUrl,
    'https://maps.apple.com/?ll=34.052235,-118.243683&q=SPACE%20Entrance'
  );
  assert.deepEqual(config.passLocations, [
    {
      latitude: 34.052235,
      longitude: -118.243683,
      relevantText: 'Use the east entrance.',
    },
  ]);
});

test('getWalletPassConfig parses combined wallet coordinates with direction letters', () => {
  const config = getWalletPassConfig({
    name: 'SPACE',
    metadata: {
      wallet_coordinates: '34.052235 N, 118.243683 W',
      wallet_relevant_text: 'Use the east entrance.',
      wallet_maps_label: 'SPACE Entrance',
    },
  });

  assert.equal(config.entranceCoordinatesLabel, 'COORDS');
  assert.equal(config.entranceCoordinatesValue, '34.052235, -118.243683');
  assert.equal(
    config.entranceMapsUrl,
    'https://maps.apple.com/?ll=34.052235,-118.243683&q=SPACE%20Entrance'
  );
  assert.deepEqual(config.passLocations, [
    {
      latitude: 34.052235,
      longitude: -118.243683,
      relevantText: 'Use the east entrance.',
    },
  ]);
});

test('getWalletPassConfig ignores entrance coordinates when either coordinate is invalid', () => {
  const config = getWalletPassConfig({
    name: 'SPACE',
    metadata: {
      wallet_latitude: '34.052235',
      wallet_longitude: 'west',
      wallet_relevant_text: 'Use the east entrance.',
    },
  });

  assert.equal(config.entranceCoordinatesLabel, '');
  assert.equal(config.entranceCoordinatesValue, '');
  assert.equal(config.entranceMapsUrl, '');
  assert.deepEqual(config.passLocations, []);
});

test('getWalletPassConfig falls back to separate coordinates when combined value is invalid', () => {
  const config = getWalletPassConfig({
    name: 'SPACE',
    metadata: {
      wallet_coordinates: 'west side entrance',
      wallet_latitude: '34.052235',
      wallet_longitude: '-118.243683',
    },
  });

  assert.equal(config.entranceCoordinatesLabel, 'COORDS');
  assert.equal(config.entranceCoordinatesValue, '34.052235, -118.243683');
  assert.deepEqual(config.passLocations, [
    {
      latitude: 34.052235,
      longitude: -118.243683,
    },
  ]);
});

test('getWalletPassConfig leaves wallet location blank when no override or address exists', () => {
  const config = getWalletPassConfig({
    name: 'SPACE',
    metadata: {},
  });

  assert.equal(config.locationValue, '');
  assert.equal(config.entranceCoordinatesValue, '');
  assert.equal(config.entranceValueLabel, '');
});

test('applyPassTimingCustomization falls back to the single event date/time when no custom windows exist', () => {
  const calls = {
    locations: null,
    relevantDates: null,
    expirationDate: null,
  };

  applyPassTimingCustomization(
    {
      setLocations(...value) {
        calls.locations = value;
      },
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

  assert.equal(calls.locations, null);
  assert.deepEqual(calls.relevantDates, [
    {
      relevantDate: '2026-09-03T21:30:00-07:00',
    },
  ]);
  assert.equal(calls.expirationDate, null);
});

test('applyPassTimingCustomization adds wallet locations when entrance coordinates are valid', () => {
  const calls = {
    locations: null,
    relevantDates: null,
    expirationDate: null,
  };

  applyPassTimingCustomization(
    {
      setLocations(...value) {
        calls.locations = value;
      },
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
      metadata: {
        wallet_latitude: '34.052235',
        wallet_longitude: '-118.243683',
        wallet_relevant_text: 'Use the east entrance.',
      },
    },
  );

  assert.deepEqual(calls.locations, [
    {
      latitude: 34.052235,
      longitude: -118.243683,
      relevantText: 'Use the east entrance.',
    },
  ]);
  assert.deepEqual(calls.relevantDates, [
    {
      relevantDate: '2026-09-03T21:30:00-07:00',
    },
  ]);
  assert.equal(calls.expirationDate, null);
});

test('applyPassVisualCustomization adds an Apple Maps entry link on the back when coordinates are valid', async () => {
  const pass = {
    backFields: [],
    addBuffer() {
      throw new Error('strip image should not be added in this test');
    },
  };

  await applyPassVisualCustomization(pass, {
    name: 'SPACE',
    metadata: {
      wallet_latitude: '34.052235',
      wallet_longitude: '-118.243683',
      wallet_maps_label: 'SPACE Entrance',
    },
  });

  assert.deepEqual(pass.backFields, [
    {
      key: 'entranceMap',
      label: 'ENTRY MAP',
      value: 'https://maps.apple.com/?ll=34.052235,-118.243683&q=SPACE%20Entrance',
    },
  ]);
});
