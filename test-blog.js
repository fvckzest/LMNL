import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Testing insert...');
  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .insert([{
      title: 'Test Post',
      content: 'This is a test.',
      author: 'Admin',
      status: 'draft',
    }])
    .select()
    .single();

  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Insert Success:', data);
  }
}

run();
