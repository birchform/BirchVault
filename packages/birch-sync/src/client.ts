// ============================================
// Birch Sync - Supabase Client
// ============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { invoke } from '@tauri-apps/api/core';
import type { SupabaseConfig, SyncState } from './types';

let supabaseClient: SupabaseClient | null = null;
let currentConfig: SupabaseConfig | null = null;

const STORAGE_KEY = 'birch-sync-config';

/**
 * Get config from Tauri backend (secure storage)
 */
async function getStoredConfig(): Promise<SupabaseConfig | null> {
  try {
    return await invoke<SupabaseConfig | null>('get_supabase_config');
  } catch {
    // Fall back to localStorage if Tauri not available
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
    return null;
  }
}

/**
 * Save config to Tauri backend (secure storage)
 */
async function saveConfig(config: SupabaseConfig): Promise<void> {
  try {
    await invoke('set_supabase_config', { config });
  } catch {
    // Fall back to localStorage if Tauri not available
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  }
}

/**
 * Initialize the Supabase client with stored or provided config
 */
export async function initSupabase(config?: SupabaseConfig): Promise<SupabaseClient> {
  if (config) {
    currentConfig = config;
    await saveConfig(config);
  } else if (!currentConfig) {
    currentConfig = await getStoredConfig();
  }

  if (!currentConfig) {
    throw new Error('Supabase config not provided. Please run setup wizard.');
  }

  supabaseClient = createClient(currentConfig.url, currentConfig.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}

/**
 * Initialize synchronously (uses cached config)
 */
export function initSupabaseSync(config?: SupabaseConfig): SupabaseClient {
  if (config) {
    currentConfig = config;
  }

  if (!currentConfig) {
    throw new Error('Supabase config not provided. Please run setup wizard.');
  }

  supabaseClient = createClient(currentConfig.url, currentConfig.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}

/**
 * Get the Supabase client instance (throws if not initialized)
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error('Supabase not initialized. Call initSupabase() first.');
  }
  return supabaseClient;
}

/**
 * Get the Supabase client instance or null
 */
export function getSupabaseOrNull(): SupabaseClient | null {
  return supabaseClient;
}

/**
 * Check if Supabase is configured (sync check)
 */
export function isConfiguredSync(): boolean {
  return currentConfig !== null;
}

/**
 * Check if Supabase is configured (async check)
 */
export async function isConfigured(): Promise<boolean> {
  if (currentConfig) return true;
  const stored = await getStoredConfig();
  return stored !== null;
}

/**
 * Get current config (sync)
 */
export function getConfigSync(): SupabaseConfig | null {
  return currentConfig;
}

/**
 * Get current config (async)
 */
export async function getConfig(): Promise<SupabaseConfig | null> {
  if (currentConfig) return currentConfig;
  return getStoredConfig();
}

/**
 * Clear config (for logout/reset)
 */
export async function clearConfig(): Promise<void> {
  currentConfig = null;
  supabaseClient = null;
  try {
    await invoke('set_supabase_config', { config: null });
  } catch {
    // Ignore errors
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Test connection to Supabase
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = getSupabase();
    const { error } = await client.from('birch_users').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Get machine ID from Tauri backend
 */
export async function getMachineId(): Promise<string> {
  try {
    return await invoke<string>('get_machine_id');
  } catch {
    // Fallback to localStorage
    if (typeof localStorage !== 'undefined') {
      let machineId = localStorage.getItem('birch-machine-id');
      if (!machineId) {
        machineId = `web-${crypto.randomUUID()}`;
        localStorage.setItem('birch-machine-id', machineId);
      }
      return machineId;
    }
    throw new Error('Could not get machine ID');
  }
}

/**
 * Get hostname from Tauri backend
 */
export async function getHostname(): Promise<string> {
  try {
    return await invoke<string>('get_hostname');
  } catch {
    // Fallback
    if (typeof localStorage !== 'undefined') {
      let hostname = localStorage.getItem('birch-hostname');
      if (!hostname) {
        hostname = 'web-client';
        localStorage.setItem('birch-hostname', hostname);
      }
      return hostname;
    }
    return 'unknown';
  }
}

/**
 * Get current sync state
 */
export async function getSyncState(): Promise<SyncState> {
  const state: SyncState = {
    isConnected: false,
    isAuthenticated: false,
    userId: null,
    machineId: null,
    hostname: null,
  };

  if (!(await isConfigured())) {
    return state;
  }

  try {
    await initSupabase();
    const client = getSupabase();
    state.isConnected = await testConnection();

    const { data: { session } } = await client.auth.getSession();
    if (session?.user) {
      state.isAuthenticated = true;
      state.userId = session.user.id;
    }

    // Get machine info from Tauri
    state.machineId = await getMachineId();
    state.hostname = await getHostname();
  } catch {
    // Connection failed
  }

  return state;
}

