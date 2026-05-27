import { clientEnv } from './clientEnv';

const supabaseUrl = clientEnv.supabaseUrl;
const supabaseAnonKey = clientEnv.supabaseAnonKey;

export const hasPublicDataCredentials = Boolean(supabaseUrl && supabaseAnonKey);

function buildRestUrl(table, {
  select = '*',
  filters = {},
  order,
  limit,
} = {}) {
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  url.searchParams.set('select', select);

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (value === null) {
      url.searchParams.set(key, 'is.null');
      return;
    }

    url.searchParams.set(key, `eq.${value}`);
  });

  if (order?.column) {
    url.searchParams.set(
      'order',
      `${order.column}.${order.ascending === false ? 'desc' : 'asc'}`,
    );
  }

  if (Number.isFinite(limit) && limit > 0) {
    url.searchParams.set('limit', String(limit));
  }

  return url;
}

export async function fetchPublicRows(table, options = {}) {
  if (!hasPublicDataCredentials) {
    return options.single ? null : [];
  }

  const headers = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  };

  if (options.single) {
    headers.Accept = 'application/vnd.pgrst.object+json';
  }

  const response = await fetch(buildRestUrl(table, options), { headers });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || `Failed to load ${table}.`);
    error.details = payload;
    throw error;
  }

  return payload ?? (options.single ? null : []);
}
