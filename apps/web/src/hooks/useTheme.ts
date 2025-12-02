'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

export type ColorTheme = 'birch' | 'forest' | 'ocean' | 'midnight';
export type AppearanceMode = 'light' | 'dark' | 'system';

export interface ThemePreferences {
  colorTheme: ColorTheme;
  appearanceMode: AppearanceMode;
}

const COLOR_THEMES: { id: ColorTheme; name: string; description: string }[] = [
  { id: 'birch', name: 'Birch', description: 'Warm brown tones' },
  { id: 'forest', name: 'Forest', description: 'Green nature tones' },
  { id: 'ocean', name: 'Ocean', description: 'Cool blue tones' },
  { id: 'midnight', name: 'Midnight', description: 'Deep purple tones' },
];

const APPEARANCE_MODES: { id: AppearanceMode; name: string }[] = [
  { id: 'light', name: 'Light' },
  { id: 'dark', name: 'Dark' },
  { id: 'system', name: 'System' },
];

export { COLOR_THEMES, APPEARANCE_MODES };

export function useTheme() {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('birch');
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Apply theme classes to document
  const applyTheme = useCallback((color: ColorTheme, appearance: AppearanceMode) => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('theme-birch', 'theme-forest', 'theme-ocean', 'theme-midnight', 'dark');
    
    // Apply color theme (birch is default, so only add class for others)
    if (color !== 'birch') {
      root.classList.add(`theme-${color}`);
    }
    
    // Apply dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = appearance === 'dark' || (appearance === 'system' && prefersDark);
    
    if (shouldBeDark) {
      root.classList.add('dark');
    }
  }, []);

  // Load theme from profile
  const loadTheme = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('color_theme, appearance_mode')
        .eq('id', user.id)
        .single();

      if (profile) {
        const color = (profile.color_theme || 'birch') as ColorTheme;
        const appearance = (profile.appearance_mode || 'dark') as AppearanceMode;
        
        setColorThemeState(color);
        setAppearanceModeState(appearance);
        applyTheme(color, appearance);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    } finally {
      setIsLoading(false);
    }
  }, [applyTheme]);

  // Save theme to profile
  const saveTheme = useCallback(async (color: ColorTheme, appearance: AppearanceMode) => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      await supabase
        .from('profiles')
        .update({
          color_theme: color,
          appearance_mode: appearance,
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, []);

  // Set color theme
  const setColorTheme = useCallback(async (theme: ColorTheme) => {
    setColorThemeState(theme);
    applyTheme(theme, appearanceMode);
    await saveTheme(theme, appearanceMode);
  }, [appearanceMode, applyTheme, saveTheme]);

  // Set appearance mode
  const setAppearanceMode = useCallback(async (mode: AppearanceMode) => {
    setAppearanceModeState(mode);
    applyTheme(colorTheme, mode);
    await saveTheme(colorTheme, mode);
  }, [colorTheme, applyTheme, saveTheme]);

  // Load theme on mount
  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (appearanceMode === 'system') {
        applyTheme(colorTheme, appearanceMode);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [appearanceMode, colorTheme, applyTheme]);

  return {
    colorTheme,
    appearanceMode,
    setColorTheme,
    setAppearanceMode,
    isLoading,
    reloadTheme: loadTheme,
  };
}




