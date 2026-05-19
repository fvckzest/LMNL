import { getAdminSupabase } from '../clients.js';

const SPACE_EVENT_NAME_ALIASES = new Set([
  'space',
  'lmnl space',
]);

function normalizeSpaceEventName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\[\]()]/g, '')
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

export async function getEventById(id) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLatestEventByName(name) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('name', name)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findLatestSpaceEvent() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []).find(isSpaceEvent) || null;
}

export async function getEventBySquareVariationIds(variationIds) {
  if (!variationIds?.length) return null;
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .in('square_variation_id', variationIds)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listEvents() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertEvent(eventPayload) {
  const supabase = getAdminSupabase();
  const { id, previousName, ...data } = eventPayload;

  if (id) {
    const { data: updated, error } = await supabase
      .from('events')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    if (previousName && previousName !== data.name) {
      const { error: requestError } = await supabase
        .from('requests')
        .update({ event_name: data.name })
        .eq('event_name', previousName);
      if (requestError) throw requestError;
    }

    return updated;
  }

  const { data: inserted, error } = await supabase
    .from('events')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return inserted;
}

export async function updateEventStatus(id, status) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEventMetadata(id, metadata) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('events')
    .update({ metadata })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEventById(id) {
  const supabase = getAdminSupabase();
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
  return true;
}
