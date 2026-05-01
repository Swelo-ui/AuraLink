import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bzpotcqlatuqaakgjizw.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Ok4i_JBGb-qq32Ts8aw75A_zErGIdwh'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
