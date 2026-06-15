import { getAdminSupabase } from '../clients.js';
import { AppError } from '../http.js';
import { listEvents } from './events.js';

export const PORTFOLIO_PREVIEW_ASSET_ROLE = 'website_preview';

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

export async function listWebsiteIntakeSubmissions() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('website_intake_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throwMissingTable(error, 'website_intake_submissions', 'Website intake submissions');
  }

  return data || [];
}

export async function updateWebsiteIntakeSubmissionStatus(id, status) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('website_intake_submissions')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throwMissingTable(error, 'website_intake_submissions', 'Website intake submissions');
  }

  return data;
}

export async function deleteWebsiteIntakeSubmissionById(id) {
  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from('website_intake_submissions')
    .delete()
    .eq('id', id);

  if (error) {
    throwMissingTable(error, 'website_intake_submissions', 'Website intake submissions');
  }

  return true;
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

export async function listPortfolioEntriesAdmin() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('portfolio_entries')
    .select('*, portfolio_media(*)')
    .order('sort_order', { ascending: true })
    .order('year', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throwMissingTable(error, 'portfolio_entries', 'Portfolio entries');
  }

  return (data || []).map((entry) => ({
    ...entry,
    portfolio_media: normalizePortfolioMediaRows(entry.portfolio_media),
  }));
}

export async function listPublishedPortfolioEntries() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('portfolio_entries')
    .select('*, portfolio_media(*)')
    .eq('status', 'published')
    .order('sort_order', { ascending: true })
    .order('year', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throwMissingTable(error, 'portfolio_entries', 'Portfolio entries');
  }

  return (data || []).map((entry) => ({
    ...entry,
    portfolio_media: normalizePortfolioMediaRows(entry.portfolio_media),
  }));
}

export async function updatePortfolioEntryOrder(entries) {
  const supabase = getAdminSupabase();
  const normalizedEntries = (Array.isArray(entries) ? entries : [])
    .map((entry, index) => ({
      id: String(entry?.id || '').trim(),
      sort_order: Number.isFinite(Number(entry?.sort_order)) ? Number(entry.sort_order) : index,
    }))
    .filter((entry) => entry.id);

  if (normalizedEntries.length === 0) {
    return [];
  }

  await Promise.all(normalizedEntries.map(async (entry) => {
    const { error } = await supabase
      .from('portfolio_entries')
      .update({ sort_order: entry.sort_order })
      .eq('id', entry.id);

    if (error) {
      throwMissingTable(error, 'portfolio_entries', 'Portfolio entries');
    }
  }));

  return listPortfolioEntriesAdmin();
}

function normalizeStringList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function normalizeOptionalUrl(value) {
  return String(value || '').trim();
}

function normalizePortfolioMediaList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((item, index) => ({
      id: item?.id || null,
      media_type: String(item?.media_type || 'image').trim().toLowerCase() || 'image',
      asset_role: item?.asset_role === PORTFOLIO_PREVIEW_ASSET_ROLE
        ? PORTFOLIO_PREVIEW_ASSET_ROLE
        : 'gallery',
      url: String(item?.url || '').trim(),
      alt_text: String(item?.alt_text || '').trim(),
      caption: String(item?.caption || '').trim(),
      sort_order: Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index,
      is_cover: item?.is_cover === true,
    }))
    .filter((item) => item.url);
}

function normalizePortfolioMediaRows(values) {
  return normalizePortfolioMediaList(values).sort((a, b) => {
    if (a.asset_role !== b.asset_role) {
      return a.asset_role === PORTFOLIO_PREVIEW_ASSET_ROLE ? -1 : 1;
    }

    if (a.is_cover !== b.is_cover) {
      return a.is_cover ? -1 : 1;
    }

    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }

    return 0;
  });
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function savePortfolioMediaList(supabase, portfolioEntryId, media) {
  const normalizedMedia = normalizePortfolioMediaList(media).map((item, index) => ({
    ...(item.id ? { id: item.id } : {}),
    portfolio_entry_id: portfolioEntryId,
    media_type: item.media_type,
    asset_role: item.asset_role,
    url: item.url,
    alt_text: item.alt_text,
    caption: item.caption,
    sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index,
    is_cover: item.is_cover === true,
  }));

  const { error: deleteError } = await supabase
    .from('portfolio_media')
    .delete()
    .eq('portfolio_entry_id', portfolioEntryId);

  if (deleteError) {
    throwMissingTable(deleteError, 'portfolio_media', 'Portfolio media');
  }

  if (normalizedMedia.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('portfolio_media')
    .upsert(normalizedMedia)
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    throwMissingTable(error, 'portfolio_media', 'Portfolio media');
  }

  return data || [];
}

export async function savePortfolioEntry(payload) {
  const supabase = getAdminSupabase();
  const { id, media = [], ...rawData } = payload;
  const title = String(rawData.title || '').trim();
  const slug = slugify(rawData.slug || title);
  const year = Number.parseInt(rawData.year, 10);

  const data = {
    title,
    slug,
    year: Number.isFinite(year) ? year : null,
    client_name: String(rawData.client_name || '').trim(),
    project_type: String(rawData.project_type || '').trim(),
    website_url: normalizeOptionalUrl(rawData.website_url),
    summary: String(rawData.summary || '').trim(),
    result: String(rawData.result || '').trim(),
    capabilities: normalizeStringList(rawData.capabilities),
    outputs: normalizeStringList(rawData.outputs),
    focus_areas: normalizeStringList(rawData.focus_areas),
    featured: rawData.featured === true,
    sort_order: Number.isFinite(Number(rawData.sort_order)) ? Number(rawData.sort_order) : 0,
    status: String(rawData.status || 'draft').trim().toLowerCase() || 'draft',
  };

  let savedEntry;

  if (id) {
    const { data: updated, error } = await supabase
      .from('portfolio_entries')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throwMissingTable(error, 'portfolio_entries', 'Portfolio entries');
    }

    savedEntry = updated;
  } else {
    const { data: inserted, error } = await supabase
      .from('portfolio_entries')
      .insert([data])
      .select()
      .single();

    if (error) {
      throwMissingTable(error, 'portfolio_entries', 'Portfolio entries');
    }

    savedEntry = inserted;
  }

  const savedMedia = await savePortfolioMediaList(supabase, savedEntry.id, media);

  return {
    ...savedEntry,
    portfolio_media: savedMedia,
  };
}

export async function getPortfolioEntryById(id) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('portfolio_entries')
    .select('*, portfolio_media(*)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new AppError('Portfolio entry not found.', {
        code: 'PORTFOLIO_NOT_FOUND',
        status: 404,
        expose: true,
      });
    }

    throwMissingTable(error, 'portfolio_entries', 'Portfolio entries');
  }

  return {
    ...data,
    portfolio_media: normalizePortfolioMediaRows(data?.portfolio_media),
  };
}

export async function savePortfolioPreviewMedia({
  portfolioEntryId,
  previewUrl,
  websiteUrl,
  altText,
  caption = '',
}) {
  const supabase = getAdminSupabase();
  const entry = await getPortfolioEntryById(portfolioEntryId);
  const galleryMedia = normalizePortfolioMediaRows(entry.portfolio_media)
    .filter((item) => item.asset_role !== PORTFOLIO_PREVIEW_ASSET_ROLE)
    .map((item, index) => ({
      ...item,
      is_cover: false,
      sort_order: index + 1,
    }));

  const existingPreview = normalizePortfolioMediaRows(entry.portfolio_media)
    .find((item) => item.asset_role === PORTFOLIO_PREVIEW_ASSET_ROLE);

  const savedMedia = await savePortfolioMediaList(supabase, portfolioEntryId, [
    {
      id: existingPreview?.id || null,
      media_type: 'image',
      asset_role: PORTFOLIO_PREVIEW_ASSET_ROLE,
      url: previewUrl,
      alt_text: altText,
      caption,
      sort_order: 0,
      is_cover: true,
    },
    ...galleryMedia,
  ]);

  const { data: updatedEntry, error: updateError } = await supabase
    .from('portfolio_entries')
    .update({
      website_url: normalizeOptionalUrl(websiteUrl),
    })
    .eq('id', portfolioEntryId)
    .select()
    .single();

  if (updateError) {
    throwMissingTable(updateError, 'portfolio_entries', 'Portfolio entries');
  }

  return {
    ...updatedEntry,
    portfolio_media: normalizePortfolioMediaRows(savedMedia),
  };
}

export async function deletePortfolioEntryById(id) {
  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from('portfolio_entries')
    .delete()
    .eq('id', id);

  if (error) {
    throwMissingTable(error, 'portfolio_entries', 'Portfolio entries');
  }

  return true;
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

export async function listCommunityBusinesses() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('community_businesses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throwMissingTable(error, 'community_businesses', 'Community businesses');
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

export async function saveCommunityBusiness(payload) {
  const supabase = getAdminSupabase();
  const { id, ...rawData } = payload;
  const data = {
    name: rawData.name || '',
    link: rawData.link || '',
    details: rawData.details || '',
  };

  if (id) {
    const { data: updated, error } = await supabase
      .from('community_businesses')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throwMissingTable(error, 'community_businesses', 'Community businesses');
    }

    return updated;
  }

  const { data: inserted, error } = await supabase
    .from('community_businesses')
    .insert([data])
    .select()
    .single();

  if (error) {
    throwMissingTable(error, 'community_businesses', 'Community businesses');
  }

  return inserted;
}

export async function deleteCommunityBusinessById(id) {
  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from('community_businesses')
    .delete()
    .eq('id', id);

  if (error) {
    throwMissingTable(error, 'community_businesses', 'Community businesses');
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
    const vendors = event.metadata?.vendors
      ? event.metadata.vendors.split(',').map((entry) => entry.trim()).filter(Boolean)
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

    for (const name of vendors) {
      const exists = existingCredits.some((credit) =>
        credit.name?.toLowerCase() === name.toLowerCase()
        && credit.role === 'vendor'
        && credit.event_id === event.id);

      if (exists) {
        skippedCount += 1;
        continue;
      }

      const { error } = await supabase.from('community_credits').insert([{
        name,
        role: 'vendor',
        event_id: event.id,
        event_name: event.name,
      }]);

      if (error) {
        throwMissingTable(error, 'community_credits', 'Community credits');
      }

      addedCount += 1;
      existingCredits.push({
        name,
        role: 'vendor',
        event_id: event.id,
        event_name: event.name,
      });
    }
  }

  return { addedCount, skippedCount };
}

export async function listEmailEntries() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('emails')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throwMissingTable(error, 'emails', 'Emails');
  }

  return data || [];
}

export async function saveEmailEntry(payload) {
  const supabase = getAdminSupabase();
  const { id, ...rawData } = payload;
  const data = {
    ...rawData,
    name: rawData.name || '',
    email: normalizeEmail(rawData.email),
    source: rawData.source || 'manual',
    sources: Array.isArray(rawData.sources) ? rawData.sources : [rawData.source || 'manual'],
    record_count: Number.isFinite(Number(rawData.recordCount)) ? Number(rawData.recordCount) : 1,
    latest_seen_at: rawData.latestSeenAt || new Date().toISOString(),
  };

  if (id) {
    const { data: updated, error } = await supabase
      .from('emails')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throwMissingTable(error, 'emails', 'Emails');
    }

    return updated;
  }

  const { data: inserted, error } = await supabase
    .from('emails')
    .insert([data])
    .select()
    .single();

  if (error) {
    throwMissingTable(error, 'emails', 'Emails');
  }

  return inserted;
}

export async function syncEmailEntries(entries = []) {
  const supabase = getAdminSupabase();
  const normalizedEntries = entries
    .map((entry) => ({
      name: entry.name || '',
      email: normalizeEmail(entry.email),
      source: entry.source || 'aggregate',
      sources: Array.isArray(entry.sources) ? entry.sources.filter(Boolean) : [],
      record_count: Number.isFinite(Number(entry.recordCount)) ? Number(entry.recordCount) : 1,
      latest_seen_at: entry.latestSeenAt || null,
    }))
    .filter((entry) => entry.email);

  if (normalizedEntries.length === 0) {
    return { insertedCount: 0 };
  }

  const uniqueEntriesByEmail = new Map();
  normalizedEntries.forEach((entry) => {
    if (!uniqueEntriesByEmail.has(entry.email)) {
      uniqueEntriesByEmail.set(entry.email, entry);
    }
  });

  const uniqueEntries = [...uniqueEntriesByEmail.values()];
  const { data: existingRows, error: existingError } = await supabase
    .from('emails')
    .select('email')
    .in('email', uniqueEntries.map((entry) => entry.email));

  if (existingError) {
    throwMissingTable(existingError, 'emails', 'Emails');
  }

  const existingEmails = new Set((existingRows || []).map((row) => normalizeEmail(row.email)));
  const missingEntries = uniqueEntries.filter((entry) => !existingEmails.has(entry.email));
  const existingEntries = uniqueEntries.filter((entry) => existingEmails.has(entry.email));
  const metadataUpdates = existingEntries.map((entry) => ({
    email: entry.email,
    sources: entry.sources,
    record_count: entry.record_count,
    latest_seen_at: entry.latest_seen_at,
  }));

  if (metadataUpdates.length > 0) {
    const updateResults = await Promise.all(metadataUpdates.map((entry) => (
      supabase
        .from('emails')
        .update({
          sources: entry.sources,
          record_count: entry.record_count,
          latest_seen_at: entry.latest_seen_at,
        })
        .eq('email', entry.email)
    )));

    const updateError = updateResults.find((result) => result.error)?.error;
    if (updateError) {
      throwMissingTable(updateError, 'emails', 'Emails');
    }
  }

  if (missingEntries.length === 0) {
    return { insertedCount: 0, updatedCount: metadataUpdates.length };
  }

  const { error } = await supabase
    .from('emails')
    .insert(missingEntries);

  if (error) {
    throwMissingTable(error, 'emails', 'Emails');
  }

  return { insertedCount: missingEntries.length, updatedCount: metadataUpdates.length };
}

export async function deleteEmailEntryById(id) {
  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from('emails')
    .delete()
    .eq('id', id);

  if (error) {
    throwMissingTable(error, 'emails', 'Emails');
  }

  return true;
}
