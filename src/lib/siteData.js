import { apiGet } from './api';
import { hasSupabaseCredentials, supabase } from './supabase';

const HOME_FALLBACK_LINK = '/space';
const SITE_ACTIVITY_CACHE_TTL_MS = 60 * 1000;
const siteActivityCache = new Map();

export const fallbackEventsTimeline = [
  {
    id: 'space',
    title: 'LMNL SPACE',
    type: 'text',
    display: '[SPACE]',
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
    display: '/cz1.png',
    date: 'Summer 2025',
    description: 'An immersive summer experience bringing together creators, builders, and thinkers for a week of intense collaboration and learning.',
    media: [],
  },
  {
    id: 'bloom',
    title: 'Bloom',
    type: 'image',
    display: '/title1.png',
    date: 'Spring 2025',
    description: 'A celebration of new beginnings, showcasing the latest creative projects and breakthroughs in our community.',
    media: [],
  },
  {
    id: 'genesis',
    title: 'Genesis',
    type: 'image',
    display: '/genesis-logo.png',
    date: 'Winter 2024',
    description: 'The inception of the LMNL journey. This event marked the beginning of our mission to redefine creative spaces.',
    media: [],
  },
];

async function safeSupabaseQuery(buildQuery, fallback) {
  if (!hasSupabaseCredentials) {
    return fallback;
  }

  const query = buildQuery();
  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data ?? fallback;
}

function normalizeEventDate(value) {
  return value || '';
}

export function mapEventToTimelineItem(event) {
  return {
    id: event.id,
    title: event.name,
    type: event.image_url ? 'image' : 'text',
    display: event.image_url || `[${String(event.name || '').toUpperCase()}]`,
    link: event.metadata?.event_link || event.partiful_url || event.spotify_id || '',
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
  };
}

export async function fetchNotificationEvent() {
  const events = await safeSupabaseQuery(
    () => supabase.from('events').select('*'),
    []
  );

  return events.find((event) => event.metadata?.is_home_notif === true) || null;
}

export function getEventLink(event) {
  if (!event) return HOME_FALLBACK_LINK;
  return event.metadata?.event_link || event.partiful_url || event.spotify_id || HOME_FALLBACK_LINK;
}

export async function fetchTimelineEvents() {
  const events = await safeSupabaseQuery(
    () => supabase.from('events').select('*').order('event_date', { ascending: true }),
    []
  );

  if (!events.length) {
    return fallbackEventsTimeline;
  }

  return events.map(mapEventToTimelineItem);
}

export async function fetchCommunitySnapshot() {
  const [credits, events] = await Promise.all([
    safeSupabaseQuery(() => supabase.from('community_credits').select('*'), []),
    safeSupabaseQuery(() => supabase.from('events').select('*'), []),
  ]);

  return { credits, events };
}

export async function fetchSpaceEventSnapshot() {
  const event = await safeSupabaseQuery(
    () => supabase
      .from('events')
      .select('*')
      .eq('name', 'SPACE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    null
  );

  if (!event) {
    return null;
  }

  const approvedCountPromise = hasSupabaseCredentials
    ? apiGet(`/api/event-stats?eventName=${encodeURIComponent(event.name)}`)
      .then((data) => data?.approvedCount || 0)
      .catch(() => 0)
    : Promise.resolve(0);

  const inventoryPromise = event.square_variation_id
    ? apiGet(`/api/check-inventory?variationId=${event.square_variation_id}`).catch(() => null)
    : Promise.resolve(null);

  const [approvedCountResult, inventory] = await Promise.all([approvedCountPromise, inventoryPromise]);

  const nextEvent = {
    ...event,
    sold_tickets: approvedCountResult || 0,
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

export async function fetchOpenProducts() {
  const [products, catalogResponse] = await Promise.all([
    safeSupabaseQuery(
      () => supabase
        .from('merch_preorders')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false }),
      []
    ),
    apiGet('/api/square-catalog').catch(() => ({ catalog: [] })),
  ]);

  const catalogItems = catalogResponse?.catalog || [];
  const catalogPriceMap = new Map(
    catalogItems.map((item) => [item.id, item.variations?.[0]?.price || 0])
  );

  return products.map((product) => ({
    ...product,
    price: catalogPriceMap.get(product.square_item_id) ?? 0,
  }));
}

function getSiteActivityCacheKey(limit) {
  return String(Math.max(Number(limit) || 6, 1));
}

function readSiteActivityCache(limit) {
  const entry = siteActivityCache.get(getSiteActivityCacheKey(limit));
  if (!entry) return null;

  return {
    ...entry,
    isFresh: Date.now() - entry.updatedAt < SITE_ACTIVITY_CACHE_TTL_MS,
  };
}

function writeSiteActivityCache(limit, activity) {
  siteActivityCache.set(getSiteActivityCacheKey(limit), {
    data: activity,
    updatedAt: Date.now(),
    promise: null,
  });
}

function setSiteActivityCachePromise(limit, promise) {
  const existing = readSiteActivityCache(limit);

  siteActivityCache.set(getSiteActivityCacheKey(limit), {
    data: existing?.data || null,
    updatedAt: existing?.updatedAt || 0,
    promise,
  });
}

function clearSiteActivityCachePromise(limit) {
  const existing = readSiteActivityCache(limit);
  if (!existing) return;

  siteActivityCache.set(getSiteActivityCacheKey(limit), {
    data: existing.data || null,
    updatedAt: existing.updatedAt || 0,
    promise: null,
  });
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
      () => supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Math.max(limit, 6)),
      []
    ),
    safeSupabaseQuery(
      () => supabase
        .from('blog_posts')
        .select('id,title,slug,date,created_at,status')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(Math.max(limit, 6)),
      []
    ),
    safeSupabaseQuery(
      () => supabase
        .from('merch_preorders')
        .select('id,item_name,category,created_at,status')
        .order('created_at', { ascending: false })
        .limit(Math.max(limit, 6)),
      []
    ),
    safeSupabaseQuery(
      () => supabase
        .from('tickets')
        .select('id,event_id,created_at')
        .order('created_at', { ascending: false })
        .limit(Math.max(limit, 6)),
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
      href: event.metadata?.event_link || event.partiful_url || event.spotify_id || '/events',
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
  return readSiteActivityCache(limit)?.data || null;
}

export async function fetchSiteActivityHistory(limit = 6, options = {}) {
  const { forceRefresh = false } = options;
  const cached = readSiteActivityCache(limit);

  if (!forceRefresh && cached?.data && cached.isFresh) {
    return cached.data;
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const request = loadSiteActivityHistory(limit)
    .then((activity) => {
      writeSiteActivityCache(limit, activity);
      return activity;
    })
    .catch((error) => {
      if (cached?.data) {
        return cached.data;
      }
      throw error;
    })
    .finally(() => {
      clearSiteActivityCachePromise(limit);
    });

  setSiteActivityCachePromise(limit, request);

  return request;
}
