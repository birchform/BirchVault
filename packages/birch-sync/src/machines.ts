// ============================================
// Birch Sync - Machine Management
// ============================================

import { getSupabase } from './client';
import type { BirchMachine } from './types';

const MACHINE_ID_KEY = 'birch-machine-id';
const HOSTNAME_KEY = 'birch-hostname';

/**
 * Get hostname (works in browser and Node/Tauri)
 */
export async function getHostname(): Promise<string> {
  // Check localStorage first
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(HOSTNAME_KEY);
    if (stored) return stored;
  }

  // Try to get from OS (works in Tauri with os plugin)
  try {
    if (typeof window !== 'undefined' && 'navigator' in window) {
      // Browser fallback - use a combination of factors
      const nav = window.navigator as Navigator & { deviceMemory?: number };
      const factors = [
        nav.platform || 'unknown',
        nav.language || 'en',
        nav.deviceMemory?.toString() || '0',
        screen.width.toString(),
        screen.height.toString(),
      ];
      // Generate a pseudo-hostname from browser fingerprint
      const hostname = `browser-${btoa(factors.join('-')).substring(0, 12)}`;
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(HOSTNAME_KEY, hostname);
      }
      return hostname;
    }
  } catch {
    // Fallback
  }

  // Final fallback
  const fallback = `machine-${Date.now().toString(36)}`;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(HOSTNAME_KEY, fallback);
  }
  return fallback;
}

/**
 * Set hostname (for Tauri apps that can get real hostname)
 */
export function setHostname(hostname: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(HOSTNAME_KEY, hostname);
  }
}

/**
 * Get current machine ID
 */
export function getMachineId(): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(MACHINE_ID_KEY);
  }
  return null;
}

/**
 * Register current machine with Supabase
 */
export async function registerMachine(displayName?: string): Promise<{ machine: BirchMachine | null; error: string | null }> {
  const client = getSupabase();
  const hostname = await getHostname();

  const { data, error } = await client.rpc('register_machine', {
    p_hostname: hostname,
    p_display_name: displayName || null,
  });

  if (error) {
    return { machine: null, error: error.message };
  }

  const machineId = data as string;

  // Store machine ID locally
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(MACHINE_ID_KEY, machineId);
  }

  // Fetch full machine record
  const { data: machine, error: fetchError } = await client
    .from('birch_machines')
    .select('*')
    .eq('id', machineId)
    .single();

  if (fetchError) {
    return { machine: null, error: fetchError.message };
  }

  return { machine: machine as BirchMachine, error: null };
}

/**
 * Send heartbeat to keep machine online
 */
export async function sendHeartbeat(): Promise<{ success: boolean; error: string | null }> {
  const machineId = getMachineId();
  if (!machineId) {
    return { success: false, error: 'Machine not registered' };
  }

  const client = getSupabase();
  const { data, error } = await client.rpc('machine_heartbeat', {
    p_machine_id: machineId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: data as boolean, error: null };
}

/**
 * Mark machine as offline
 */
export async function goOffline(): Promise<{ success: boolean; error: string | null }> {
  const machineId = getMachineId();
  if (!machineId) {
    return { success: false, error: 'Machine not registered' };
  }

  const client = getSupabase();
  const { data, error } = await client.rpc('machine_offline', {
    p_machine_id: machineId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: data as boolean, error: null };
}

/**
 * Get current machine
 */
export async function getCurrentMachine(): Promise<{ machine: BirchMachine | null; error: string | null }> {
  const machineId = getMachineId();
  if (!machineId) {
    return { machine: null, error: 'Machine not registered' };
  }

  const client = getSupabase();
  const { data, error } = await client
    .from('birch_machines')
    .select('*')
    .eq('id', machineId)
    .single();

  if (error) {
    return { machine: null, error: error.message };
  }

  return { machine: data as BirchMachine, error: null };
}

/**
 * Get all machines for current user
 */
export async function getAllMachines(): Promise<{ machines: BirchMachine[]; error: string | null }> {
  const client = getSupabase();
  const { data, error } = await client
    .from('birch_machines')
    .select('*')
    .order('last_seen', { ascending: false });

  if (error) {
    return { machines: [], error: error.message };
  }

  return { machines: data as BirchMachine[], error: null };
}

/**
 * Update machine display name
 */
export async function updateMachineDisplayName(machineId: string, displayName: string): Promise<{ error: string | null }> {
  const client = getSupabase();
  const { error } = await client
    .from('birch_machines')
    .update({ display_name: displayName })
    .eq('id', machineId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Delete a machine
 */
export async function deleteMachine(machineId: string): Promise<{ error: string | null }> {
  const client = getSupabase();
  const { error } = await client
    .from('birch_machines')
    .delete()
    .eq('id', machineId);

  if (error) {
    return { error: error.message };
  }

  // If deleting current machine, clear local storage
  if (machineId === getMachineId() && typeof localStorage !== 'undefined') {
    localStorage.removeItem(MACHINE_ID_KEY);
  }

  return { error: null };
}

/**
 * Start heartbeat interval
 */
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export function startHeartbeat(intervalMs: number = 30000): void {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    sendHeartbeat().catch(console.error);
  }, intervalMs);
  
  // Send initial heartbeat
  sendHeartbeat().catch(console.error);
}

export function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

/**
 * Ensure machine is registered, creating if necessary
 */
export async function ensureMachineRegistered(hostname: string): Promise<BirchMachine | null> {
  // Check if already registered
  const existingId = getMachineId();
  if (existingId) {
    const { machine, error } = await getCurrentMachine();
    if (machine && !error) {
      // Update last_seen and start heartbeat
      await sendHeartbeat();
      startHeartbeat();
      return machine;
    }
  }

  // Register new machine
  const { machine, error } = await registerMachine(hostname);
  if (error) {
    console.error('Failed to register machine:', error);
    return null;
  }

  // Start heartbeat
  startHeartbeat();
  return machine;
}

