import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — set them in .env.local',
  );
}

// Session persists in localStorage by default (survives refresh/new tabs
// until sign-out or expiry) — this is what backs the "stay logged in after
// refresh" behavior instead of the old sessionStorage role/actor cache.
export const supabase = createClient(url, publishableKey);
