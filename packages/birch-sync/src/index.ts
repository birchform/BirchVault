// ============================================
// Birch Sync - Main Export
// ============================================

// Types
export type {
  BirchUser,
  BirchMachine,
  BirchEditLock,
  DevProject,
  DevSettings,
  HostMachine,
  HostDefaults,
  HostCommand,
  HostLog,
  LauncherConfig,
  SupabaseConfig,
  SyncState,
  AppName,
  LockStatus,
} from './types';

// Client
export {
  initSupabase,
  initSupabaseSync,
  getSupabase,
  getSupabaseOrNull,
  isConfigured,
  isConfiguredSync,
  getConfig,
  getConfigSync,
  clearConfig,
  testConnection,
  getSyncState,
  getMachineId,
  getHostname,
} from './client';

// React Components
export {
  SyncProvider,
  useSyncContext,
  SyncSetupWizard,
} from './SyncProvider';

// Auth
export {
  signIn,
  signUp,
  signOut,
  getSession,
  getCurrentUser,
  isAdmin,
  setAdmin,
  updateDisplayName,
  sendPasswordReset,
  onAuthStateChange,
} from './auth';

// Master Password
export {
  hasMasterPassword,
  setupMasterPassword,
  verifyMasterPassword,
  isMasterPasswordVerified,
  encrypt,
  decrypt,
  clearMasterPassword,
  changeMasterPassword,
} from './master-password';

// PIN
export {
  hasPin,
  setPin,
  verifyPin,
  clearPin,
  markPinVerified,
  isPinVerifiedInSession,
  clearPinVerification,
  verifyPinWithCache,
  requirePinVerification,
} from './pin';

// Machines
export {
  getHostname as getMachineHostname,
  setHostname,
  getMachineId as getStoredMachineId,
  registerMachine,
  sendHeartbeat,
  goOffline,
  getCurrentMachine,
  getAllMachines,
  updateMachineDisplayName,
  deleteMachine,
  startHeartbeat,
  stopHeartbeat,
  ensureMachineRegistered,
} from './machines';

// Locks
export {
  getLockStatus,
  acquireLock,
  releaseLock,
  forceReleaseLock,
  getAllLocks,
  canEdit,
  withLock,
  startLockRefresh,
  stopLockRefresh,
  cleanup as cleanupLocks,
} from './locks';

// Realtime
export {
  subscribeToMachines,
  subscribeToEditLocks,
  subscribeToProjects,
  subscribeToDevSettings,
  subscribeToHostMachines,
  subscribeToHostCommands,
  subscribeToHostLogs,
  subscribeToLauncherConfig,
  unsubscribeFromMachines,
  unsubscribeFromEditLocks,
  unsubscribeFromProjects,
  unsubscribeFromDevSettings,
  unsubscribeFromHostMachines,
  unsubscribeFromHostCommands,
  unsubscribeFromHostLogs,
  unsubscribeFromLauncherConfig,
  unsubscribeAll,
} from './realtime';

// ============================================
// Convenience initialization
// ============================================

import { initSupabase, isConfigured } from './client';
import { registerMachine, startHeartbeat } from './machines';
import { getSession } from './auth';
import type { SupabaseConfig, BirchMachine } from './types';

export interface InitOptions {
  config?: SupabaseConfig;
  hostname?: string;
  displayName?: string;
  heartbeatInterval?: number;
}

export interface InitResult {
  success: boolean;
  error: string | null;
  machine: BirchMachine | null;
  needsSetup: boolean;
  needsLogin: boolean;
}

/**
 * Initialize Birch Sync with all necessary setup
 */
export async function init(options: InitOptions = {}): Promise<InitResult> {
  const result: InitResult = {
    success: false,
    error: null,
    machine: null,
    needsSetup: false,
    needsLogin: false,
  };

  // Check if configured
  if (!options.config && !isConfigured()) {
    result.needsSetup = true;
    result.error = 'Supabase not configured';
    return result;
  }

  // Initialize Supabase client
  try {
    initSupabase(options.config);
  } catch (e) {
    result.error = e instanceof Error ? e.message : 'Failed to initialize Supabase';
    result.needsSetup = true;
    return result;
  }

  // Check if logged in
  const { session, error: sessionError } = await getSession();
  if (sessionError) {
    result.error = sessionError;
    return result;
  }

  if (!session) {
    result.needsLogin = true;
    result.error = 'Not logged in';
    return result;
  }

  // Set hostname if provided
  if (options.hostname) {
    const { setHostname } = await import('./machines');
    setHostname(options.hostname);
  }

  // Register machine
  const { machine, error: machineError } = await registerMachine(options.displayName);
  if (machineError) {
    result.error = machineError;
    return result;
  }

  result.machine = machine;

  // Start heartbeat
  startHeartbeat(options.heartbeatInterval || 30000);

  result.success = true;
  return result;
}

/**
 * Cleanup on app close
 */
export async function shutdown(): Promise<void> {
  const { stopHeartbeat, goOffline } = await import('./machines');
  const { unsubscribeAll } = await import('./realtime');
  
  stopHeartbeat();
  await goOffline();
  unsubscribeAll();
}

