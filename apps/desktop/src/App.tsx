import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
import { useAuthStore } from './store/auth';
import { useSettingsStore } from './store/settings';
import { useAutoLock, useSystemSleepLock, useUpdater } from './hooks';

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
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const navigate = useNavigate();

  // Enable auto-lock on idle and system sleep
  useAutoLock();
  useSystemSleepLock();

  // Auto-update functionality
  const { 
    checking: checkingUpdate, 
    available: updateAvailable, 
    downloading, 
    progress, 
    updateInfo, 
    checkForUpdates, 
    downloadAndInstall, 
    dismissUpdate 
  } = useUpdater();

  // Check for updates on app start and periodically
  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const update = await checkForUpdates();
        if (update) {
          setShowUpdateDialog(true);
        }
      } catch (e) {
        console.log('Update check skipped:', e);
      }
    };
    
    // Check on launch (after 3s delay)
    const initialTimer = setTimeout(checkUpdates, 3000);
    
    // Check periodically (every 30 minutes)
    const interval = setInterval(checkUpdates, 30 * 60 * 1000);
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

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
    <>
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

      {/* Update Dialog */}
      {showUpdateDialog && updateAvailable && updateInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Update Available</h2>
                  <p className="text-sm text-muted-foreground">Version {updateInfo.version}</p>
                </div>
              </div>
              
              {updateInfo.body && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{updateInfo.body}</p>
                </div>
              )}

              {downloading && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Downloading...</span>
                    <span className="text-foreground font-medium">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex border-t border-border">
              <button
                onClick={() => { dismissUpdate(); setShowUpdateDialog(false); }}
                disabled={downloading}
                className="flex-1 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                Later
              </button>
              <button
                onClick={downloadAndInstall}
                disabled={downloading}
                className="flex-1 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors border-l border-border disabled:opacity-50"
              >
                {downloading ? 'Installing...' : 'Update Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
