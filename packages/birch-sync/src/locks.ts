// ============================================
// Birch Sync - Edit Lock Management
// ============================================

import { getSupabase } from './client';
import { getMachineId } from './machines';
import type { BirchEditLock, BirchMachine, AppName, LockStatus } from './types';

/**
 * Get lock status for an app
 */
export async function getLockStatus(appName: AppName): Promise<LockStatus> {
  const client = getSupabase();
  const currentMachineId = getMachineId();

  const { data: lock, error } = await client
    .from('birch_edit_locks')
    .select(`
      *,
      machine:birch_machines(*)
    `)
    .eq('app_name', appName)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching lock status:', error);
    return { isLocked: false, lockedByMachine: null, isOwnLock: false };
  }

  if (!lock) {
    return { isLocked: false, lockedByMachine: null, isOwnLock: false };
  }

  const isOwnLock = lock.machine_id === currentMachineId;

  return {
    isLocked: true,
    lockedByMachine: lock.machine as BirchMachine | null,
    isOwnLock,
  };
}

/**
 * Acquire edit lock for an app
 */
export async function acquireLock(appName: AppName): Promise<{ success: boolean; error: string | null }> {
  const machineId = getMachineId();
  if (!machineId) {
    return { success: false, error: 'Machine not registered' };
  }

  const client = getSupabase();
  const { data, error } = await client.rpc('acquire_edit_lock', {
    p_app_name: appName,
    p_machine_id: machineId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: data as boolean, error: null };
}

/**
 * Release edit lock for an app
 */
export async function releaseLock(appName: AppName): Promise<{ success: boolean; error: string | null }> {
  const machineId = getMachineId();
  if (!machineId) {
    return { success: false, error: 'Machine not registered' };
  }

  const client = getSupabase();
  const { data, error } = await client.rpc('release_edit_lock', {
    p_app_name: appName,
    p_machine_id: machineId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: data as boolean, error: null };
}

/**
 * Force release edit lock (from any machine)
 */
export async function forceReleaseLock(appName: AppName): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabase();
  const { data, error } = await client.rpc('force_release_edit_lock', {
    p_app_name: appName,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: data as boolean, error: null };
}

/**
 * Get all locks for current user
 */
export async function getAllLocks(): Promise<{ locks: BirchEditLock[]; error: string | null }> {
  const client = getSupabase();
  const { data, error } = await client
    .from('birch_edit_locks')
    .select('*');

  if (error) {
    return { locks: [], error: error.message };
  }

  return { locks: data as BirchEditLock[], error: null };
}

/**
 * Check if current machine can edit (has lock or no lock exists)
 */
export async function canEdit(appName: AppName): Promise<boolean> {
  const status = await getLockStatus(appName);
  return !status.isLocked || status.isOwnLock;
}

/**
 * Ensure lock is held before performing an action
 */
export async function withLock<T>(
  appName: AppName,
  action: () => Promise<T>
): Promise<{ result: T | null; error: string | null }> {
  const { success, error: acquireError } = await acquireLock(appName);
  
  if (!success) {
    return { result: null, error: acquireError || 'Could not acquire lock' };
  }

  try {
    const result = await action();
    return { result, error: null };
  } catch (e) {
    return { result: null, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/**
 * Lock refresh interval management
 */
let lockRefreshInterval: ReturnType<typeof setInterval> | null = null;
let currentAppLock: AppName | null = null;

export function startLockRefresh(appName: AppName, intervalMs: number = 30 * 60 * 1000): void {
  stopLockRefresh();
  currentAppLock = appName;
  
  lockRefreshInterval = setInterval(() => {
    if (currentAppLock) {
      acquireLock(currentAppLock).catch(console.error);
    }
  }, intervalMs);
}

export function stopLockRefresh(): void {
  if (lockRefreshInterval) {
    clearInterval(lockRefreshInterval);
    lockRefreshInterval = null;
  }
  currentAppLock = null;
}

/**
 * Release lock and stop refresh on app close
 */
export async function cleanup(appName: AppName): Promise<void> {
  stopLockRefresh();
  await releaseLock(appName);
}




