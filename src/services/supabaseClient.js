import { createClient } from '@supabase/supabase-client'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// If these are undefined, the app will throw a clear error here
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase missing URL or Anon Key. Check your .env file!")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)