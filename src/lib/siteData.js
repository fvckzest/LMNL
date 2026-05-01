import { apiGet } from './api';
import { hasSupabaseCredentials, supabase } from './supabase';

const HOME_FALLBACK_LINK = '/space';

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
    ? supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', event.name)
      .eq('status', 'approved')
      .then(({ count, error }) => {
        if (error) throw error;
        return count || 0;
      })
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
