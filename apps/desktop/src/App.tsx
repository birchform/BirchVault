import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
import { useAuthStore } from './store/auth';
import { useSettingsStore } from './store/settings';
import { useAutoLock, useSystemSleepLock } from './hooks/useAutoLock';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { AppLayout } from './layouts/AppLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { UnlockPage } from './pages/auth/UnlockPage';

// App Pages
import { VaultPage } from './pages/vault/VaultPage';
import { VaultNewPage } from './pages/vault/VaultNewPage';
import { VaultEditPage } from './pages/vault/VaultEditPage';
import { VaultTrashPage } from './pages/vault/VaultTrashPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// ============================================
// Protected Route Component
// ============================================

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLocked, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isLocked && !user) {
      navigate('/login');
    } else if (!isLoading && isLocked && user) {
      navigate('/unlock');
    }
  }, [user, isLocked, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLocked || !user) {
    return null;
  }

  return <>{children}</>;
}

// ============================================
// Main App Component
// ============================================

export default function App() {
  const { checkSession, lock, isLocked } = useAuthStore();
  const { loadSettings, settings } = useSettingsStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();

  // Enable auto-lock on idle and system sleep
  useAutoLock();
  useSystemSleepLock();

  // Apply theme classes to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('theme-birch', 'theme-forest', 'theme-ocean', 'theme-midnight', 'dark');
    
    // Apply color theme
    if (settings.colorTheme && settings.colorTheme !== 'birch') {
      root.classList.add(`theme-${settings.colorTheme}`);
    }
    
    // Apply dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark);
    
    if (shouldBeDark) {
      root.classList.add('dark');
    }
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (settings.theme === 'system') {
        root.classList.toggle('dark', e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme, settings.colorTheme]);

  // Initialize app on mount
  useEffect(() => {
    async function initialize() {
      try {
        // Load settings
        await loadSettings();

        // Check for existing session
        const hasSession = await checkSession();
        
        if (!hasSession) {
          navigate('/login');
        } else if (isLocked) {
          navigate('/unlock');
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
        navigate('/login');
      } finally {
        setIsInitialized(true);
      }
    }

    initialize();
  }, []);

  // Listen for tray events
  useEffect(() => {
    const unlistenLock = listen('tray-lock', () => {
      lock();
      navigate('/unlock');
    });

    const unlistenSync = listen('tray-sync', async () => {
      // Sync will be handled by the vault page
      console.log('Sync triggered from tray');
    });

    return () => {
      unlistenLock.then((fn) => fn());
      unlistenSync.then((fn) => fn());
    };
  }, [lock, navigate]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Starting BirchVault...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unlock" element={<UnlockPage />} />
      </Route>

      {/* Protected App Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/vault" element={<VaultPage />} />
        <Route path="/vault/new" element={<VaultNewPage />} />
        <Route path="/vault/edit/:id" element={<VaultEditPage />} />
        <Route path="/vault/trash" element={<VaultTrashPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/vault" replace />} />
      <Route path="*" element={<Navigate to="/vault" replace />} />
    </Routes>
  );
}
