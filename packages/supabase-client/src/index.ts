// ============================================
// BirchVault Supabase Client
// ============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type { Database } from './database.types';

let supabaseClient: SupabaseClient<Database> | null = null;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Initialize the Supabase client
 */
export function initSupabase(config: SupabaseConfig): SupabaseClient<Database> {
  if (!config.url || !config.anonKey) {
    throw new Error('Supabase URL and anon key are required');
  }

  supabaseClient = createClient<Database>(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}

/**
 * Get the Supabase client instance
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call initSupabase first.');
  }
  return supabaseClient;
}

/**
 * Create a Supabase client for server-side usage
 */
export function createServerClient(
  config: SupabaseConfig,
  accessToken?: string
): SupabaseClient<Database> {
  return createClient<Database>(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

// Re-export Supabase types for convenience
export type { SupabaseClient, Session, User } from '@supabase/supabase-js';







