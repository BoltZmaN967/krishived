import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// In demo mode (no env vars set) the app runs entirely on mock data so the
// UI can be reviewed before any backend is wired up. Once VITE_SUPABASE_URL
// and VITE_SUPABASE_ANON_KEY are set in .env, real queries take over —
// see src/lib/api.js for every place that switches on `isDemoMode`.
export const isDemoMode = !url || !anonKey || url.includes('YOUR-PROJECT');

export const supabase = isDemoMode
  ? null
  : createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
