import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=')
  if (key && val.length > 0) env[key.trim()] = val.join('=').trim()
})

const anonClient = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY'])

async function main() {
  const tables = ['requests', 'events', 'service_inquiries', 'tickets']
  for (const table of tables) {
    const { data, error } = await anonClient.from(table).select('*').limit(1)
    console.log(`Table: ${table}`)
    console.log(`Error:`, error ? error.message : null)
    console.log(`Data length:`, data ? data.length : null)
  }
}

main()
