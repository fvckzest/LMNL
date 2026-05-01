import { getAdminSupabase } from './clients.js';
import { AppError } from './http.js';

function extractBearerToken(authorizationHeader = '') {
  const match = String(authorizationHeader).match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

export async function requireAdminUser(req, deps = {}) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  const accessToken = extractBearerToken(authHeader);

  if (!accessToken) {
    throw new AppError('Admin authentication required.', {
      code: 'UNAUTHORIZED',
      status: 401,
      expose: true,
    });
  }

  const supabase = deps.supabase || getAdminSupabase();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data?.user) {
    throw new AppError('Admin authentication required.', {
      code: 'UNAUTHORIZED',
      status: 401,
      details: error,
      expose: true,
    });
  }

  return data.user;
}
