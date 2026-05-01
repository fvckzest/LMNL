import { AppError } from './errors.js';
import fs from 'fs';
import path from 'path';

function readEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
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
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY') || readEnv('SUPABASE_ANON_KEY');

  if (!serviceRoleKey) {
    throw new AppError('Supabase service credentials are missing.', {
      code: 'CONFIG_MISSING',
      status: 500,
      details: {
        scope: 'supabase',
        missing: ['SUPABASE_SERVICE_ROLE_KEY'],
      },
      expose: true,
    });
  }

  return {
    url: readEnv('SUPABASE_URL'),
    serviceRoleKey,
  };
}

export function getResendConfig() {
  requireEnv(['RESEND_API_KEY'], 'resend');
  return {
    apiKey: readEnv('RESEND_API_KEY'),
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
