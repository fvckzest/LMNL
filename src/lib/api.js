import { clientEnv } from './clientEnv';

function extractErrorMessage(payload, fallback) {
  return payload?.error?.message || payload?.message || fallback;
}

let authTokenCache = null;
let authTokenPromise = null;

async function getAccessToken() {
  if (authTokenCache?.token && authTokenCache.expiresAt > Date.now()) {
    return authTokenCache.token;
  }

  if (authTokenPromise) {
    return authTokenPromise;
  }

  authTokenPromise = import('./supabase')
    .then(async ({ supabase }) => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session || null;
      const accessToken = session?.access_token || '';
      const expiresAt = session?.expires_at
        ? (session.expires_at * 1000) - 30_000
        : Date.now() + 10_000;

      authTokenCache = {
        token: accessToken,
        expiresAt,
      };

      return accessToken;
    })
    .finally(() => {
      authTokenPromise = null;
    });

  return authTokenPromise;
}

async function buildHeaders(options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.auth) {
    const accessToken = await getAccessToken();

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  return headers;
}

export async function apiGet(path, options = {}) {
  const response = await fetch(path, {
    method: 'GET',
    headers: await buildHeaders(options),
  });
  const payload = await response.json();

  if (!response.ok || !payload?.success) {
    throw new Error(extractErrorMessage(payload, 'Request failed.'));
  }

  return payload.data;
}

export async function apiPost(path, body, options = {}) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await buildHeaders(options)),
    },
    body: JSON.stringify(body || {}),
  });

  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(extractErrorMessage(payload, 'Request failed.'));
  }

  return payload.data;
}

export function getTurnstileSiteKey() {
  return clientEnv.turnstileSiteKey || '';
}
