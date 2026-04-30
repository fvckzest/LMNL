import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { SquareClient, SquareEnvironment } from 'square';
import { getSquareConfig, getSupabaseConfig, getResendConfig } from './env.js';

let squareClient;
let supabaseAdmin;
let resendClient;
let squareLocationIdPromise;

export function getSquareClient() {
  if (!squareClient) {
    const config = getSquareConfig();
    squareClient = new SquareClient({
      token: config.token,
      environment: config.environment === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
    });
  }

  return squareClient;
}

export function getAdminSupabase() {
  if (!supabaseAdmin) {
    const config = getSupabaseConfig();
    supabaseAdmin = createClient(config.url, config.serviceRoleKey);
  }

  return supabaseAdmin;
}

export function getResendClient() {
  if (!resendClient) {
    const config = getResendConfig();
    resendClient = new Resend(config.apiKey);
  }

  return resendClient;
}

export async function getSquareLocationId() {
  const config = getSquareConfig();
  if (config.locationId) {
    return config.locationId;
  }

  if (!squareLocationIdPromise) {
    squareLocationIdPromise = (async () => {
      const response = await getSquareClient().locations.list();
      const locations = response.locations || response.result?.locations || [];
      const activeLocation = locations.find((location) => location.status === 'ACTIVE');
      return activeLocation?.id || locations[0]?.id || null;
    })();
  }

  return squareLocationIdPromise;
}
