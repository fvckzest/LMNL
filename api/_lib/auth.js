import { getAdminSupabase, getUserScopedSupabase } from './clients.js';
import { getAdminAuthorizationConfig, getSupabaseConfig } from './env.js';
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

function isMissingAdminCheckFunction(error) {
  return error?.code === 'PGRST202' && String(error.message || '').includes('is_admin_user');
}

function isListedAdmin(user, config) {
  const email = normalizeEmail(user?.email);
  return config.adminUserIds.includes(user?.id) || (email && config.adminUserEmails.includes(email));
}

export function resolveAuthorizationSupabase(accessToken, deps = {}) {
  if (deps.authorizationSupabase) {
    return deps.authorizationSupabase;
  }

  if (deps.supabase) {
    return deps.supabase;
  }

  const config = deps.supabaseConfig || getSupabaseConfig();
  if (config.serviceRoleKey) {
    return deps.adminSupabase || getAdminSupabase();
  }

  return deps.userScopedSupabase || getUserScopedSupabase(accessToken);
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

  let data = null;
  let error = null;
  let usedTableFallback = false;

  const rpcResponse = await supabase.rpc('is_admin_user', {
    check_user_id: user.id,
  });

  if (!rpcResponse.error) {
    if (rpcResponse.data === true) {
      return { source: 'function' };
    }
  } else if (!isMissingAdminCheckFunction(rpcResponse.error)) {
    error = rpcResponse.error;
  }

  if (error) {
    throw new AppError('Unable to verify admin access.', {
      code: 'ADMIN_AUTH_CHECK_FAILED',
      status: 500,
      details: error,
      expose: true,
    });
  }

  if (rpcResponse.error && isMissingAdminCheckFunction(rpcResponse.error)) {
    usedTableFallback = true;
    ({ data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle());
  }

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
    return { source: usedTableFallback ? 'table_fallback' : 'table' };
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

  const authorizationSupabase = resolveAuthorizationSupabase(accessToken, deps);

  await assertAdminAccess(data.user, {
    supabase: authorizationSupabase,
    config: deps.config,
  });

  return data.user;
}
