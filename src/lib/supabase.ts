import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes('placeholder-project') &&
      !supabaseAnonKey.includes('placeholder-anon-key'),
  )
}

// Fallback valid URL if not provided to prevent createClient throwing on init
const safeUrl = isSupabaseConfigured() && supabaseUrl ? supabaseUrl : 'https://dummy-app.supabase.co'
const safeKey = isSupabaseConfigured() && supabaseAnonKey ? supabaseAnonKey : 'dummy-anon-key'

export const supabase: SupabaseClient = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
