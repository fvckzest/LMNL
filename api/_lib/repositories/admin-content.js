import { getAdminSupabase } from '../clients.js';
import { AppError } from '../http.js';
import { listEvents } from './events.js';

function isMissingTable(error, tableName) {
  return error?.code === 'PGRST205' && String(error.message || '').includes(tableName);
}

function throwMissingTable(error, tableName, label) {
  if (isMissingTable(error, tableName)) {
    throw new AppError(`${label} table is not set up yet. Create the \`${tableName}\` table in Supabase and try again.`, {
      code: `${tableName.toUpperCase()}_TABLE_MISSING`,
      status: 503,
      details: error,
      expose: true,
    });
  }

  throw error;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export async function listServiceInquiries() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('service_inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listServiceProducts() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('service_products')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throwMissingTable(error, 'service_products', 'Service products');
  }

  return data || [];
}

export async function saveServiceProduct(payload) {
  const supabase = getAdminSupabase();
  const { id, ...rawData } = payload;
  const data = {
    capability: rawData.capability || '',
    product: rawData.product || '',
    scope: rawData.scope || '',
    sort_order: Number.isFinite(Number(rawData.sort_order)) ? Number(rawData.sort_order) : 0,
    is_active: rawData.is_active !== false,
  };

  if (id) {
    const { data: updated, error } = await supabase
      .from('service_products')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throwMissingTable(error, 'service_products', 'Service products');
    }

    return updated;
  }

  const { data: inserted, error } = await supabase
    .from('service_products')
    .insert([data])
    .select()
    .single();

  if (error) {
    throwMissingTable(error, 'service_products', 'Service products');
  }

  return inserted;
}

export async function deleteServiceProductById(id) {
  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from('service_products')
    .delete()
    .eq('id', id);

  if (error) {
    throwMissingTable(error, 'service_products', 'Service products');
  }

  return true;
}

export async function listArtistInterest() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('artist_interest')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throwMissingTable(error, 'artist_interest', 'Artist interest');
  }

  return data || [];
}

export async function listBlogPostsAdmin() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throwMissingTable(error, 'blog_posts', 'Blog posts');
  }

  return data || [];
}

export async function listCommunityCredits() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('community_credits')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throwMissingTable(error, 'community_credits', 'Community credits');
  }

  return data || [];
}

export async function saveCommunityCredit(payload) {
  const supabase = getAdminSupabase();
  const { id, ...data } = payload;
  const writeData = {
    ...data,
    email: data.email || '',
    details: data.details || '',
    link: data.link || '',
  };

  if (id) {
    const { data: updated, error } = await supabase
      .from('community_credits')
      .update(writeData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throwMissingTable(error, 'community_credits', 'Community credits');
    }

    return updated;
  }

  const { data: inserted, error } = await supabase
    .from('community_credits')
    .insert([writeData])
    .select()
    .single();

  if (error) {
    throwMissingTable(error, 'community_credits', 'Community credits');
  }

  return inserted;
}

export async function deleteCommunityCreditById(id) {
  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from('community_credits')
    .delete()
    .eq('id', id);

  if (error) {
    throwMissingTable(error, 'community_credits', 'Community credits');
  }

  return true;
}

export async function syncCommunityCreditsFromEvents() {
  const supabase = getAdminSupabase();
  const [events, existingCredits] = await Promise.all([
    listEvents(),
    listCommunityCredits(),
  ]);

  let addedCount = 0;
  let skippedCount = 0;

  for (const event of events) {
    const performers = event.metadata?.performers
      ? event.metadata.performers.split(',').map((entry) => entry.trim()).filter(Boolean)
      : [];
    const artists = event.metadata?.artists
      ? event.metadata.artists.split(',').map((entry) => entry.trim()).filter(Boolean)
      : [];

    for (const name of performers) {
      const exists = existingCredits.some((credit) =>
        credit.name?.toLowerCase() === name.toLowerCase()
        && credit.role === 'performer'
        && credit.event_id === event.id);

      if (exists) {
        skippedCount += 1;
        continue;
      }

      const { error } = await supabase.from('community_credits').insert([{
        name,
        role: 'performer',
        event_id: event.id,
        event_name: event.name,
      }]);

      if (error) {
        throwMissingTable(error, 'community_credits', 'Community credits');
      }

      addedCount += 1;
      existingCredits.push({
        name,
        role: 'performer',
        event_id: event.id,
        event_name: event.name,
      });
    }

    for (const name of artists) {
      const exists = existingCredits.some((credit) =>
        credit.name?.toLowerCase() === name.toLowerCase()
        && credit.role === 'artist'
        && credit.event_id === event.id);

      if (exists) {
        skippedCount += 1;
        continue;
      }

      const { error } = await supabase.from('community_credits').insert([{
        name,
        role: 'artist',
        event_id: event.id,
        event_name: event.name,
      }]);

      if (error) {
        throwMissingTable(error, 'community_credits', 'Community credits');
      }

      addedCount += 1;
      existingCredits.push({
        name,
        role: 'artist',
        event_id: event.id,
        event_name: event.name,
      });
    }
  }

  return { addedCount, skippedCount };
}

export async function listMailingListEntries() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('mailing_list')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throwMissingTable(error, 'mailing_list', 'Mailing list');
  }

  return data || [];
}

export async function saveMailingListEntry(payload) {
  const supabase = getAdminSupabase();
  const { id, ...rawData } = payload;
  const data = {
    ...rawData,
    name: rawData.name || '',
    email: normalizeEmail(rawData.email),
    source: rawData.source || 'manual',
  };

  if (id) {
    const { data: updated, error } = await supabase
      .from('mailing_list')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throwMissingTable(error, 'mailing_list', 'Mailing list');
    }

    return updated;
  }

  const { data: inserted, error } = await supabase
    .from('mailing_list')
    .insert([data])
    .select()
    .single();

  if (error) {
    throwMissingTable(error, 'mailing_list', 'Mailing list');
  }

  return inserted;
}

export async function deleteMailingListEntryById(id) {
  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from('mailing_list')
    .delete()
    .eq('id', id);

  if (error) {
    throwMissingTable(error, 'mailing_list', 'Mailing list');
  }

  return true;
}
