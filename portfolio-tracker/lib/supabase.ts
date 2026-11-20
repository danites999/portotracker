import { createClient } from '@supabase/supabase-js'
// Tanpa env var Supabase, aplikasi berjalan tanpa login (data di localStorage).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const sb = url && key ? createClient(url, key) : null
