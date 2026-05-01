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
  const tables = ['requests', 'events', 'service_inquiries', 'tickets']
  for (const table of tables) {
    const { data, error } = await serviceClient.from(table).select('*')
    console.log(`Table: ${table}`)
    console.log(`Error:`, error ? error.message : null)
    console.log(`Data length:`, data ? data.length : null)
  }
}

main()
