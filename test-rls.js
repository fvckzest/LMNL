import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=')
  if (key && val.length > 0) env[key.trim()] = val.join('=').trim()
})

const serviceClient = createClient(env['VITE_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

async function main() {
  const { data, error } = await serviceClient
    .rpc('get_policies') || await serviceClient.from('pg_policies').select('*').eq('tablename', 'tickets');
    
  if (error) {
    console.error("Error fetching policies:", error);
  } else {
    console.log("Policies for 'tickets':", data);
  }
}

main()
