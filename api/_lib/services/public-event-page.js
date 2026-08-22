import { AppError } from '../errors.js';
import { listPublicEvents as listEventRecords } from '../repositories/events.js';
import { getVariationInventory as loadVariationInventory } from './inventory.js';

const PUBLIC_STATUSES = new Set([
  'active',
  'published',
  'sold_out',
  'sold out',
  'cancelled',
  'canceled',
  'completed',
  'ended',
  'past',
]);

const SPACE_EVENT_NAMES = new Set(['space', 'lmnl-space']);

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeEventSlug(value) {
  return readString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readEventLinkSlug(event) {
  const eventLink = readString(event?.metadata?.event_link);
  const match = eventLink.match(/^\/events\/([^/?#]+)\/?(?:[?#].*)?$/i);

  if (match) {
    return normalizeEventSlug(match[1]);
  }

  if (eventLink.toLowerCase() === '/space') {
    return 'space';
  }

  return '';
}

export function getEventSlug(event) {
  const explicitSlug = normalizeEventSlug(event?.metadata?.event_slug);
  if (explicitSlug) return explicitSlug;

  const linkSlug = readEventLinkSlug(event);
  if (linkSlug) return linkSlug;

  const nameSlug = normalizeEventSlug(event?.name);
  if (SPACE_EVENT_NAMES.has(nameSlug)) return 'space';

  return nameSlug;
}

export function isPublishedPublicEvent(event) {
  if (!event || event.is_private === true) return false;
  if (event.metadata?.is_published === false) return false;

  const publicationStatus = readString(event.metadata?.publication_status).toLowerCase();
  if (publicationStatus && publicationStatus !== 'published') return false;

  const status = readString(event.status).toLowerCase();
  return PUBLIC_STATUSES.has(status);
}

function parseLineup(value) {
  if (Array.isArray(value)) {
    return value.map(readString).filter(Boolean);
  }

  return readString(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getOrganizerCredit(event, slug) {
  const explicitCredit = readString(
    event.metadata?.organizer_credit || event.metadata?.organizer,
  );

  if (explicitCredit) return explicitCredit;
  return slug === 'space' ? 'LMNL' : '';
}

function formatPrice(price) {
  const cents = Number(price);
  if (!Number.isFinite(cents) || cents < 0) return 'TBA';
  if (cents === 0) return 'Free';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function getAvailability(event) {
  const status = readString(event.status).toLowerCase();
  const availableTickets = Number(event.available_tickets);

  if (status === 'sold_out' || status === 'sold out' || availableTickets === 0) {
    return { label: 'Sold out', enabled: false };
  }

  if (status === 'cancelled' || status === 'canceled') {
    return { label: 'Cancelled', enabled: false };
  }

  if (
    status === 'completed'
    || status === 'ended'
    || status === 'past'
    || event.metadata?.ticket_sales_open === false
  ) {
    return { label: 'Tickets unavailable', enabled: false };
  }

  return {
    label: Number.isFinite(availableTickets)
      ? `${availableTickets} ticket${availableTickets === 1 ? '' : 's'} available`
      : 'Tickets available',
    enabled: true,
  };
}

function toPublicEvent(event) {
  const slug = getEventSlug(event);
  const availability = getAvailability(event);

  return {
    id: event.id,
    slug,
    name: readString(event.name) || 'LMNL Event',
    artworkUrl: readString(event.image_url),
    organizerCredit: getOrganizerCredit(event, slug),
    description: readString(event.description),
    date: readString(event.event_date),
    time: readString(event.event_time),
    venue: readString(event.location_name),
    address: readString(event.address),
    lineup: parseLineup(event.metadata?.performers || event.performers),
    price: Number.isFinite(Number(event.price)) ? Number(event.price) : null,
    displayPrice: formatPrice(event.price),
    availability: availability.label,
    ticketAction: {
      endpoint: '/api/create-event-checkout',
      eventId: event.id,
      enabled: availability.enabled,
      label: availability.enabled ? 'Get ticket' : availability.label,
    },
  };
}

function notFoundError() {
  return new AppError('This event page is not available.', {
    code: 'EVENT_PAGE_NOT_FOUND',
    status: 404,
    expose: true,
  });
}

export async function getPublicEventPage(slug, deps = {}) {
  const normalizedSlug = normalizeEventSlug(slug);
  if (!normalizedSlug) throw notFoundError();

  const loadEvents = deps.listPublicEvents || listEventRecords;
  const events = await loadEvents();
  const event = events.find((candidate) => (
    isPublishedPublicEvent(candidate) && getEventSlug(candidate) === normalizedSlug
  ));

  if (!event) throw notFoundError();

  let resolvedEvent = event;
  if (event.square_variation_id) {
    try {
      const loadInventory = deps.getVariationInventory || loadVariationInventory;
      const inventory = await loadInventory(event.square_variation_id);
      resolvedEvent = {
        ...event,
        available_tickets: inventory.available,
        price: inventory.price ?? event.price,
      };
    } catch (error) {
      if (deps.getVariationInventory) throw error;
      console.error('Failed to load public event inventory:', error);
    }
  }

  const showcaseEvents = events
    .filter((candidate) => (
      candidate.id !== event.id
      && isPublishedPublicEvent(candidate)
      && candidate.metadata?.powered_by_lmnl_approved === true
    ))
    .map(toPublicEvent);

  return {
    event: toPublicEvent(resolvedEvent),
    showcase: showcaseEvents.length > 0
      ? { state: 'ready', events: showcaseEvents, message: '' }
      : {
        state: 'empty',
        events: [],
        message: 'No additional approved events are published yet.',
      },
  };
}
