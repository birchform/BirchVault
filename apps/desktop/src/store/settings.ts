// ============================================
// Desktop Settings Store (Zustand)
// ============================================

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { fetch } from '@tauri-apps/plugin-http';

export type ColorTheme = 'birch' | 'forest' | 'ocean' | 'midnight';
export type AppearanceMode = 'light' | 'dark' | 'system';

// Hardcoded for frontend API calls (same as public on web)
const SUPABASE_URL = 'https://lbkumiynfiolodygvvnq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxia3VtaXluZmlvbG9keWd2dm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1NjM5NTIsImV4cCI6MjA2MDEzOTk1Mn0.cewMqNfaT5qVWMAehHE6_coaTOHPTJUIwjRJqK1ZKKY';

export interface AppSettings {
  autoLockMinutes: number;
  clipboardClearSeconds: number;
  startMinimized: boolean;
  startOnBoot: boolean;
  theme: AppearanceMode;
  colorTheme: ColorTheme;
}

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  
  // Actions
  setSettings: (settings: Partial<AppSettings>) => void;
  setTheme: (theme: AppearanceMode) => void;
  setColorTheme: (colorTheme: ColorTheme) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  syncThemeToSupabase: (accessToken: string, userId: string) => Promise<void>;
  resetToDefaults: () => void;
  applyTheme: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoLockMinutes: 15,
  clipboardClearSeconds: 30,
  startMinimized: false,
  startOnBoot: false,
  theme: 'dark',
  colorTheme: 'birch',
};

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,

  setSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
    // Apply theme immediately
    setTimeout(() => get().applyTheme(), 0);
  },

  setTheme: (theme) => {
    set((state) => ({
      settings: { ...state.settings, theme },
    }));
    get().applyTheme();
    get().saveSettings();
  },

  setColorTheme: (colorTheme) => {
    set((state) => ({
      settings: { ...state.settings, colorTheme },
    }));
    get().applyTheme();
    get().saveSettings();
  },

  applyTheme: () => {
    const { settings } = get();
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('theme-birch', 'theme-forest', 'theme-ocean', 'theme-midnight', 'dark', 'light');
    
    // Apply color theme (birch is default via CSS :root)
    if (settings.colorTheme !== 'birch') {
      root.classList.add(`theme-${settings.colorTheme}`);
    }
    
    // Apply appearance mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark);
    
    if (shouldBeDark) {
      root.classList.add('dark');
    }
  },

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await invoke<AppSettings>('get_settings');
      // Ensure colorTheme has a default if not present (for backwards compatibility)
      set({ 
        settings: { 
          ...DEFAULT_SETTINGS, 
          ...settings,
          colorTheme: settings.colorTheme || 'birch',
        }, 
        isLoading: false 
      });
      // Apply theme after loading
      get().applyTheme();
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  saveSettings: async () => {
    const { settings } = get();
    try {
      await invoke('save_settings', { settings });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  },

  syncThemeToSupabase: async (accessToken: string, userId: string) => {
    const { settings } = get();
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            color_theme: settings.colorTheme,
            appearance_mode: settings.theme,
          }),
        }
      );
      
      if (!response.ok) {
        console.error('Failed to sync theme to Supabase:', response.status);
      } else {
        console.log('[Settings] Theme synced to Supabase');
      }
    } catch (error) {
      console.error('Failed to sync theme to Supabase:', error);
    }
  },

  resetToDefaults: () => {
    set({ settings: DEFAULT_SETTINGS });
    get().applyTheme();
  },
}));

// ============================================
// Theme Utilities
// ============================================

export const COLOR_THEMES: { id: ColorTheme; name: string; description: string }[] = [
  { id: 'birch', name: 'Birch', description: 'Warm brown tones (default)' },
  { id: 'forest', name: 'Forest', description: 'Natural green tones' },
  { id: 'ocean', name: 'Ocean', description: 'Cool blue tones' },
  { id: 'midnight', name: 'Midnight', description: 'Deep purple tones' },
];

export const APPEARANCE_MODES: { id: AppearanceMode; name: string }[] = [
  { id: 'light', name: 'Light' },
  { id: 'dark', name: 'Dark' },
  { id: 'system', name: 'System' },
];

// ============================================
// Clipboard Utilities
// ============================================

export async function copyToClipboard(text: string, clearAfterSeconds?: number): Promise<void> {
  await invoke('copy_to_clipboard', {
    text,
    clearAfterSeconds: clearAfterSeconds ?? null,
  });
}

export async function clearClipboard(): Promise<void> {
  await invoke('clear_clipboard');
}

