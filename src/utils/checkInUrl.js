function isLocalHostname(hostname = '') {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function getAdminOrigin(locationLike) {
  if (!locationLike) {
    return 'https://admin.lmnl.art';
  }

  const protocol = locationLike.protocol || 'https:';
  const hostname = locationLike.hostname || 'admin.lmnl.art';
  const port = locationLike.port ? `:${locationLike.port}` : '';

  if (isLocalHostname(hostname) || hostname.startsWith('admin.')) {
    return `${protocol}//${hostname}${port}`;
  }

  const bareHostname = hostname.replace(/^www\./i, '');
  return `${protocol}//admin.${bareHostname}${port}`;
}

export function buildAdminCheckInUrl(token, locationLike = typeof window !== 'undefined' ? window.location : undefined) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    return '';
  }

  return `${getAdminOrigin(locationLike)}/check-in/${encodeURIComponent(normalizedToken)}`;
}
