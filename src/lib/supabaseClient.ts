import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bzpotcqlatuqaakgjizw.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6cG90Y3FsYXR1cWFha2dqaXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTQzMjcsImV4cCI6MjA5MzIzMDMyN30.MFTQAwYCGxZaMq_KU3Dkgyh2c0Aq5aCpEHf4QWQ9lSI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
