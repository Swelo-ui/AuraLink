import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

/**
 * Check if Supabase is properly configured.
 * Instead of throwing at module load (which crashes the entire app),
 * we expose a flag so the UI can show a friendly message.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

let _supabase: SupabaseClient<Database> | null = null

if (isSupabaseConfigured) {
    _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
        realtime: {
            params: {
                eventsPerSecond: 10,
            },
        },
    })
}

/**
 * Get the Supabase client. Throws a user-friendly error if not configured.
 * Use `isSupabaseConfigured` to check before calling this in optional paths.
 */
export function getSupabase(): SupabaseClient<Database> {
    if (!_supabase) {
        throw new Error(
            'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
        )
    }
    return _supabase
}

// Default export for backward compatibility — most of the app uses `supabase` directly
export const supabase = _supabase as SupabaseClient<Database>
