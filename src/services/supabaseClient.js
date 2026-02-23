import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// --- DEBUG CHECK ---
// Open your browser console (F12) to see this log
console.log("Supabase Debug:", {
  HasUrl: !!supabaseUrl, 
  HasKey: !!supabaseAnonKey,
  KeyLength: supabaseAnonKey ? supabaseAnonKey.length : 0
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL: Supabase keys are missing! Check your .env or Vercel Settings.");
}
// -------------------

export const supabase = createClient(supabaseUrl, supabaseAnonKey)