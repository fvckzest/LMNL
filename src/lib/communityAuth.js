const DEFAULT_COMMUNITY_PATH = '/app';
const COMMUNITY_LOGIN_PATH = '/app/login';
const COMMUNITY_ONBOARDING_PATH = '/app/onboarding';
const COMMUNITY_DASHBOARD_PATH = '/dashboard';
const COMMUNITY_BASE_PATH_PATTERN = /^(.*?)(\/auth\/callback|\/app(?:\/login|\/onboarding)?|\/dashboard(?:\/[^/?#]+)?)(?:\/|$)/;

export function sanitizeCommunityNextPath(nextPath) {
  if (typeof nextPath !== 'string') {
    return DEFAULT_COMMUNITY_PATH;
  }

  const value = nextPath.trim();
  if (!value.startsWith('/')) {
    return DEFAULT_COMMUNITY_PATH;
  }

  if (value.startsWith('/app//')) {
    return DEFAULT_COMMUNITY_PATH;
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(value, 'https://lmnl.local');
  } catch {
    return DEFAULT_COMMUNITY_PATH;
  }

  const pathname = parsedUrl.pathname || DEFAULT_COMMUNITY_PATH;
  const isCommunityPath = (
    pathname === DEFAULT_COMMUNITY_PATH
    || pathname.startsWith(`${DEFAULT_COMMUNITY_PATH}/`)
    || pathname === COMMUNITY_DASHBOARD_PATH
    || pathname.startsWith(`${COMMUNITY_DASHBOARD_PATH}/`)
  );

  if (!isCommunityPath) {
    return DEFAULT_COMMUNITY_PATH;
  }

  if (pathname === COMMUNITY_LOGIN_PATH || pathname.startsWith(`${COMMUNITY_LOGIN_PATH}/`)) {
    return DEFAULT_COMMUNITY_PATH;
  }

  return `${pathname}${parsedUrl.search}${parsedUrl.hash}` || DEFAULT_COMMUNITY_PATH;
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

function readCommunityAppBasePath(pathname) {
  const value = String(pathname || '').trim();

  if (!value || value === '/') {
    return '';
  }

  const match = value.match(COMMUNITY_BASE_PATH_PATTERN);
  const prefix = match?.[1] || '';

  if (!prefix || prefix === '/') {
    return '';
  }

  return prefix.replace(/\/$/, '');
}

export function buildCommunityAuthRedirectTo(origin, nextPath, pathname = '') {
  const safeOrigin = String(origin || '').trim().replace(/\/$/, '');
  const safeNextPath = sanitizeCommunityNextPath(nextPath);
  const basePath = readCommunityAppBasePath(pathname);
  const callbackPath = `${basePath}/auth/callback`;

  if (!safeOrigin) {
    return `${callbackPath}?next=${encodeURIComponent(safeNextPath)}`;
  }

  return `${safeOrigin}${callbackPath}?next=${encodeURIComponent(safeNextPath)}`;
}

export function buildCommunityAuthPreflightUrl(authUrl) {
  const parsedUrl = new URL(String(authUrl || '').trim());
  parsedUrl.searchParams.set('skip_http_redirect', 'true');
  return parsedUrl.toString();
}
