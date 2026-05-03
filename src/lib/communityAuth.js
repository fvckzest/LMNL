const DEFAULT_COMMUNITY_PATH = '/app';

export function sanitizeCommunityNextPath(nextPath) {
  if (typeof nextPath !== 'string') {
    return DEFAULT_COMMUNITY_PATH;
  }

  const value = nextPath.trim();
  if (!value.startsWith('/app')) {
    return DEFAULT_COMMUNITY_PATH;
  }

  if (value.startsWith('/app//')) {
    return DEFAULT_COMMUNITY_PATH;
  }

  return value || DEFAULT_COMMUNITY_PATH;
}

export function buildCommunityAuthRedirectTo(origin, nextPath) {
  const safeOrigin = String(origin || '').trim().replace(/\/$/, '');
  const safeNextPath = sanitizeCommunityNextPath(nextPath);

  if (!safeOrigin) {
    return `/auth/callback?next=${encodeURIComponent(safeNextPath)}`;
  }

  return `${safeOrigin}/auth/callback?next=${encodeURIComponent(safeNextPath)}`;
}
