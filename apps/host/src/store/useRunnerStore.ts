import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export type RunnerState = 'stopped' | 'starting' | 'idle' | 'running' | 'error';
export type ProcessPriority = 'low' | 'belownormal' | 'normal';
export type LogLevel = 'info' | 'error' | 'warning';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

interface RunnerStatus {
  state: RunnerState;
  started_at: string | null;
  runner_path: string | null;
  current_job: string | null;
  resource_settings: ResourceSettings | null;
}

interface GitHubJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  head_branch: string;
  head_sha: string;
  run_number: number;
  workflow_id: number;
  event: string;
}

export interface SystemInfo {
  cpu_cores: number;
  total_memory_gb: number;
  available_memory_gb: number;
  cpu_brand: string;
}

export interface ResourceRecommendation {
  recommended_cores: number;
  max_cores: number;
  recommended_memory_gb: number;
  max_memory_gb: number;
}

export interface ResourceSettings {
  cpu_cores: number | null;
  memory_limit_gb: number | null;
  priority: ProcessPriority;
}

interface Settings {
  runnerPath: string;
  githubOwner: string;
  githubRepo: string;
  githubToken: string;
  theme: 'dark' | 'light';
  // Resource settings
  cpuCores: number | null;
  memoryLimitGb: number | null;
  priority: ProcessPriority;
}

interface RunnerStore {
  // Status
  status: RunnerStatus;
  output: LogEntry[];
  outputStrings: string[];
  isLoading: boolean;
  error: string | null;

  // Jobs
  jobs: GitHubJob[];
  jobsLoading: boolean;

  // System Info
  systemInfo: SystemInfo | null;
  recommendations: ResourceRecommendation | null;

  // Settings
  settings: Settings;

  // Actions
  startRunner: () => Promise<void>;
  stopRunner: () => Promise<void>;
  pollStatus: () => Promise<void>;
  fetchOutput: () => Promise<void>;
  clearOutput: () => Promise<void>;
  detectRunnerPath: () => Promise<string>;
  fetchJobs: () => Promise<void>;
  fetchSystemInfo: () => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => void;
  initializeSettings: () => void;
  getErrorsOnly: () => Promise<LogEntry[]>;
  getDiagnosticsReport: () => Promise<string>;
  forceResetStatus: () => Promise<void>;
}

const DEFAULT_SETTINGS: Settings = {
  runnerPath: '',
  githubOwner: 'birchform',
  githubRepo: 'BirchVault',
  githubToken: '',
  theme: 'dark',
  cpuCores: null,
  memoryLimitGb: null,
  priority: 'normal',
};

export const useRunnerStore = create<RunnerStore>((set, get) => ({
  // Initial state
  status: {
    state: 'stopped',
    started_at: null,
    runner_path: null,
    current_job: null,
    resource_settings: null,
  },
  output: [],
  outputStrings: [],
  isLoading: false,
  error: null,
  jobs: [],
  jobsLoading: false,
  systemInfo: null,
  recommendations: null,
  settings: DEFAULT_SETTINGS,

  // Actions
  startRunner: async () => {
    const { settings } = get();
    if (!settings.runnerPath) {
      set({ error: 'Runner path not configured' });
      return;
    }

    // Build resource settings from settings
    const resourceSettings: ResourceSettings | null = 
      settings.cpuCores || settings.memoryLimitGb || settings.priority !== 'normal'
        ? {
            cpu_cores: settings.cpuCores,
            memory_limit_gb: settings.memoryLimitGb,
            priority: settings.priority,
          }
        : null;

    set({ isLoading: true, error: null });
    try {
      await invoke('start_runner', { 
        path: settings.runnerPath,
        resourceSettings,
      });
      set({ isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  stopRunner: async () => {
    set({ isLoading: true, error: null });
    try {
      await invoke('stop_runner');
      set({ isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  pollStatus: async () => {
    try {
      let status = await invoke<RunnerStatus>('get_runner_status');

      // If status says running, cross-check with GitHub API to prevent drift
      if (status.state === 'running' && status.current_job) {
        const { settings, jobs } = get();
        
        // Use cached jobs or fetch fresh if needed
        let currentJobs = jobs;
        if (currentJobs.length === 0 && settings.githubOwner && settings.githubRepo) {
          try {
            currentJobs = await invoke<GitHubJob[]>('fetch_github_jobs', {
              owner: settings.githubOwner,
              repo: settings.githubRepo,
              token: settings.githubToken || null,
            });
            set({ jobs: currentJobs });
          } catch {
            // Ignore fetch errors, continue with stale data
          }
        }

        // Check if any job is actually in_progress
        const hasInProgressJob = currentJobs.some(j => j.status === 'in_progress');
        
        // If no in_progress job found but we think one is running, sync with GitHub
        if (!hasInProgressJob && currentJobs.length > 0) {
          // Find the most recent job to check its status
          const mostRecentJob = currentJobs[0]; // Jobs are sorted by created_at desc
          
          if (mostRecentJob && mostRecentJob.status === 'completed') {
            console.log('Status drift detected: GitHub says completed, local says running. Syncing...');
            // Sync the status via backend
            await invoke('sync_runner_with_github', {
              githubStatus: mostRecentJob.status,
              githubConclusion: mostRecentJob.conclusion,
            });
            // Re-fetch the corrected status
            status = await invoke<RunnerStatus>('get_runner_status');
          }
        }
      }

      set({ status });

      // Also fetch output if runner is not stopped
      if (status.state !== 'stopped') {
        const [output, outputStrings] = await Promise.all([
          invoke<LogEntry[]>('get_runner_output'),
          invoke<string[]>('get_runner_output_strings'),
        ]);
        set({ output, outputStrings });
      }
    } catch (e) {
      console.error('Failed to poll status:', e);
    }
  },

  fetchOutput: async () => {
    try {
      const [output, outputStrings] = await Promise.all([
        invoke<LogEntry[]>('get_runner_output'),
        invoke<string[]>('get_runner_output_strings'),
      ]);
      set({ output, outputStrings });
    } catch (e) {
      console.error('Failed to fetch output:', e);
    }
  },

  clearOutput: async () => {
    try {
      await invoke('clear_runner_output');
      set({ output: [], outputStrings: [] });
    } catch (e) {
      console.error('Failed to clear output:', e);
    }
  },

  detectRunnerPath: async () => {
    try {
      const path = await invoke<string>('detect_runner_path');
      set((state) => ({
        settings: { ...state.settings, runnerPath: path },
      }));
      // Save to localStorage
      const settings = get().settings;
      localStorage.setItem('birch-host-settings', JSON.stringify({ ...settings, runnerPath: path }));
      return path;
    } catch (e) {
      throw e;
    }
  },

  fetchJobs: async () => {
    const { settings } = get();
    if (!settings.githubOwner || !settings.githubRepo) {
      return;
    }

    set({ jobsLoading: true });
    try {
      const runs = await invoke<GitHubJob[]>('fetch_github_jobs', {
        owner: settings.githubOwner,
        repo: settings.githubRepo,
        token: settings.githubToken || null,
      });
      set({ jobs: runs, jobsLoading: false });
    } catch (e) {
      console.error('Failed to fetch jobs:', e);
      set({ jobsLoading: false });
    }
  },

  fetchSystemInfo: async () => {
    try {
      const [systemInfo, recommendations] = await Promise.all([
        invoke<SystemInfo>('get_system_info_cmd'),
        invoke<ResourceRecommendation>('get_resource_recommendations'),
      ]);
      set({ systemInfo, recommendations });
    } catch (e) {
      console.error('Failed to fetch system info:', e);
    }
  },

  updateSettings: (newSettings) => {
    set((state) => {
      const updated = { ...state.settings, ...newSettings };
      localStorage.setItem('birch-host-settings', JSON.stringify(updated));
      return { settings: updated };
    });
  },

  initializeSettings: () => {
    const saved = localStorage.getItem('birch-host-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        set({ settings: { ...DEFAULT_SETTINGS, ...parsed } });
      } catch {
        // Ignore parse errors
      }
    }

    // Try to auto-detect runner path if not set
    const settings = get().settings;
    if (!settings.runnerPath) {
      get().detectRunnerPath().catch(() => {
        // Ignore detection errors
      });
    }

    // Fetch system info
    get().fetchSystemInfo();
  },

  getErrorsOnly: async () => {
    try {
      const errors = await invoke<LogEntry[]>('get_runner_errors');
      return errors;
    } catch (e) {
      console.error('Failed to fetch errors:', e);
      return [];
    }
  },

  getDiagnosticsReport: async () => {
    try {
      const report = await invoke<string>('get_diagnostics_report');
      return report;
    } catch (e) {
      console.error('Failed to generate diagnostics:', e);
      return `Failed to generate diagnostics report: ${e}`;
    }
  },

  forceResetStatus: async () => {
    try {
      await invoke('force_reset_runner_status');
      // Re-fetch the corrected status
      const status = await invoke<RunnerStatus>('get_runner_status');
      set({ status });
    } catch (e) {
      console.error('Failed to force reset status:', e);
    }
  },
}));
