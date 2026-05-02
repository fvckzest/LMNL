import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*');

  if (error) {
    console.error('Select Error:', error);
  } else {
    console.log('Select Data:', data);
  }
}

run();
