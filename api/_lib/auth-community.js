import { getAdminSupabase } from './clients.js';
import { AppError } from './http.js';

const COMMUNITY_AUTH_PROVIDERS = ['google', 'discord', 'apple'];

function extractBearerToken(authorizationHeader = '') {
  const match = String(authorizationHeader).match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function normalizeProvider(value) {
  return String(value || '').trim().toLowerCase();
}

export function isEligibleCommunityAuthUser(user) {
  if (!user?.id) {
    return false;
  }

  const primaryProvider = normalizeProvider(user?.app_metadata?.provider);
  const providerList = Array.isArray(user?.app_metadata?.providers)
    ? user.app_metadata.providers.map(normalizeProvider)
    : [];

  if (COMMUNITY_AUTH_PROVIDERS.includes(primaryProvider)) {
    return true;
  }

  return providerList.some((provider) => COMMUNITY_AUTH_PROVIDERS.includes(provider));
}

export async function requireCommunityUser(req, deps = {}) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  const accessToken = extractBearerToken(authHeader);

  if (!accessToken) {
    throw new AppError('Community authentication required.', {
      code: 'UNAUTHORIZED',
      status: 401,
      expose: true,
    });
  }

  const supabase = deps.supabase || getAdminSupabase();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data?.user) {
    throw new AppError('Community authentication required.', {
      code: 'UNAUTHORIZED',
      status: 401,
      details: error,
      expose: true,
    });
  }

  if (!isEligibleCommunityAuthUser(data.user)) {
    throw new AppError('This session is not eligible for community app access.', {
      code: 'FORBIDDEN',
      status: 403,
      expose: true,
    });
  }

  return data.user;
}
