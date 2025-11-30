// ============================================
// Supabase Client Setup for Web App
// ============================================

import { initSupabase, getSupabase } from '@birchvault/supabase-client';
import type { SupabaseClient } from '@birchvault/supabase-client';

let initialized = false;

export function getSupabaseClient(): SupabaseClient {
  if (!initialized) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error(
        'Missing Supabase environment variables. ' +
        'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }

    initSupabase({ url, anonKey });
    initialized = true;
  }

  return getSupabase();
}







