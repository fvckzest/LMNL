import { getAdminSupabase } from './clients.js';
import { getAdminAuthorizationConfig } from './env.js';
import { AppError } from './http.js';

function extractBearerToken(authorizationHeader = '') {
  const match = String(authorizationHeader).match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isMissingAdminUsersTable(error) {
  return error?.code === 'PGRST205' && String(error.message || '').includes('admin_users');
}

function isListedAdmin(user, config) {
  const email = normalizeEmail(user?.email);
  return config.adminUserIds.includes(user?.id) || (email && config.adminUserEmails.includes(email));
}

export async function assertAdminAccess(user, deps = {}) {
  const supabase = deps.supabase || getAdminSupabase();
  const config = deps.config || getAdminAuthorizationConfig();
  const envMatch = isListedAdmin(user, config);

  if (config.source === 'env') {
    if (envMatch) {
      return { source: 'env' };
    }

    throw new AppError('Admin access denied.', {
      code: 'FORBIDDEN',
      status: 403,
      expose: true,
    });
  }

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    if (isMissingAdminUsersTable(error) && config.source === 'auto' && envMatch) {
      return { source: 'env_fallback' };
    }

    if (isMissingAdminUsersTable(error)) {
      throw new AppError('Admin authorization is not configured.', {
        code: 'ADMIN_AUTH_NOT_CONFIGURED',
        status: 503,
        details: {
          source: config.source,
          missing: ['admin_users table or ADMIN_USER_IDS / ADMIN_USER_EMAILS'],
        },
        expose: true,
      });
    }

    throw new AppError('Unable to verify admin access.', {
      code: 'ADMIN_AUTH_CHECK_FAILED',
      status: 500,
      details: error,
      expose: true,
    });
  }

  if (data?.user_id) {
    return { source: 'table' };
  }

  if (config.source === 'auto' && envMatch) {
    return { source: 'env_fallback' };
  }

  throw new AppError('Admin access denied.', {
    code: 'FORBIDDEN',
    status: 403,
    expose: true,
  });
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

  const authorizationSupabase = deps.authorizationSupabase
    || deps.supabase
    || getAdminSupabase();

  await assertAdminAccess(data.user, {
    supabase: authorizationSupabase,
    config: deps.config,
  });

  return data.user;
}
