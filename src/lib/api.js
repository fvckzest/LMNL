function extractErrorMessage(payload, fallback) {
  return payload?.error?.message || payload?.message || fallback;
}

async function buildHeaders(options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.auth) {
    const { supabase } = await import('./supabase');
    const { data } = await supabase.auth.getSession();
    const accessToken = data?.session?.access_token;

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
