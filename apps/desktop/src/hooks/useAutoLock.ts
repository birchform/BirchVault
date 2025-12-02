import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/auth';
import { useSettingsStore } from '../store/settings';

/**
 * Hook to automatically lock the vault after a period of inactivity
 */
export function useAutoLock() {
  const { isLocked, lock } = useAuthStore();
  const { settings } = useSettingsStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Don't set timer if auto-lock is disabled (0) or vault is already locked
    if (settings.autoLockMinutes === 0 || isLocked) {
      return;
    }

    const timeout = settings.autoLockMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      lock();
    }, timeout);
  }, [settings.autoLockMinutes, isLocked, lock]);

  useEffect(() => {
    // Activity events to track
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer]);

  // Handle visibility change (lock when tab/window becomes hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && settings.autoLockMinutes > 0) {
        // Start a shorter timer when hidden
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        // Lock after 1 minute of being hidden
        timeoutRef.current = setTimeout(() => {
          lock();
        }, 60 * 1000);
      } else if (!document.hidden) {
        resetTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings.autoLockMinutes, lock, resetTimer]);

  return {
    resetTimer,
    lastActivity: lastActivityRef.current,
  };
}

/**
 * Hook to listen for system sleep/wake events
 * This requires platform-specific handling via Tauri
 */
export function useSystemSleepLock() {
  const { lock } = useAuthStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    // Listen for Tauri system events
    let unlisten: (() => void) | undefined;

    async function setupListener() {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        
        // Listen for system resume event
        unlisten = await listen('system-resume', () => {
          if (settings.autoLockMinutes > 0) {
            lock();
          }
        }) as unknown as () => void;
      } catch (err) {
        console.error('Failed to set up system sleep listener:', err);
      }
    }

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [lock, settings.autoLockMinutes]);
}




