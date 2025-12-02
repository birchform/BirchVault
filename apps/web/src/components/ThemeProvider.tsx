'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

type ColorTheme = 'birch' | 'forest' | 'ocean' | 'midnight';
type AppearanceMode = 'light' | 'dark' | 'system';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    async function loadAndApplyTheme() {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Default theme for logged out users
          applyTheme('birch', 'dark');
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
          applyTheme(color, appearance);
        } else {
          applyTheme('birch', 'dark');
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
        applyTheme('birch', 'dark');
      }
    }

    loadAndApplyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Re-apply theme when system preference changes
      loadAndApplyTheme();
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Prevent flash of unstyled content
  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}

function applyTheme(color: ColorTheme, appearance: AppearanceMode) {
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
}
