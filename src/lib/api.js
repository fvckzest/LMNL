function extractErrorMessage(payload, fallback) {
  return payload?.error?.message || payload?.message || fallback;
}

export async function apiGet(path) {
  const response = await fetch(path);
  const payload = await response.json();

  if (!response.ok || !payload?.success) {
    throw new Error(extractErrorMessage(payload, 'Request failed.'));
  }

  return payload.data;
}

export async function apiPost(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });

  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(extractErrorMessage(payload, 'Request failed.'));
  }

  return payload.data;
}
