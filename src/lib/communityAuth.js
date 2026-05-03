const DEFAULT_COMMUNITY_PATH = '/app';
const COMMUNITY_LOGIN_PATH = '/app/login';
const COMMUNITY_ONBOARDING_PATH = '/app/onboarding';

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

export function readCommunityNextPath(search) {
  return sanitizeCommunityNextPath(new URLSearchParams(search || '').get('next'));
}

export function buildCommunityLoginPath(nextPath) {
  const safeNextPath = sanitizeCommunityNextPath(nextPath);

  if (safeNextPath === DEFAULT_COMMUNITY_PATH) {
    return COMMUNITY_LOGIN_PATH;
  }

  return `${COMMUNITY_LOGIN_PATH}?next=${encodeURIComponent(safeNextPath)}`;
}

export function buildCommunityOnboardingPath(nextPath) {
  const safeNextPath = sanitizeCommunityNextPath(nextPath);

  if (safeNextPath === DEFAULT_COMMUNITY_PATH || safeNextPath === COMMUNITY_ONBOARDING_PATH) {
    return COMMUNITY_ONBOARDING_PATH;
  }

  return `${COMMUNITY_ONBOARDING_PATH}?next=${encodeURIComponent(safeNextPath)}`;
}

export function buildCommunityAuthRedirectTo(origin, nextPath) {
  const safeOrigin = String(origin || '').trim().replace(/\/$/, '');
  const safeNextPath = sanitizeCommunityNextPath(nextPath);

  if (!safeOrigin) {
    return `/auth/callback?next=${encodeURIComponent(safeNextPath)}`;
  }

  return `${safeOrigin}/auth/callback?next=${encodeURIComponent(safeNextPath)}`;
}

export function buildCommunityAuthPreflightUrl(authUrl) {
  const parsedUrl = new URL(String(authUrl || '').trim());
  parsedUrl.searchParams.set('skip_http_redirect', 'true');
  return parsedUrl.toString();
}
