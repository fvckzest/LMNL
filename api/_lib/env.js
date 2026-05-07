import { AppError } from './errors.js';
import fs from 'fs';
import path from 'path';

function readEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function readCsvEnv(name) {
  return readEnv(name)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function requireEnv(names, scope) {
  const missing = names.filter((name) => !readEnv(name));
  if (missing.length > 0) {
    throw new AppError(`Missing required environment variables for ${scope}.`, {
      code: 'CONFIG_MISSING',
      status: 500,
      details: { scope, missing },
      expose: true,
    });
  }
}

export function getBaseConfig() {
  return {
    siteUrl: readEnv('SITE_URL') || 'https://lmnl.art',
    squareWebhookUrl: readEnv('SQUARE_WEBHOOK_URL') || 'https://lmnl.art/api/square-webhook',
    squareWebhookSignatureKey: readEnv('SQUARE_WEBHOOK_SIGNATURE_KEY'),
    discordApplicationId: readEnv('DISCORD_APPLICATION_ID'),
    discordBotToken: readEnv('DISCORD_BOT_TOKEN'),
    discordPublicKey: readEnv('DISCORD_PUBLIC_KEY'),
    discordTicketChannelId: readEnv('DISCORD_TICKET_CHANNEL_ID'),
    nodeEnv: readEnv('NODE_ENV') || 'development',
  };
}

export function getSquareConfig() {
  const environment = readEnv('SQUARE_ENVIRONMENT') === 'production' ? 'production' : 'sandbox';
  const token = environment === 'production'
    ? (readEnv('SQUARE_PROD_ACCESS_TOKEN') || readEnv('SQUARE_ACCESS_TOKEN'))
    : readEnv('SQUARE_ACCESS_TOKEN');
  const applicationId = environment === 'production'
    ? (readEnv('SQUARE_PROD_APPLICATION_ID') || readEnv('SQUARE_APPLICATION_ID'))
    : (readEnv('SQUARE_SANDBOX_APPLICATION_ID') || readEnv('SQUARE_APPLICATION_ID'));

  if (!token) {
    throw new AppError('Square access token is missing.', {
      code: 'CONFIG_MISSING',
      status: 500,
      details: { scope: 'square', missing: ['SQUARE_ACCESS_TOKEN'] },
      expose: true,
    });
  }

  if (!applicationId) {
    throw new AppError('Square application ID is missing.', {
      code: 'CONFIG_MISSING',
      status: 500,
      details: {
        scope: 'square',
        missing: [environment === 'production' ? 'SQUARE_PROD_APPLICATION_ID' : 'SQUARE_SANDBOX_APPLICATION_ID'],
      },
      expose: true,
    });
  }

  return {
    environment,
    token,
    applicationId,
    locationId: readEnv('SQUARE_LOCATION_ID'),
    webhookSignatureKey: readEnv('SQUARE_WEBHOOK_SIGNATURE_KEY'),
  };
}

export function getSupabaseConfig() {
  requireEnv(['SUPABASE_URL'], 'supabase');
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = readEnv('SUPABASE_ANON_KEY') || readEnv('VITE_SUPABASE_ANON_KEY');

  if (!serviceRoleKey && !anonKey) {
    throw new AppError('Supabase service credentials are missing.', {
      code: 'CONFIG_MISSING',
      status: 500,
      details: {
        scope: 'supabase',
        missing: ['SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY'],
      },
      expose: true,
    });
  }

  return {
    url: readEnv('SUPABASE_URL'),
    serviceRoleKey,
    anonKey,
  };
}

export function getAdminAuthorizationConfig() {
  const source = readEnv('ADMIN_AUTH_SOURCE') || 'auto';
  const allowedSources = new Set(['auto', 'table', 'env']);

  return {
    source: allowedSources.has(source) ? source : 'auto',
    adminUserIds: readCsvEnv('ADMIN_USER_IDS'),
    adminUserEmails: readCsvEnv('ADMIN_USER_EMAILS').map((email) => email.toLowerCase()),
  };
}

export function getResendConfig() {
  requireEnv(['RESEND_API_KEY'], 'resend');
  return {
    apiKey: readEnv('RESEND_API_KEY'),
  };
}

export function getTurnstileConfig() {
  requireEnv(['TURNSTILE_SECRET_KEY'], 'turnstile');
  return {
    secretKey: readEnv('TURNSTILE_SECRET_KEY'),
  };
}

export function getApplePassConfig() {
  const certificatePath = readEnv('APPLE_PASS_CERTIFICATE_PATH');
  const resolvedCertificatePath = certificatePath
    ? path.resolve(process.cwd(), certificatePath)
    : '';
  const certificateBase64 = readEnv('APPLE_PASS_CERTIFICATE')
    || (resolvedCertificatePath && fs.existsSync(resolvedCertificatePath)
      ? fs.readFileSync(resolvedCertificatePath, 'utf8').trim()
      : '');

  return {
    passTypeIdentifier: readEnv('APPLE_PASS_TYPE_IDENTIFIER'),
    teamIdentifier: readEnv('APPLE_TEAM_ID'),
    certificateBase64,
    certificatePassword: readEnv('APPLE_PASS_CERTIFICATE_PASSWORD'),
    certificatePath: resolvedCertificatePath,
  };
}

export function getApplePassConfigMissingFields(config = getApplePassConfig()) {
  const missing = [];

  if (!config.passTypeIdentifier) {
    missing.push('APPLE_PASS_TYPE_IDENTIFIER');
  }

  if (!config.teamIdentifier) {
    missing.push('APPLE_TEAM_ID');
  }

  if (!config.certificateBase64) {
    missing.push('APPLE_PASS_CERTIFICATE or APPLE_PASS_CERTIFICATE_PATH');
  }

  return missing;
}
