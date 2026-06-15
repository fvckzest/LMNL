import { apiGet } from './api';
import { createExpiringPromiseCache } from './expiringPromiseCache';
import { fetchPublicRows, hasPublicDataCredentials } from './publicData';

const HOME_FALLBACK_LINK = '/space';
const SITE_ACTIVITY_CACHE_TTL_MS = 60 * 1000;
const PUBLIC_DATA_CACHE_TTL_MS = 60 * 1000;
const SPACE_ACTIVITY_LIMIT = 8;
const siteActivityCache = createExpiringPromiseCache({
  ttlMs: SITE_ACTIVITY_CACHE_TTL_MS,
  keyFn: (limit) => String(Math.max(Number(limit) || 6, 1)),
});
const publicDataCache = createExpiringPromiseCache({
  ttlMs: PUBLIC_DATA_CACHE_TTL_MS,
});
const SPACE_EVENT_NAME_ALIASES = new Set([
  'space',
  'lmnl space',
]);
const TIMELINE_EVENT_SELECT = [
  'id',
  'name',
  'image_url',
  'event_date',
  'description',
  'metadata',
  'location_name',
  'price',
  'is_private',
  'partiful_url',
  'capacity',
  'status',
  'square_variation_id',
  'created_at',
  'event_time',
].join(',');
const COMMUNITY_EVENT_SELECT = [
  'id',
  'name',
  'event_date',
  'capacity',
  'metadata',
].join(',');
const SPACE_EVENT_SELECT = [
  'id',
  'name',
  'image_url',
  'event_date',
  'description',
  'metadata',
  'location_name',
  'price',
  'is_private',
  'capacity',
  'status',
  'square_variation_id',
  'event_time',
].join(',');
const COMMUNITY_CREDIT_SELECT = [
  'id',
  'name',
  'role',
  'event_name',
  'link',
].join(',');
const COMMUNITY_BUSINESS_SELECT = [
  'id',
  'name',
  'link',
  'details',
].join(',');
const OPEN_PRODUCT_SELECT = [
  'id',
  'item_name',
  'category',
  'created_at',
  'status',
  'goal_quantity',
  'current_quantity',
  'end_date',
  'image_url',
  'description',
  'price',
  'square_item_id',
].join(',');
const BLOG_POST_LIST_SELECT = [
  'id',
  'title',
  'slug',
  'date',
  'created_at',
  'content',
  'author',
].join(',');
const BLOG_POST_DETAIL_SELECT = [
  'id',
  'title',
  'slug',
  'date',
  'created_at',
  'content',
  'author',
].join(',');

async function fetchEventRows() {
  return fetchPublicEventRows(TIMELINE_EVENT_SELECT);
}

async function fetchPublicEventRows(select) {
  if (hasPublicDataCredentials) {
    return fetchPublicRows('events', {
      select,
      order: { column: 'event_date', ascending: false },
    });
  }

  const data = await apiGet('/api/events');
  return Array.isArray(data) ? data : [];
}

async function fetchCachedPublicData(key, loader, fallback) {
  return publicDataCache.get(key, loader, { fallback });
}

function normalizeSpaceEventName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[()[\]]/g, '')
    .replace(/\s+/g, ' ');
}

function isSpaceEvent(event) {
  if (!event) return false;

  const eventLink = String(event.metadata?.event_link || '').trim().toLowerCase();
  if (eventLink === '/space') {
    return true;
  }

  return SPACE_EVENT_NAME_ALIASES.has(normalizeSpaceEventName(event.name));
}

export const fallbackEventsTimeline = [
  {
    id: 'space',
    title: 'LMNL SPACE',
    type: 'image',
    display: '/space-logo.png',
    image_url: '/space-logo.png',
    imageUrl: '/space-logo.png',
    link: '/space',
    date: 'Ongoing',
    description: 'The main LMNL space. A hub for creativity, collaboration, and innovation. Join us for workshops, exhibitions, and community gatherings.',
    performers: 'LMNL Resident DJs, Special Guests',
    artists: 'Visualist X, Sculptor Y',
    media: [],
  },
  {
    id: 'camp-zest',
    title: 'Camp Zest',
    type: 'image',
    display: '/campzest-logo.png',
    image_url: '/campzest-logo.png',
    imageUrl: '/campzest-logo.png',
    date: 'Summer 2025',
    description: 'An immersive summer experience bringing together creators, builders, and thinkers for a week of intense collaboration and learning.',
    media: [],
  },
  {
    id: 'bloom',
    title: 'Bloom',
    type: 'image',
    display: '/bloom-logo.png',
    image_url: '/bloom-logo.png',
    imageUrl: '/bloom-logo.png',
    date: 'Spring 2025',
    description: 'A celebration of new beginnings, showcasing the latest creative projects and breakthroughs in our community.',
    media: [],
  },
  {
    id: 'genesis',
    title: 'Genesis',
    type: 'image',
    display: '/genesis-logo.png',
    image_url: '/genesis-logo.png',
    imageUrl: '/genesis-logo.png',
    date: 'Winter 2024',
    description: 'The inception of the LMNL journey. This event marked the beginning of our mission to redefine creative spaces.',
    media: [],
  },
];

async function safeSupabaseQuery(buildQuery, fallback) {
  if (!hasPublicDataCredentials) {
    return fallback;
  }

  const data = await buildQuery();
  return data ?? fallback;
}

function normalizeEventDate(value) {
  return value || '';
}

export function getEventImageUrl(event) {
  if (!event) return '';

  if (typeof event.imageUrl === 'string' && event.imageUrl.trim()) {
    return event.imageUrl.trim();
  }

  if (typeof event.image_url === 'string' && event.image_url.trim()) {
    return event.image_url.trim();
  }

  if (event.type === 'image' && typeof event.display === 'string' && event.display.trim()) {
    return event.display.trim();
  }

  return '';
}

export function normalizeEventSummary(event) {
  if (!event) return null;

  const title = event.title || event.name || 'Untitled event';
  const date = event.date || normalizeEventDate(event.event_date) || '';
  const location = event.location || event.location_name || 'LMNL Space, LA';
  const link = event.link || event.rsvpLink || getEventLink(event);
  const imageUrl = getEventImageUrl(event);

  return {
    ...event,
    title,
    image_url: imageUrl,
    imageUrl,
    date,
    location,
    link,
    rsvpLink: link,
    is_featured: event.is_featured || event.metadata?.is_featured || false,
    is_home_notif: event.is_home_notif || event.metadata?.is_home_notif || false,
    is_private: event.is_private ?? false,
  };
}

export function mapEventToTimelineItem(event) {
  return normalizeEventSummary({
    id: event.id,
    title: event.name,
    type: getEventImageUrl(event) ? 'image' : 'text',
    display: getEventImageUrl(event) || `[${String(event.name || '').toUpperCase()}]`,
    link: event.metadata?.event_link || event.partiful_url || '',
    date: normalizeEventDate(event.event_date),
    description: event.description || '',
    performers: event.metadata?.performers || '',
    artists: event.metadata?.artists || '',
    media: Array.isArray(event.metadata?.media) ? event.metadata.media : [],
    is_featured: event.metadata?.is_featured || false,
    is_home_notif: event.metadata?.is_home_notif || false,
    location: event.location_name || 'LMNL Space, LA',
    price: event.price,
    is_private: event.is_private,
  });
}

export async function fetchNotificationEvent() {
  const events = await fetchCachedPublicData(
    'events:timeline',
    fetchEventRows,
    [],
  );

  const match = events.find((event) => event.metadata?.is_home_notif === true) || null;
  return match ? normalizeEventSummary(match) : null;
}

export function getEventLink(event) {
  if (!event) return HOME_FALLBACK_LINK;
  return event.metadata?.event_link || event.partiful_url || HOME_FALLBACK_LINK;
}

export async function fetchTimelineEvents() {
  const events = await fetchCachedPublicData(
    'events:timeline',
    fetchEventRows,
    [],
  );

  if (!events.length) {
    return fallbackEventsTimeline.map(normalizeEventSummary);
  }

  return events.map(mapEventToTimelineItem);
}

export async function fetchFeaturedTimelineEvent() {
  const events = await fetchTimelineEvents();
  return events.find((event) => event.is_featured) || events[0] || null;
}

export async function fetchCommunitySnapshot() {
  const [credits, events, businesses] = await Promise.all([
    fetchCachedPublicData(
      'community:credits',
      () => fetchPublicRows('community_credits', { select: COMMUNITY_CREDIT_SELECT }),
      [],
    ),
    fetchCachedPublicData(
      'community:events',
      () => fetchPublicEventRows(COMMUNITY_EVENT_SELECT),
      [],
    ),
    fetchCachedPublicData(
      'community:businesses',
      () => fetchPublicRows('community_businesses', { select: COMMUNITY_BUSINESS_SELECT }).catch(() => []),
      [],
    ),
  ]);

  return { credits, events, businesses };
}

export async function fetchSpaceEventSnapshot() {
  const events = await fetchCachedPublicData(
    'events:space',
    () => fetchPublicEventRows(SPACE_EVENT_SELECT),
    [],
  );

  const event = events.find(isSpaceEvent) || null;

  if (!event) {
    return null;
  }

  const inventoryPromise = event.square_variation_id
    ? apiGet(`/api/check-inventory?variationId=${event.square_variation_id}`).catch(() => null)
    : Promise.resolve(null);
  const activityPromise = Promise.all([
    fetchSpaceTicketActivity(event.id, SPACE_ACTIVITY_LIMIT),
    fetchSpaceDonationActivity(SPACE_ACTIVITY_LIMIT).catch(() => ({ activity: [] })),
  ])
    .then(([ticketData, donationData]) => ({
      ...ticketData,
      activity: mergeSpaceActivity(ticketData.activity, donationData.activity, SPACE_ACTIVITY_LIMIT),
      isLive: true,
    }))
    .catch(() => ({ soldTickets: 0, activity: [], isLive: false }));

  const [inventory, activity] = await Promise.all([inventoryPromise, activityPromise]);

  const normalizedEvent = mapEventToTimelineItem(event);
  const nextEvent = {
    ...event,
    performers: normalizedEvent.performers,
    artists: normalizedEvent.artists,
    sold_tickets: Number.isFinite(activity?.soldTickets) ? activity.soldTickets : 0,
    activity: Array.isArray(activity?.activity) ? activity.activity : [],
    activity_live: activity?.isLive === true,
  };

  if (inventory?.available !== undefined) {
    nextEvent.available_tickets = inventory.available;
    const squareSold = Math.max(0, (event.capacity || 0) - inventory.available);
    nextEvent.sold_tickets = Math.max(nextEvent.sold_tickets || 0, squareSold);

    if (inventory.available <= 0) {
      nextEvent.status = 'sold_out';
    }
  }

  if (inventory?.price !== undefined) {
    nextEvent.price = inventory.price;
  }

  return nextEvent;
}

export async function fetchSpaceTicketActivity(eventId, limit = 8) {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  if (eventId) {
    params.set('eventId', eventId);
  }

  const response = await apiGet(`/api/space-activity?${params.toString()}`);
  return {
    soldTickets: Number.isFinite(response?.soldTickets) ? response.soldTickets : null,
    activity: Array.isArray(response?.activity) ? response.activity : [],
  };
}

export async function fetchSpaceDonationActivity(limit = 8) {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  const response = await apiGet(`/api/space-donations?${params.toString()}`);
  return {
    activity: Array.isArray(response?.activity) ? response.activity : [],
  };
}

export function mergeSpaceActivity(ticketActivity = [], donationActivity = [], limit = 8) {
  const seenIds = new Set();

  return [...ticketActivity, ...donationActivity]
    .filter((item) => {
      if (!item?.id || seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function fetchOpenProducts() {
  const products = await fetchCachedPublicData(
    'shop:open-products',
    () => fetchPublicRows('merch_preorders', {
      select: OPEN_PRODUCT_SELECT,
      filters: { status: 'open' },
      order: { column: 'created_at', ascending: false },
    }),
    [],
  );

  return products.map((product) => ({
    ...product,
    price: Number(product.price) || 0,
  }));
}

function parseActivityDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatActivityDate(value) {
  const date = parseActivityDate(value);
  if (!date) return '';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
  }).toUpperCase();
}

function formatActivityTimeAgo(value) {
  const date = parseActivityDate(value);
  if (!date) return 'Unknown';

  const elapsed = date.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const minutes = Math.round(elapsed / (1000 * 60));

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, 'minute');
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, 'hour');
  }

  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) {
    return formatter.format(days, 'day');
  }

  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) {
    return formatter.format(months, 'month');
  }

  const years = Math.round(months / 12);
  return formatter.format(years, 'year');
}

function isUpcomingEventActivity(type, value) {
  if (type !== 'EVENT') return false;

  const date = parseActivityDate(value);
  if (!date) return false;

  return date.getTime() > Date.now();
}

function buildActivityItem({
  id,
  type,
  title,
  date,
  href,
  accent,
  meta,
}) {
  return {
    id,
    type,
    title,
    date,
    href,
    accent,
    meta,
    stamp: formatActivityDate(date),
    timeAgo: formatActivityTimeAgo(date),
    isUpcoming: isUpcomingEventActivity(type, date),
  };
}

async function loadSiteActivityHistory(limit = 6) {
  try {
    const activity = await apiGet(`/api/site-activity?limit=${encodeURIComponent(limit)}`);
    if (Array.isArray(activity)) {
      return activity;
    }
  } catch (error) {
    console.error('Failed to load server-backed site activity history:', error);
  }

  const [eventsResult, postsResult, productsResult, ticketsResult] = await Promise.allSettled([
    safeSupabaseQuery(
      () => fetchPublicRows('events', {
        select: 'id,name,event_date,created_at,metadata,partiful_url',
        order: { column: 'created_at', ascending: false },
        limit: Math.max(limit, 6),
      }),
      []
    ),
    safeSupabaseQuery(
      () => fetchPublicRows('blog_posts', {
        select: 'id,title,slug,date,created_at,status',
        filters: { status: 'published' },
        order: { column: 'created_at', ascending: false },
        limit: Math.max(limit, 6),
      }),
      []
    ),
    safeSupabaseQuery(
      () => fetchPublicRows('merch_preorders', {
        select: 'id,item_name,category,created_at,status',
        filters: { status: 'open' },
        order: { column: 'created_at', ascending: false },
        limit: Math.max(limit, 6),
      }),
      []
    ),
    safeSupabaseQuery(
      () => fetchPublicRows('tickets', {
        select: 'id,event_id,created_at',
        order: { column: 'created_at', ascending: false },
        limit: Math.max(limit, 6),
      }),
      []
    ),
  ]);

  const events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
  const posts = postsResult.status === 'fulfilled' ? postsResult.value : [];
  const products = productsResult.status === 'fulfilled' ? productsResult.value : [];
  const tickets = ticketsResult.status === 'fulfilled' ? ticketsResult.value : [];

  const eventNameById = new Map(events.map((event) => [event.id, event.name || 'LMNL Event']));

  const activity = [
    ...events.map((event) => buildActivityItem({
      id: `event-${event.id}`,
      type: 'EVENT',
      title: event.name || 'Untitled event',
      date: event.event_date || event.created_at,
      href: event.metadata?.event_link || event.partiful_url || '/events',
      accent: '#004ffa',
      meta: 'Hosted event',
    })),
    ...posts.map((post) => buildActivityItem({
      id: `post-${post.id}`,
      type: 'BLOG',
      title: post.title || 'Untitled post',
      date: post.date || post.created_at,
      href: post.slug ? `/blog/${post.slug}` : '/blog',
      accent: '#ffde00',
      meta: 'Published to Blog',
    })),
    ...products.map((product) => buildActivityItem({
      id: `product-${product.id}`,
      type: 'SHOP',
      title: product.item_name || 'Untitled artifact',
      date: product.created_at,
      href: '/shop',
      accent: '#ff0000',
      meta: product.category ? `${product.category} artifact` : 'Artifact release',
    })),
    ...tickets.map((ticket) => buildActivityItem({
      id: `ticket-${ticket.id}`,
      type: 'TICKET',
      title: eventNameById.get(ticket.event_id) || 'Event ticket issued',
      date: ticket.created_at,
      href: '/events',
      accent: '#004ffa',
      meta: 'Ticket purchased',
    })),
  ]
    .filter((item) => parseActivityDate(item.date))
    .sort((a, b) => parseActivityDate(b.date).getTime() - parseActivityDate(a.date).getTime())
    .slice(0, limit);

  return activity;
}

export function getCachedSiteActivityHistory(limit = 6) {
  return siteActivityCache.read(limit)?.data || null;
}

export async function fetchSiteActivityHistory(limit = 6, options = {}) {
  const { forceRefresh = false } = options;
  return siteActivityCache.get(limit, () => loadSiteActivityHistory(limit), { forceRefresh });
}

export async function fetchPublishedBlogPosts() {
  return fetchCachedPublicData(
    'blog:published-posts',
    () => fetchPublicRows('blog_posts', {
      select: BLOG_POST_LIST_SELECT,
      filters: { status: 'published' },
      order: { column: 'created_at', ascending: false },
    }),
    [],
  );
}

export async function fetchPublishedBlogPost(slug) {
  if (!slug) {
    return null;
  }

  const normalizedSlug = String(slug).trim();

  return fetchCachedPublicData(
    `blog:post:${normalizedSlug}`,
    async () => {
      const postBySlug = await fetchPublicRows('blog_posts', {
        select: BLOG_POST_DETAIL_SELECT,
        filters: { slug: normalizedSlug, status: 'published' },
        single: true,
      }).catch((error) => {
        if (error?.details?.code === 'PGRST116') {
          return null;
        }

        throw error;
      });

      if (postBySlug) {
        return postBySlug;
      }

      return fetchPublicRows('blog_posts', {
        select: BLOG_POST_DETAIL_SELECT,
        filters: { id: normalizedSlug, status: 'published' },
        single: true,
      }).catch((error) => {
        if (error?.details?.code === 'PGRST116') {
          return null;
        }

        throw error;
      });
    },
    null,
  );
}
