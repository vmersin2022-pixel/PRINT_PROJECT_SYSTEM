import { createClient } from '@supabase/supabase-js';

// CRITICAL FIX FOR VERCEL:
// Modern bundlers (Vite) do not have `process` defined in the browser. 
// Accessing it directly causes a "White Screen" crash.
// We use import.meta.env for Vite, or fall back to your hardcoded strings.

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://vwspjdsmdxmbzrancyhy.supabase.co';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Mo0HevL9J2TrfYEj1CY__Q_AxFm-Gct';

export const supabase = createClient(supabaseUrl, supabaseKey);