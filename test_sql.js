import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bzpotcqlatuqaakgjizw.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6cG90Y3FsYXR1cWFha2dqaXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTQzMjcsImV4cCI6MjA5MzIzMDMyN30.MFTQAwYCGxZaMq_KU3Dkgyh2c0Aq5aCpEHf4QWQ9lSI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.rpc('hello_world'); // Just to ping
  // Actually we can't test SQL directly with anon key without a function.
  // But let's check the bucket policies.
}
test();
