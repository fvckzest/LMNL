/* global process */

const nextEnv =
  typeof process !== 'undefined' && process?.env
    ? {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        NEXT_PUBLIC_SOCIAL_SYSTEM_PHASE: process.env.NEXT_PUBLIC_SOCIAL_SYSTEM_PHASE,
        NEXT_PUBLIC_SOCIAL_SYSTEM_ENABLED: process.env.NEXT_PUBLIC_SOCIAL_SYSTEM_ENABLED,
        NEXT_PUBLIC_SOCIAL_SYSTEM_PREVIEW_ROUTES: process.env.NEXT_PUBLIC_SOCIAL_SYSTEM_PREVIEW_ROUTES,
      }
    : {};

function readEnvValue(name) {
  if (Object.prototype.hasOwnProperty.call(nextEnv, name)) {
    return nextEnv[name];
  }

  return undefined;
}

export function getClientEnvValue(names, fallback = '') {
  const candidates = Array.isArray(names) ? names : [names];

  for (const name of candidates) {
    const value = readEnvValue(name);

    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return fallback;
}

export function getClientEnv(names = {}) {
  return Object.fromEntries(
    Object.entries(names).map(([key, candidates]) => [
      key,
      getClientEnvValue(candidates),
    ]),
  );
}

export const clientEnv = Object.freeze({
  supabaseUrl: getClientEnvValue('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: getClientEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  turnstileSiteKey: getClientEnvValue('NEXT_PUBLIC_TURNSTILE_SITE_KEY'),
  socialSystemPhase: getClientEnvValue('NEXT_PUBLIC_SOCIAL_SYSTEM_PHASE'),
  socialSystemEnabled: getClientEnvValue('NEXT_PUBLIC_SOCIAL_SYSTEM_ENABLED'),
  socialSystemPreviewRoutes: getClientEnvValue('NEXT_PUBLIC_SOCIAL_SYSTEM_PREVIEW_ROUTES'),
});
