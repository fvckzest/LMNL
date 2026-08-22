import test from 'node:test';
import assert from 'node:assert/strict';
import { getPublicEventPage } from '../api/_lib/services/public-event-page.js';

const spaceEvent = {
  id: 'event_space',
  name: 'SPACE',
  image_url: '/space-logo.png',
  event_date: '2026-09-19',
  event_time: '8:00 PM',
  description: 'A night built around sound, art, and shared space.',
  location_name: 'LMNL Space',
  address: '123 Example Street, Tacoma, WA',
  price: 2500,
  is_private: false,
  capacity: 80,
  status: 'active',
  metadata: {
    event_link: '/space',
    performers: 'Artist One, Artist Two',
  },
};

test('getPublicEventPage resolves Space from the existing published event record', async () => {
  const page = await getPublicEventPage('space', {
    listPublicEvents: async () => [spaceEvent],
  });

  assert.equal(page.event.id, 'event_space');
  assert.equal(page.event.slug, 'space');
  assert.equal(page.event.organizerCredit, 'LMNL');
  assert.deepEqual(page.event.lineup, ['Artist One', 'Artist Two']);
  assert.equal(page.event.displayPrice, '$25.00');
  assert.deepEqual(page.event.ticketAction, {
    endpoint: '/api/create-event-checkout',
    eventId: 'event_space',
    enabled: true,
    label: 'Get ticket',
  });
});

test('getPublicEventPage resolves the shareholder meeting from its CRUD event link', async () => {
  const shareholderMeeting = {
    ...spaceEvent,
    id: 'event_shareholder_meeting',
    name: '2026 Annual Shareholder Meeting',
    event_date: '2026-10-03',
    event_time: '19:00',
    location_name: 'Mad Hat Tea',
    address: '924 Broadway, Tacoma, Washington',
    price: 1000,
    metadata: {
      event_link: '/events/shareholder-meeting',
    },
  };

  const page = await getPublicEventPage('shareholder-meeting', {
    listPublicEvents: async () => [shareholderMeeting],
  });

  assert.equal(page.event.id, 'event_shareholder_meeting');
  assert.equal(page.event.slug, 'shareholder-meeting');
  assert.equal(page.event.displayPrice, '$10.00');
  assert.equal(page.event.ticketAction.eventId, 'event_shareholder_meeting');
});

test('getPublicEventPage returns not found for unknown, draft, archived, or private slugs', async () => {
  const hiddenEvents = [
    { ...spaceEvent, id: 'draft', name: 'Draft', status: 'draft', metadata: { event_slug: 'draft' } },
    { ...spaceEvent, id: 'archived', name: 'Archived', status: 'archived', metadata: { event_slug: 'archived' } },
    { ...spaceEvent, id: 'private', name: 'Private', is_private: true, metadata: { event_slug: 'private' } },
  ];

  for (const slug of ['missing', 'draft', 'archived', 'private']) {
    await assert.rejects(
      getPublicEventPage(slug, { listPublicEvents: async () => hiddenEvents }),
      (error) => error.code === 'EVENT_PAGE_NOT_FOUND' && error.status === 404,
    );
  }
});

test('getPublicEventPage exposes an unavailable event without an active ticket action', async () => {
  const page = await getPublicEventPage('space', {
    listPublicEvents: async () => [{ ...spaceEvent, status: 'sold_out' }],
  });

  assert.equal(page.event.availability, 'Sold out');
  assert.deepEqual(page.event.ticketAction, {
    endpoint: '/api/create-event-checkout',
    eventId: 'event_space',
    enabled: false,
    label: 'Sold out',
  });
});

test('getPublicEventPage keeps a past published event visible with unavailable status', async () => {
  const page = await getPublicEventPage('space', {
    listPublicEvents: async () => [{ ...spaceEvent, status: 'past' }],
  });

  assert.equal(page.event.availability, 'Tickets unavailable');
  assert.equal(page.event.ticketAction.enabled, false);
});

test('getPublicEventPage uses current Square inventory for availability and price', async () => {
  const page = await getPublicEventPage('space', {
    listPublicEvents: async () => [{
      ...spaceEvent,
      price: 2000,
      square_variation_id: 'variation_space',
    }],
    getVariationInventory: async () => ({
      available: 0,
      price: 3000,
    }),
  });

  assert.equal(page.event.availability, 'Sold out');
  assert.equal(page.event.displayPrice, '$30.00');
  assert.equal(page.event.ticketAction.enabled, false);
});

test('getPublicEventPage can skip live inventory for metadata-only event rendering', async () => {
  let inventoryLookupCount = 0;
  const page = await getPublicEventPage('space', {
    includeInventory: false,
    listPublicEvents: async () => [{
      ...spaceEvent,
      square_variation_id: 'variation_space',
    }],
    getVariationInventory: async () => {
      inventoryLookupCount += 1;
      return { available: 0, price: 3000 };
    },
  });

  assert.equal(inventoryLookupCount, 0);
  assert.equal(page.event.name, 'SPACE');
});

test('getPublicEventPage shows only explicitly approved Powered by LMNL events', async () => {
  const approved = {
    ...spaceEvent,
    id: 'supported_1',
    name: 'Approved Partner Night',
    metadata: {
      event_slug: 'approved-partner-night',
      powered_by_lmnl_approved: true,
      organizer_credit: 'Partner Organizer',
    },
  };
  const unapproved = {
    ...spaceEvent,
    id: 'unapproved_1',
    name: 'Unapproved Partner Night',
    metadata: {
      event_slug: 'unapproved-partner-night',
      powered_by_lmnl_approved: false,
    },
  };

  const page = await getPublicEventPage('space', {
    listPublicEvents: async () => [spaceEvent, approved, unapproved],
  });

  assert.equal(page.showcase.state, 'ready');
  assert.deepEqual(page.showcase.events.map((event) => event.id), ['supported_1']);
  assert.equal(page.showcase.events[0].organizerCredit, 'Partner Organizer');
});

test('getPublicEventPage returns an honest empty showcase when no event is approved', async () => {
  const page = await getPublicEventPage('space', {
    listPublicEvents: async () => [spaceEvent],
  });

  assert.deepEqual(page.showcase, {
    state: 'empty',
    events: [],
    message: 'No additional approved events are published yet.',
  });
});
