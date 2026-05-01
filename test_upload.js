import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bzpotcqlatuqaakgjizw.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6cG90Y3FsYXR1cWFha2dqaXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTQzMjcsImV4cCI6MjA5MzIzMDMyN30.MFTQAwYCGxZaMq_KU3Dkgyh2c0Aq5aCpEHf4QWQ9lSI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Testing upload...");
  // Try to upload an anonymous file. This should fail RLS if bucket exists, or fail with 404 if bucket doesn't exist.
  const { data, error } = await supabase.storage.from('uploads').upload('test/test.txt', 'hello world', { upsert: false });
  if (error) {
    console.log("Upload Error:", error);
  } else {
    console.log("Success:", data);
  }
}
test();
