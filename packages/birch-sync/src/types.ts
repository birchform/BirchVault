// ============================================
// Birch Sync Type Definitions
// ============================================

export interface BirchUser {
  id: string;
  display_name: string | null;
  global_pin_hash: string | null;
  master_key_salt: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface BirchMachine {
  id: string;
  user_id: string;
  hostname: string;
  display_name: string | null;
  last_seen: string;
  is_online: boolean;
  created_at: string;
}

export interface BirchEditLock {
  id: string;
  user_id: string;
  app_name: 'dev' | 'host' | 'launcher';
  machine_id: string | null;
  acquired_at: string;
}

export interface DevProject {
  id: string;
  user_id: string;
  name: string;
  path: string;
  github_owner: string | null;
  github_repo: string | null;
  created_at: string;
  updated_at: string;
}

export interface DevSettings {
  user_id: string;
  selected_project_id: string | null;
  ui_preferences: Record<string, unknown>;
  updated_at: string;
}

export interface HostMachine {
  id: string;
  machine_id: string;
  runner_path: string | null;
  runner_status: 'unknown' | 'stopped' | 'starting' | 'idle' | 'running' | 'error';
  current_job: string | null;
  service_installed: boolean;
  github_owner: string | null;
  github_repo: string | null;
  cpu_cores: number | null;
  memory_limit_gb: number | null;
  priority: 'low' | 'belownormal' | 'normal';
  created_at: string;
  updated_at: string;
}

export interface HostDefaults {
  user_id: string;
  github_owner: string | null;
  github_repo: string | null;
  cpu_cores: number | null;
  memory_limit_gb: number | null;
  priority: string;
  updated_at: string;
}

export interface HostCommand {
  id: string;
  host_machine_id: string;
  command: 'start' | 'stop' | 'detect_path';
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result: string | null;
  created_by_machine_id: string | null;
  pin_verified: boolean;
  created_at: string;
  executed_at: string | null;
}

export interface HostLog {
  id: string;
  host_machine_id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  created_at: string;
}

export interface LauncherConfig {
  id: string;
  machine_id: string;
  folder_path: string | null;
  updated_at: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface SyncState {
  isConnected: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  machineId: string | null;
  hostname: string | null;
}

export type AppName = 'dev' | 'host' | 'launcher';

export interface LockStatus {
  isLocked: boolean;
  lockedByMachine: BirchMachine | null;
  isOwnLock: boolean;
}




