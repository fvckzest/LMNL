import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const PROVIDERS = ['google', 'discord', 'apple'];
const DEFAULT_REDIRECT_TO = 'http://127.0.0.1:4174/auth/callback?next=%2Fapp';

function readEnvFile(pathname) {
  const text = fs.readFileSync(pathname, 'utf8');

  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.trim().startsWith('#') && line.includes('='))
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      }),
  );
}

function readSnippet(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 180);
}

async function verifyProvider({ supabase, provider, redirectTo }) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    return {
      provider,
      ok: false,
      phase: 'signInWithOAuth',
      status: null,
      message: error.message || 'Unknown sign-in error.',
    };
  }

  const authorizeUrl = new URL(data.url);
  authorizeUrl.searchParams.set('skip_http_redirect', 'true');

  const response = await fetch(authorizeUrl, {
    headers: {
      Accept: 'application/json',
    },
  });

  const text = await response.text();
  const looksEnabled = response.ok
    && (text.includes('accounts.google.com')
      || text.includes('discord.com/oauth2')
      || text.includes('appleid.apple.com')
      || text.includes('<html'));

  return {
    provider,
    ok: looksEnabled,
    phase: 'authorize-preflight',
    status: response.status,
    message: looksEnabled
      ? 'Provider authorize flow responded successfully.'
      : readSnippet(text) || 'Unexpected authorize response.',
  };
}

async function main() {
  const env = readEnvFile('.env');
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
  const redirectTo = process.env.COMMUNITY_AUTH_REDIRECT_TO || DEFAULT_REDIRECT_TO;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const results = [];

  for (const provider of PROVIDERS) {
    try {
      results.push(await verifyProvider({ supabase, provider, redirectTo }));
    } catch (error) {
      results.push({
        provider,
        ok: false,
        phase: 'exception',
        status: null,
        message: error.message || 'Unexpected verification error.',
      });
    }
  }

  console.log(JSON.stringify({
    redirectTo,
    checkedAt: new Date().toISOString(),
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
