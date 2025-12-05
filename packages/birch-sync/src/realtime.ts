// ============================================
// Birch Sync - Realtime Subscriptions
// ============================================

import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from './client';
import type {
  BirchMachine,
  BirchEditLock,
  DevProject,
  DevSettings,
  HostMachine,
  HostCommand,
  HostLog,
  LauncherConfig,
} from './types';

type SubscriptionCallback<T> = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
}) => void;

let channels: Map<string, RealtimeChannel> = new Map();

/**
 * Subscribe to changes on a table
 */
function subscribeToTable<T>(
  tableName: string,
  callback: SubscriptionCallback<T>,
  filter?: { column: string; value: string }
): RealtimeChannel {
  const client = getSupabase();
  const channelName = filter 
    ? `${tableName}:${filter.column}:${filter.value}`
    : tableName;

  // Unsubscribe from existing channel if any
  const existing = channels.get(channelName);
  if (existing) {
    existing.unsubscribe();
    channels.delete(channelName);
  }

  let channelConfig: Parameters<typeof client.channel>[1] = {
    config: {
      broadcast: { self: true },
    },
  };

  const channel = client.channel(channelName, channelConfig);

  const subscribeConfig: {
    event: '*';
    schema: string;
    table: string;
    filter?: string;
  } = {
    event: '*',
    schema: 'public',
    table: tableName,
  };

  if (filter) {
    subscribeConfig.filter = `${filter.column}=eq.${filter.value}`;
  }

  channel
    .on(
      'postgres_changes',
      subscribeConfig,
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as T | null,
          old: payload.old as T | null,
        });
      }
    )
    .subscribe();

  channels.set(channelName, channel);
  return channel;
}

/**
 * Unsubscribe from a table
 */
function unsubscribeFromTable(tableName: string, filter?: { column: string; value: string }): void {
  const channelName = filter 
    ? `${tableName}:${filter.column}:${filter.value}`
    : tableName;
  
  const channel = channels.get(channelName);
  if (channel) {
    channel.unsubscribe();
    channels.delete(channelName);
  }
}

/**
 * Unsubscribe from all tables
 */
export function unsubscribeAll(): void {
  for (const channel of channels.values()) {
    channel.unsubscribe();
  }
  channels.clear();
}

// ============================================
// Specific table subscriptions
// ============================================

/**
 * Subscribe to machine changes
 */
export function subscribeToMachines(
  callback: SubscriptionCallback<BirchMachine>
): RealtimeChannel {
  return subscribeToTable('birch_machines', callback);
}

/**
 * Subscribe to edit lock changes
 */
export function subscribeToEditLocks(
  callback: SubscriptionCallback<BirchEditLock>
): RealtimeChannel {
  return subscribeToTable('birch_edit_locks', callback);
}

/**
 * Subscribe to project changes
 */
export function subscribeToProjects(
  callback: SubscriptionCallback<DevProject>
): RealtimeChannel {
  return subscribeToTable('dev_projects', callback);
}

/**
 * Subscribe to dev settings changes
 */
export function subscribeToDevSettings(
  callback: SubscriptionCallback<DevSettings>
): RealtimeChannel {
  return subscribeToTable('dev_settings', callback);
}

/**
 * Subscribe to host machine changes
 */
export function subscribeToHostMachines(
  callback: SubscriptionCallback<HostMachine>
): RealtimeChannel {
  return subscribeToTable('host_machines', callback);
}

/**
 * Subscribe to host commands for a specific machine
 */
export function subscribeToHostCommands(
  hostMachineId: string,
  callback: SubscriptionCallback<HostCommand>
): RealtimeChannel {
  return subscribeToTable('host_commands', callback, {
    column: 'host_machine_id',
    value: hostMachineId,
  });
}

/**
 * Subscribe to host logs for a specific machine
 */
export function subscribeToHostLogs(
  hostMachineId: string,
  callback: SubscriptionCallback<HostLog>
): RealtimeChannel {
  return subscribeToTable('host_logs', callback, {
    column: 'host_machine_id',
    value: hostMachineId,
  });
}

/**
 * Subscribe to launcher config changes
 */
export function subscribeToLauncherConfig(
  callback: SubscriptionCallback<LauncherConfig>
): RealtimeChannel {
  return subscribeToTable('launcher_config', callback);
}

// ============================================
// Unsubscribe helpers
// ============================================

export function unsubscribeFromMachines(): void {
  unsubscribeFromTable('birch_machines');
}

export function unsubscribeFromEditLocks(): void {
  unsubscribeFromTable('birch_edit_locks');
}

export function unsubscribeFromProjects(): void {
  unsubscribeFromTable('dev_projects');
}

export function unsubscribeFromDevSettings(): void {
  unsubscribeFromTable('dev_settings');
}

export function unsubscribeFromHostMachines(): void {
  unsubscribeFromTable('host_machines');
}

export function unsubscribeFromHostCommands(hostMachineId: string): void {
  unsubscribeFromTable('host_commands', {
    column: 'host_machine_id',
    value: hostMachineId,
  });
}

export function unsubscribeFromHostLogs(hostMachineId: string): void {
  unsubscribeFromTable('host_logs', {
    column: 'host_machine_id',
    value: hostMachineId,
  });
}

export function unsubscribeFromLauncherConfig(): void {
  unsubscribeFromTable('launcher_config');
}




