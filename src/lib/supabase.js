import { createClient } from '@supabase/supabase-js'
import { clientEnv } from './clientEnv'

const supabaseUrl = clientEnv.supabaseUrl
const supabaseAnonKey = clientEnv.supabaseAnonKey
export const hasSupabaseCredentials = Boolean(supabaseUrl && supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. App may have limited functionality.')
}

// Export a dummy client if keys are missing to prevent total crash
export const supabase = hasSupabaseCredentials
  ? createClient(supabaseUrl, supabaseAnonKey)
  : { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) } };
