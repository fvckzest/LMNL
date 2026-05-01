import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=')
  if (key && val.length > 0) env[key.trim()] = val.join('=').trim()
})

const supabaseUrl = env['VITE_SUPABASE_URL']
const anonKey = env['VITE_SUPABASE_ANON_KEY']
const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY']

async function main() {
  const anonClient = createClient(supabaseUrl, anonKey)
  const serviceClient = createClient(supabaseUrl, serviceKey)

  console.log("Fetching with Anon Key:")
  const { data: anonData, error: anonError } = await anonClient.from('tickets').select('*')
  console.log("Anon Error:", anonError)
  console.log("Anon Data length:", anonData ? anonData.length : null)

  console.log("\nFetching with Service Key:")
  const { data: serviceData, error: serviceError } = await serviceClient.from('tickets').select('*')
  console.log("Service Error:", serviceError)
  console.log("Service Data length:", serviceData ? serviceData.length : null)
}

main()
