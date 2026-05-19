import { getAdminSupabase } from '../clients.js';

const SITE_ACTIVITY_CACHE_TTL_MS = 60 * 1000;
const siteActivityCache = new Map();

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

function writeSiteActivityCache(limit, data) {
  siteActivityCache.set(getSiteActivityCacheKey(limit), {
    data,
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

async function loadSiteActivityHistory(limit = 6, deps = {}) {
  const safeLimit = Math.max(Number(limit) || 6, 1);
  const supabase = deps.supabase || getAdminSupabase();

  const [eventsResult, postsResult, productsResult, ticketsResult] = await Promise.all([
    supabase
      .from('events')
      .select('id,name,event_date,created_at,metadata,partiful_url')
      .order('created_at', { ascending: false })
      .limit(Math.max(safeLimit, 6)),
    supabase
      .from('blog_posts')
      .select('id,title,slug,date,created_at,status')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(Math.max(safeLimit, 6)),
    supabase
      .from('merch_preorders')
      .select('id,item_name,category,created_at,status')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(Math.max(safeLimit, 6)),
    supabase
      .from('tickets')
      .select('id,event_id,created_at')
      .order('created_at', { ascending: false })
      .limit(Math.max(safeLimit, 6)),
  ]);

  if (eventsResult.error) throw eventsResult.error;
  if (postsResult.error) throw postsResult.error;
  if (productsResult.error) throw productsResult.error;
  if (ticketsResult.error) throw ticketsResult.error;

  const events = eventsResult.data || [];
  const posts = postsResult.data || [];
  const products = productsResult.data || [];
  const tickets = ticketsResult.data || [];

  const missingEventIds = [...new Set(
    tickets
      .map((ticket) => ticket.event_id)
      .filter((eventId) => eventId && !events.some((event) => event.id === eventId))
  )];

  let ticketEvents = [];
  if (missingEventIds.length > 0) {
    const ticketEventsResult = await supabase
      .from('events')
      .select('id,name')
      .in('id', missingEventIds);

    if (ticketEventsResult.error) throw ticketEventsResult.error;
    ticketEvents = ticketEventsResult.data || [];
  }

  const eventNameById = new Map(
    [...events, ...ticketEvents].map((event) => [event.id, event.name || 'LMNL Event'])
  );

  return [
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
    .slice(0, safeLimit);
}

export async function getSiteActivityHistory(limit = 6, deps = {}) {
  const cached = readSiteActivityCache(limit);

  if (cached?.data && cached.isFresh) {
    return cached.data;
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const request = loadSiteActivityHistory(limit, deps)
    .then((data) => {
      writeSiteActivityCache(limit, data);
      return data;
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
